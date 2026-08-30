const express = require('express');
const db = require('../db/database');
const { oggi } = require('../services/tempo');

const router = express.Router();

router.get('/', (req, res) => {
  const { cantiere_id, date_from, date_to, tag, search } = req.query;
  let sql = `
    SELECT g.*, c.title as cantiere_name,
      (SELECT COUNT(*) FROM presenze p WHERE p.giornale_id = g.id) as n_presenze,
      (SELECT COUNT(*) FROM nc_riferimenti nc WHERE nc.giornale_id = g.id) as n_nc,
      (SELECT COUNT(*) FROM spese s WHERE s.giornale_id = g.id) as n_spese,
      (SELECT COUNT(*) FROM materiali m WHERE m.giornale_id = g.id) as n_materiali,
      (SELECT COALESCE(SUM(s2.importo),0) FROM spese s2 WHERE s2.giornale_id = g.id) as totale_spese
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
    sql += ' AND (g.activities LIKE ? OR g.notes LIKE ? OR c.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY g.date DESC, g.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { cantiere_id, date, weather, activities, notes, tags } = req.body;
  if (!cantiere_id) return res.status(400).json({ error: 'cantiere_id is required' });

  const today = oggi();
  const result = db.prepare(`
    INSERT INTO giornale (cantiere_id, date, weather, activities, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    cantiere_id,
    date || today,
    weather || 'sereno',
    activities || null,
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

  const { cantiere_id, date, weather, activities, notes, tags } = req.body;

  db.prepare(`
    UPDATE giornale
    SET cantiere_id=?, date=?, weather=?, activities=?, notes=?, tags=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    cantiere_id !== undefined ? cantiere_id : existing.cantiere_id,
    date ?? existing.date,
    weather ?? existing.weather,
    activities !== undefined ? activities : existing.activities,
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
