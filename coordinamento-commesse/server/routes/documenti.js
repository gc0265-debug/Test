const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { commessa_id, tipo, search } = req.query;
  let sql = 'SELECT * FROM documenti WHERE 1=1';
  const params = [];
  if (commessa_id) { sql += ' AND commessa_id = ?'; params.push(commessa_id); }
  if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
  if (search) { sql += ' AND (titolo LIKE ? OR note LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, titolo, tipo, url, note } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO documenti (commessa_id, titolo, tipo, url, note) VALUES (?, ?, ?, ?, ?)
  `).run(commessa_id, titolo, tipo || 'altro', url || null, note || null);
  res.status(201).json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'documento non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare('UPDATE documenti SET titolo=?, tipo=?, url=?, note=?, updated_at=unixepoch() WHERE id=?')
    .run(next.titolo, next.tipo || 'altro', next.url || null, next.note || null, req.params.id);
  res.json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM documenti WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'documento non trovato' });
  res.status(204).end();
});

module.exports = router;
