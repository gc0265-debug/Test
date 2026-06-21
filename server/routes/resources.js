const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { topic, tag, search } = req.query;
  let sql = 'SELECT * FROM resources WHERE 1=1';
  const params = [];

  if (topic) { sql += ' AND topic = ?'; params.push(topic); }
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
  const { title, description, topic, url, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO resources (title, description, topic, url, tags) VALUES (?, ?, ?, ?, ?)
  `).run(title, description || null, topic || null, url || null, JSON.stringify(tags || []));

  res.status(201).json(db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, topic, url, tags } = req.body;
  db.prepare(`
    UPDATE resources SET title=?, description=?, topic=?, url=?, tags=?, updated_at=unixepoch() WHERE id=?
  `).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    topic !== undefined ? topic : existing.topic,
    url !== undefined ? url : existing.url,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
