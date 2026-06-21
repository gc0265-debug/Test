const express = require('express');
const db = require('../db/database');
const { restoreItem } = require('../services/archiveService');

const router = express.Router();

router.get('/', (req, res) => {
  const { original_type, tag, search } = req.query;
  let sql = 'SELECT * FROM archives WHERE 1=1';
  const params = [];

  if (original_type) { sql += ' AND original_type = ?'; params.push(original_type); }
  if (tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)';
    params.push(tag);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY archived_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM archives WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM archives WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/restore', (req, res) => {
  const newId = restoreItem(Number(req.params.id));
  res.json({ restored: true, newId });
});

module.exports = router;
