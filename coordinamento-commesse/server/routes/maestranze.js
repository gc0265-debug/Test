const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { commessa_id, stato, search } = req.query;
  let sql = 'SELECT * FROM maestranze WHERE 1=1';
  const params = [];
  if (commessa_id) { sql += ' AND commessa_id = ?'; params.push(commessa_id); }
  if (stato) { sql += ' AND stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (nome LIKE ? OR azienda LIKE ? OR ruolo LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY nome ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, ruolo, azienda, telefono, stato, qualifiche } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO maestranze (commessa_id, nome, ruolo, azienda, telefono, stato, qualifiche)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, nome, ruolo || null, azienda || null, telefono || null, stato || 'attivo', qualifiche || null);
  res.status(201).json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'maestranza non trovata' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE maestranze SET nome=?, ruolo=?, azienda=?, telefono=?, stato=?, qualifiche=?, updated_at=unixepoch() WHERE id=?
  `).run(next.nome, next.ruolo || null, next.azienda || null, next.telefono || null, next.stato, next.qualifiche || null, req.params.id);
  res.json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM maestranze WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'maestranza non trovata' });
  res.status(204).end();
});

module.exports = router;
