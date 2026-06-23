const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { type, cantiere_id, tag, search } = req.query;
  let sql = `
    SELECT d.*, c.title as cantiere_name
    FROM documenti d
    LEFT JOIN cantieri c ON d.cantiere_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (type) { sql += ' AND d.type = ?'; params.push(type); }
  if (cantiere_id) { sql += ' AND d.cantiere_id = ?'; params.push(cantiere_id); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(d.tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (d.title LIKE ? OR d.notes LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY d.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { title, type, cantiere_id, url, notes, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO documenti (title, type, cantiere_id, url, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title,
    type || 'altro',
    cantiere_id || null,
    url || null,
    notes || null,
    JSON.stringify(tags || [])
  );

  res.status(201).json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, type, cantiere_id, url, notes, tags } = req.body;
  db.prepare(`
    UPDATE documenti
    SET title=?, type=?, cantiere_id=?, url=?, notes=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    title ?? existing.title,
    type ?? existing.type,
    cantiere_id !== undefined ? cantiere_id : existing.cantiere_id,
    url !== undefined ? url : existing.url,
    notes !== undefined ? notes : existing.notes,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM documenti WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM documenti WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
