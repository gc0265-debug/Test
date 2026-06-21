const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { tag, search } = req.query;
  let sql = 'SELECT * FROM areas WHERE 1=1';
  const params = [];

  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { title, description, responsibility, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO areas (title, description, responsibility, tags) VALUES (?, ?, ?, ?)
  `).run(title, description || null, responsibility || null, JSON.stringify(tags || []));

  res.status(201).json(db.prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, responsibility, tags } = req.body;
  db.prepare(`
    UPDATE areas SET title=?, description=?, responsibility=?, tags=?, updated_at=unixepoch() WHERE id=?
  `).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    responsibility !== undefined ? responsibility : existing.responsibility,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM areas WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
