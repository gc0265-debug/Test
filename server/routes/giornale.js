const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { cantiere_id, date_from, date_to, tag, search } = req.query;
  let sql = `
    SELECT g.*, c.title as cantiere_name
    FROM giornale g
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (cantiere_id) { sql += ' AND g.cantiere_id = ?'; params.push(cantiere_id); }
  if (date_from) { sql += ' AND g.date >= ?'; params.push(date_from); }
  if (date_to) { sql += ' AND g.date <= ?'; params.push(date_to); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(g.tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (g.activities LIKE ? OR g.issues LIKE ? OR g.notes LIKE ? OR c.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY g.date DESC, g.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { cantiere_id, date, weather, workers_count, activities, issues, notes, tags } = req.body;
  if (!cantiere_id) return res.status(400).json({ error: 'cantiere_id is required' });

  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO giornale (cantiere_id, date, weather, workers_count, activities, issues, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cantiere_id,
    date || today,
    weather || 'sereno',
    workers_count ?? 0,
    activities || null,
    issues || null,
    notes || null,
    JSON.stringify(tags || [])
  );

  res.status(201).json(db.prepare('SELECT * FROM giornale WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM giornale WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM giornale WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { cantiere_id, date, weather, workers_count, activities, issues, notes, tags } = req.body;

  db.prepare(`
    UPDATE giornale
    SET cantiere_id=?, date=?, weather=?, workers_count=?, activities=?, issues=?, notes=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    cantiere_id !== undefined ? cantiere_id : existing.cantiere_id,
    date ?? existing.date,
    weather ?? existing.weather,
    workers_count !== undefined ? workers_count : existing.workers_count,
    activities !== undefined ? activities : existing.activities,
    issues !== undefined ? issues : existing.issues,
    notes !== undefined ? notes : existing.notes,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM giornale WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM giornale WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
