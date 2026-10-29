// Approvazioni Drawings — elenco elaborati/deliverable sottoposti a
// DL/GC per approvazione. Compilabile a mano o importando un file Excel
// con intestazioni Codice, Titolo, Revisione, Data invio, Data
// approvazione, Stato, WP, Note (l'ordine delle colonne non conta, i nomi
// sì, case-insensitive). Ogni riga può agganciarsi a un Requisito del
// Capitolato Requisiti, restando così collegata agli altri registri di
// Coordinamento e Contratti.

const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { logAudit } = require('../utils/audit');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const STATI_VALIDI = ['in-attesa', 'approvato', 'approvato-con-riserve', 'rigettato'];
function normalizzaStato(v) {
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '-');
  return STATI_VALIDI.includes(s) ? s : 'in-attesa';
}
function excelDateToISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const eu = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

router.get('/', (req, res) => {
  const { commessa_id, wp_id, stato, search } = req.query;
  let sql = `
    SELECT a.*, w.codice AS wp_codice, w.nome AS wp_nome,
           r.codice_wbs AS requisito_wbs, r.titolo AS requisito_titolo
    FROM approvazioni_drawings a
    LEFT JOIN work_packages w ON a.wp_id = w.id
    LEFT JOIN requisiti r ON a.rif_requisito_id = r.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND a.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND a.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND a.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (a.codice LIKE ? OR a.titolo LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY a.codice ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, rif_requisito_id, note } = req.body;
  if (!commessa_id || !codice || !titolo) return res.status(400).json({ error: 'commessa_id, codice e titolo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO approvazioni_drawings (commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, rif_requisito_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, codice, titolo, revisione || null, data_invio || null, data_approvazione || null, stato || 'in-attesa', rif_requisito_id || null, note || null);
  const row = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'approvazioni_drawings', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${codice} — ${titolo}` });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'elaborato non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE approvazioni_drawings
    SET wp_id=?, codice=?, titolo=?, revisione=?, data_invio=?, data_approvazione=?, stato=?, rif_requisito_id=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.codice, next.titolo, next.revisione || null, next.data_invio || null,
    next.data_approvazione || null, next.stato, next.rif_requisito_id || null, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'approvazioni_drawings', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: `${row.codice} — ${row.titolo}` });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  const result = db.prepare('DELETE FROM approvazioni_drawings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'elaborato non trovato' });
  if (existing) {
    logAudit({ commessa_id: existing.commessa_id, entity_type: 'approvazioni_drawings', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `${existing.codice} — ${existing.titolo}` });
  }
  res.status(204).end();
});

// Import da elenco deliverable in Excel: riga 1 = intestazioni (qualsiasi
// ordine, case-insensitive), dalla riga 2 in poi un elaborato per riga.
router.post('/import', upload.single('file'), async (req, res) => {
  const { commessa_id } = req.body;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'file Excel non leggibile' });
  }
  const sheet = wb.worksheets[0];
  if (!sheet) return res.status(400).json({ error: 'il file non contiene fogli' });

  const colIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    colIndex[String(cell.value || '').trim().toLowerCase()] = colNumber;
  });
  const get = (row, ...names) => {
    for (const n of names) {
      const idx = colIndex[n];
      if (idx) {
        const v = row.getCell(idx).value;
        if (v !== null && v !== undefined && v !== '') return v;
      }
    }
    return null;
  };

  const wpByCodice = new Map(
    db.prepare('SELECT id, codice FROM work_packages WHERE commessa_id = ?').all(commessa_id)
      .map((w) => [w.codice.toLowerCase(), w.id])
  );

  const insert = db.prepare(`
    INSERT INTO approvazioni_drawings (commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let imported = 0;
  let skipped = 0;
  db.transaction(() => {
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const codice = get(row, 'codice', 'drawing', 'numero', 'elaborato');
      const titolo = get(row, 'titolo', 'descrizione', 'nome');
      if (!codice || !titolo) { skipped++; continue; }
      const wpCodice = get(row, 'wp', 'work package');
      const wpId = wpCodice ? (wpByCodice.get(String(wpCodice).trim().toLowerCase()) || null) : null;
      const revisione = get(row, 'revisione', 'rev');
      const note = get(row, 'note');
      insert.run(
        commessa_id, wpId, String(codice).trim(), String(titolo).trim(),
        revisione ? String(revisione).trim() : null,
        excelDateToISO(get(row, 'data invio', 'invio')),
        excelDateToISO(get(row, 'data approvazione', 'approvazione')),
        normalizzaStato(get(row, 'stato')),
        note ? String(note).trim() : null,
      );
      imported++;
    }
  })();

  res.status(201).json({ imported, skipped });
});

module.exports = router;
