const express = require('express');
const db = require('../db/database');
const { archiveItem } = require('../services/archiveService');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, tag, search } = req.query;
  let sql = 'SELECT * FROM cantieri WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR address LIKE ? OR client LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { title, address, client, status, start_date, end_date, budget, notes, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO cantieri (title, address, client, status, start_date, end_date, budget, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    address || null,
    client || null,
    status || 'active',
    start_date || null,
    end_date || null,
    budget || null,
    notes || null,
    JSON.stringify(tags || [])
  );

  res.status(201).json(db.prepare('SELECT * FROM cantieri WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, address, client, status, start_date, end_date, budget, notes, tags } = req.body;

  if (status === 'completed') {
    archiveItem('cantiere', Number(req.params.id));
    return res.json({ archived: true });
  }

  db.prepare(`
    UPDATE cantieri
    SET title=?, address=?, client=?, status=?, start_date=?, end_date=?, budget=?, notes=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    title ?? existing.title,
    address !== undefined ? address : existing.address,
    client !== undefined ? client : existing.client,
    status ?? existing.status,
    start_date !== undefined ? start_date : existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    budget !== undefined ? budget : existing.budget,
    notes !== undefined ? notes : existing.notes,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cantieri WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/complete', (req, res) => {
  archiveItem('cantiere', Number(req.params.id));
  res.json({ archived: true });
});

module.exports = router;
