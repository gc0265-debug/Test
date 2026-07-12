const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { cantiere_id } = req.query;
  let sql = `
    SELECT wp.*, c.title as cantiere_name,
      (SELECT COUNT(*) FROM lavorazioni l WHERE l.wp_id = wp.id) as lavorazioni_count
    FROM work_packages wp
    LEFT JOIN cantieri c ON wp.cantiere_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (cantiere_id) { sql += ' AND wp.cantiere_id = ?'; params.push(cantiere_id); }
  sql += ' ORDER BY wp.created_at DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post('/', (req, res) => {
  const { cantiere_id, title, description, status, start_date, end_date, notes } = req.body;
  if (!cantiere_id || !title) return res.status(400).json({ error: 'cantiere_id e title sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO work_packages (cantiere_id, title, description, status, start_date, end_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cantiere_id, title, description || null, status || 'attivo', start_date || null, end_date || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM work_packages WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM work_packages WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM work_packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { cantiere_id, title, description, status, start_date, end_date, notes } = req.body;
  db.prepare(`
    UPDATE work_packages
    SET cantiere_id=?, title=?, description=?, status=?, start_date=?, end_date=?, notes=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    cantiere_id ?? existing.cantiere_id,
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    status ?? existing.status,
    start_date !== undefined ? start_date : existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM work_packages WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM work_packages WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
