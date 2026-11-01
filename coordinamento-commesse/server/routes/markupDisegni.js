// Markup sui disegni (PDF o immagine) caricati in Documenti: sessioni
// storicizzate di forme vettoriali (vedi schema.sql) più l'esportazione in
// un vero PDF con i markup incorporati, da scaricare o condividere con chi
// non ha l'app. L'esportazione non ridisegna nulla lato server: riceve le
// pagine già composte (disegno + markup) come immagine dal browser, che è
// l'unico posto dove la stessa logica di disegno serve comunque a
// mostrare l'editor — niente doppia implementazione delle forme.

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const db = require('../db/database');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');

function documentoEsistente(id) {
  return db.prepare('SELECT * FROM documenti WHERE id = ?').get(id);
}

router.get('/:id/markup', (req, res) => {
  if (!documentoEsistente(req.params.id)) return res.status(404).json({ error: 'documento non trovato' });
  const { pagina } = req.query;
  let sql = 'SELECT id, documento_id, pagina, autore_nome, titolo, created_at FROM markup_disegni WHERE documento_id = ?';
  const params = [req.params.id];
  if (pagina) { sql += ' AND pagina = ?'; params.push(pagina); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id/markup/:markupId', (req, res) => {
  const row = db.prepare('SELECT * FROM markup_disegni WHERE id = ? AND documento_id = ?').get(req.params.markupId, req.params.id);
  if (!row) return res.status(404).json({ error: 'sessione di markup non trovata' });
  res.json({ ...row, shapes: JSON.parse(row.shapes) });
});

router.post('/:id/markup', (req, res) => {
  const doc = documentoEsistente(req.params.id);
  if (!doc) return res.status(404).json({ error: 'documento non trovato' });
  const { pagina, titolo, shapes } = req.body;
  if (!Array.isArray(shapes)) return res.status(400).json({ error: 'elenco forme mancante o non valido' });
  const result = db.prepare(`
    INSERT INTO markup_disegni (documento_id, pagina, autore_id, autore_nome, titolo, shapes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, Number(pagina) || 1, req.user.id, req.user.nome, titolo || null, JSON.stringify(shapes));
  res.status(201).json(db.prepare('SELECT id, documento_id, pagina, autore_nome, titolo, created_at FROM markup_disegni WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id/markup/:markupId', (req, res) => {
  const result = db.prepare('DELETE FROM markup_disegni WHERE id = ? AND documento_id = ?').run(req.params.markupId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'sessione di markup non trovata' });
  res.status(204).end();
});

// Riceve una pagina PNG (disegno + markup già composti dal browser) per
// ogni pagina del documento, e ne ricava un nuovo PDF, salvato come nuovo
// Documento nella stessa cartella dell'originale. "scala" è il rapporto
// pixel/punto usato per renderizzare quella pagina lato client: serve a
// restituire al PDF le stesse dimensioni fisiche dell'elaborato originale
// invece di una pagina enorme (o minuscola) in punti PDF.
router.post('/:id/markup/esporta', async (req, res) => {
  const doc = documentoEsistente(req.params.id);
  if (!doc) return res.status(404).json({ error: 'documento non trovato' });
  const { pagine } = req.body;
  if (!Array.isArray(pagine) || !pagine.length) {
    return res.status(400).json({ error: 'nessuna pagina da esportare' });
  }

  try {
    const pdfDoc = await PDFDocument.create();
    for (const p of pagine) {
      const match = /^data:image\/png;base64,(.+)$/.exec(p.immagine || '');
      if (!match) return res.status(400).json({ error: `immagine mancante o non valida per la pagina ${p.pagina}` });
      const bytes = Buffer.from(match[1], 'base64');
      const png = await pdfDoc.embedPng(bytes);
      const scala = Number(p.scala) > 0 ? Number(p.scala) : 1;
      const larghezza = png.width / scala;
      const altezza = png.height / scala;
      const page = pdfDoc.addPage([larghezza, altezza]);
      page.drawImage(png, { x: 0, y: 0, width: larghezza, height: altezza });
    }
    const pdfBytes = await pdfDoc.save();

    const dataLabel = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const titoloNuovo = `${doc.titolo} — markup ${dataLabel}`;
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`;
    fs.writeFileSync(path.join(uploadDir, fileName), pdfBytes);

    const result = db.prepare(`
      INSERT INTO documenti (commessa_id, cartella_id, titolo, tipo, note, file_nome, file_path, file_mime, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.commessa_id, doc.cartella_id, titoloNuovo, doc.tipo,
      `Esportazione con markup del documento "${doc.titolo}".`,
      `${titoloNuovo}.pdf`, fileName, 'application/pdf', pdfBytes.length
    );
    res.status(201).json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: `esportazione del PDF con markup fallita: ${err.message}` });
  }
});

module.exports = router;
