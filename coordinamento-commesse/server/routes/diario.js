const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

router.get('/', (req, res) => {
  let sql = `
    SELECT d.*, cm.codice AS commessa_codice
    FROM diario d
    LEFT JOIN commesse cm ON d.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'd.commessa_id');
  sql += ' ORDER BY data DESC, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, data, squadre, attivita, eventi, criticita_testo } = req.body;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id è obbligatorio' });
  const result = db.prepare(`
    INSERT INTO diario (commessa_id, data, squadre, attivita, eventi, criticita_testo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(commessa_id, data || todayStr(), squadre || null, attivita || null, eventi || null, criticita_testo || null);
  res.status(201).json(db.prepare('SELECT * FROM diario WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM diario WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'voce di diario non trovata' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE diario SET data=?, squadre=?, attivita=?, eventi=?, criticita_testo=?, updated_at=unixepoch() WHERE id=?
  `).run(next.data, next.squadre || null, next.attivita || null, next.eventi || null, next.criticita_testo || null, req.params.id);
  res.json(db.prepare('SELECT * FROM diario WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM diario WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'voce di diario non trovata' });
  res.status(204).end();
});

module.exports = router;
