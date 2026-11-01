// Documenti: link esterno e/o file caricato dal browser. Il file viene
// salvato su disco in server/uploads (fuori da git) con un nome generato;
// il nome originale, il tipo mime e la dimensione restano in tabella per
// mostrarlo e per servirlo in download con il nome giusto.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { deltaToDocxBuffer } = require('../utils/deltaToDocx');
const { verificaVersione } = require('../utils/concorrenza');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB

router.get('/', (req, res) => {
  const { tipo, search, cartella_id } = req.query;
  let sql = `
    SELECT d.*, cm.codice AS commessa_codice
    FROM documenti d
    LEFT JOIN commesse cm ON d.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'd.commessa_id');
  if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
  if (search) { sql += ' AND (titolo LIKE ? OR note LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  // Senza "search" il filtro cartella è attivo: 'root' = fuori da ogni
  // cartella, un id = dentro quella cartella. Con "search" si ignora
  // volutamente, perché cercare per testo deve guardare tutta la commessa.
  if (!search && cartella_id !== undefined) {
    if (cartella_id === 'root' || cartella_id === '') sql += ' AND d.cartella_id IS NULL';
    else { sql += ' AND d.cartella_id = ?'; params.push(cartella_id); }
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', upload.single('file'), (req, res) => {
  const { commessa_id, titolo, tipo, url, note, cartella_id } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const file = req.file;
  const result = db.prepare(`
    INSERT INTO documenti (commessa_id, cartella_id, titolo, tipo, url, note, file_nome, file_path, file_mime, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, cartella_id || null, titolo, tipo || 'altro', url || null, note || null,
    file ? file.originalname : null, file ? file.filename : null, file ? file.mimetype : null, file ? file.size : null
  );
  res.status(201).json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', upload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'documento non trovato' });
  if (!verificaVersione(req, res, existing)) return;
  const { titolo, tipo, url, note, rimuovi_file, cartella_id } = req.body;
  const file = req.file;

  // un nuovo file caricato, o la richiesta esplicita di rimozione, elimina il vecchio file dal disco
  if ((file || rimuovi_file === '1') && existing.file_path) {
    fs.unlink(path.join(uploadDir, existing.file_path), () => {});
  }

  const next = {
    titolo: titolo ?? existing.titolo,
    tipo: tipo || existing.tipo,
    url: url !== undefined ? (url || null) : existing.url,
    note: note !== undefined ? (note || null) : existing.note,
    cartella_id: cartella_id !== undefined ? (cartella_id || null) : existing.cartella_id,
    file_nome: file ? file.originalname : (rimuovi_file === '1' ? null : existing.file_nome),
    file_path: file ? file.filename : (rimuovi_file === '1' ? null : existing.file_path),
    file_mime: file ? file.mimetype : (rimuovi_file === '1' ? null : existing.file_mime),
    file_size: file ? file.size : (rimuovi_file === '1' ? null : existing.file_size),
  };

  db.prepare(`
    UPDATE documenti SET titolo=?, tipo=?, url=?, note=?, cartella_id=?, file_nome=?, file_path=?, file_mime=?, file_size=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.titolo, next.tipo, next.url, next.note, next.cartella_id, next.file_nome, next.file_path, next.file_mime, next.file_size, req.params.id);

  res.json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id));
});

// Documenti Word scritti direttamente nell'editor in app (contenuto in
// formato Delta di Quill), invece che caricati da file esterno. Il
// risultato è un vero file .docx salvato come un documento normale — si
// scarica e si riapre nell'editor esattamente come un documento caricato,
// con in più la possibilità di modificarne il testo restando nell'app.
function nomeFileGenerato() {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.docx`;
}

router.post('/autore', async (req, res) => {
  const { commessa_id, titolo, tipo, note, delta, cartella_id } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  if (!delta || !Array.isArray(delta.ops)) return res.status(400).json({ error: 'contenuto del documento mancante o non valido' });

  try {
    const buffer = await deltaToDocxBuffer(delta);
    const fileName = nomeFileGenerato();
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    const result = db.prepare(`
      INSERT INTO documenti (commessa_id, cartella_id, titolo, tipo, note, file_nome, file_path, file_mime, file_size, contenuto_editor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      commessa_id, cartella_id || null, titolo, tipo || 'altro', note || null,
      `${titolo}.docx`, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer.length,
      JSON.stringify(delta)
    );
    res.status(201).json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: `generazione del documento Word fallita: ${err.message}` });
  }
});

router.put('/:id/autore', async (req, res) => {
  const existing = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'documento non trovato' });
  if (!verificaVersione(req, res, existing)) return;
  const { titolo, tipo, note, delta, cartella_id } = req.body;
  if (!delta || !Array.isArray(delta.ops)) return res.status(400).json({ error: 'contenuto del documento mancante o non valido' });

  try {
    const buffer = await deltaToDocxBuffer(delta);
    const fileName = nomeFileGenerato();
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    if (existing.file_path) fs.unlink(path.join(uploadDir, existing.file_path), () => {});

    const titoloFinale = titolo ?? existing.titolo;
    db.prepare(`
      UPDATE documenti SET titolo=?, tipo=?, note=?, cartella_id=?, file_nome=?, file_path=?, file_mime=?, file_size=?, contenuto_editor=?, updated_at=unixepoch()
      WHERE id=?
    `).run(
      titoloFinale, tipo || existing.tipo, note !== undefined ? (note || null) : existing.note,
      cartella_id !== undefined ? (cartella_id || null) : existing.cartella_id,
      `${titoloFinale}.docx`, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer.length,
      JSON.stringify(delta), req.params.id
    );
    res.json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: `aggiornamento del documento Word fallito: ${err.message}` });
  }
});

router.get('/:id/file', (req, res) => {
  const row = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!row || !row.file_path) return res.status(404).json({ error: 'nessun file allegato' });
  const filePath = path.join(uploadDir, row.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file non trovato sul server' });
  res.download(filePath, row.file_nome || row.file_path);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'documento non trovato' });
  if (existing.file_path) fs.unlink(path.join(uploadDir, existing.file_path), () => {});
  db.prepare('DELETE FROM documenti WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
