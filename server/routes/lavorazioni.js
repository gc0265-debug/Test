const express = require('express');
const db = require('../db/database');
const { archiveItem } = require('../services/archiveService');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, cantiere_id, priority, tag, search } = req.query;
  let sql = `
    SELECT l.*, c.title as cantiere_name
    FROM lavorazioni l
    LEFT JOIN cantieri c ON l.cantiere_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { sql += ' AND l.status = ?'; params.push(status); }
  if (cantiere_id) { sql += ' AND l.cantiere_id = ?'; params.push(cantiere_id); }
  if (priority) { sql += ' AND l.priority = ?'; params.push(priority); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(l.tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.impresa LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY l.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { title, description, cantiere_id, status, priority, deadline, impresa, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO lavorazioni (title, description, cantiere_id, status, priority, deadline, impresa, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    cantiere_id || null,
    status || 'da-fare',
    priority || 'media',
    deadline || null,
    impresa || null,
    JSON.stringify(tags || [])
  );

  res.status(201).json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, cantiere_id, status, priority, deadline, impresa, tags } = req.body;

  if (status === 'completata') {
    archiveItem('lavorazione', Number(req.params.id));
    return res.json({ archived: true });
  }

  db.prepare(`
    UPDATE lavorazioni
    SET title=?, description=?, cantiere_id=?, status=?, priority=?, deadline=?, impresa=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    cantiere_id !== undefined ? cantiere_id : existing.cantiere_id,
    status ?? existing.status,
    priority ?? existing.priority,
    deadline !== undefined ? deadline : existing.deadline,
    impresa !== undefined ? impresa : existing.impresa,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/complete', (req, res) => {
  archiveItem('lavorazione', Number(req.params.id));
  res.json({ archived: true });
});

module.exports = router;
