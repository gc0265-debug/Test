const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { commessa_id, wp_id, stato, priorita, search } = req.query;
  let sql = `
    SELECT l.*, w.codice AS wp_codice, w.nome AS wp_nome
    FROM lavorazioni l LEFT JOIN work_packages w ON l.wp_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND l.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND l.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND l.stato = ?'; params.push(stato); }
  if (priorita) { sql += ' AND l.priorita = ?'; params.push(priorita); }
  if (search) { sql += ' AND (l.titolo LIKE ? OR l.descrizione LIKE ? OR l.impresa LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY l.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, titolo, descrizione, stato, priorita, scadenza, impresa } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO lavorazioni (commessa_id, wp_id, titolo, descrizione, stato, priorita, scadenza, impresa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, titolo, descrizione || null, stato || 'da-fare', priorita || 'media', scadenza || null, impresa || null);
  res.status(201).json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'lavorazione non trovata' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE lavorazioni SET wp_id=?, titolo=?, descrizione=?, stato=?, priorita=?, scadenza=?, impresa=?, updated_at=unixepoch() WHERE id=?
  `).run(next.wp_id || null, next.titolo, next.descrizione || null, next.stato, next.priorita, next.scadenza || null, next.impresa || null, req.params.id);
  res.json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'lavorazione non trovata' });
  res.status(204).end();
});

module.exports = router;
