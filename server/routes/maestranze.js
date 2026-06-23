const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, tag, search } = req.query;
  let sql = 'SELECT * FROM maestranze WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR role LIKE ? OR company LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { title, role, company, phone, status, qualifications, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO maestranze (title, role, company, phone, status, qualifications, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    role || null,
    company || null,
    phone || null,
    status || 'attivo',
    qualifications || null,
    JSON.stringify(tags || [])
  );

  res.status(201).json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, role, company, phone, status, qualifications, tags } = req.body;
  db.prepare(`
    UPDATE maestranze
    SET title=?, role=?, company=?, phone=?, status=?, qualifications=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    title ?? existing.title,
    role !== undefined ? role : existing.role,
    company !== undefined ? company : existing.company,
    phone !== undefined ? phone : existing.phone,
    status ?? existing.status,
    qualifications !== undefined ? qualifications : existing.qualifications,
    tags ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM maestranze WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
