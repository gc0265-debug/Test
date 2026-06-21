const express = require('express');
const db = require('../db/database');
const { archiveItem } = require('../services/archiveService');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, area_id, tag, search } = req.query;
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (area_id) { sql += ' AND area_id = ?'; params.push(area_id); }
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
  const { title, description, goal, deadline, status, area_id, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO projects (title, description, goal, deadline, status, area_id, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    goal || null,
    deadline || null,
    status || 'active',
    area_id || null,
    JSON.stringify(tags || [])
  );

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, goal, deadline, status, area_id, tags } = req.body;

  if (status === 'completed') {
    archiveItem('project', Number(req.params.id));
    return res.json({ archived: true });
  }

  db.prepare(`
    UPDATE projects SET title=?, description=?, goal=?, deadline=?, status=?, area_id=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    goal !== undefined ? goal : existing.goal,
    deadline !== undefined ? deadline : existing.deadline,
    status ?? existing.status,
    area_id !== undefined ? area_id : existing.area_id,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/complete', (req, res) => {
  archiveItem('project', Number(req.params.id));
  res.json({ archived: true });
});

module.exports = router;
