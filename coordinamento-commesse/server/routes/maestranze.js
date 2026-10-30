const express = require('express');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

router.get('/', (req, res) => {
  const { stato, search } = req.query;
  let sql = `
    SELECT m.*, w.codice AS wp_codice, w.nome AS wp_nome, cm.codice AS commessa_codice,
           (SELECT GROUP_CONCAT(s.nome, ', ') FROM maestranze_fornitori mf
            JOIN stakeholder s ON mf.stakeholder_id = s.id WHERE mf.maestranza_id = m.id) AS fornitori_nomi
    FROM maestranze m
    LEFT JOIN work_packages w ON m.wp_id = w.id
    LEFT JOIN commesse cm ON m.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'm.commessa_id');
  if (stato) { sql += ' AND m.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (m.nome LIKE ? OR m.azienda LIKE ? OR m.ruolo LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY m.nome ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, ruolo, azienda, telefono, wp_id, stato, qualifiche } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO maestranze (commessa_id, nome, ruolo, azienda, telefono, wp_id, stato, qualifiche)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, nome, ruolo || null, azienda || null, telefono || null, wp_id || null, stato || 'attivo', qualifiche || null);
  res.status(201).json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'maestranza non trovata' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE maestranze SET nome=?, ruolo=?, azienda=?, telefono=?, wp_id=?, stato=?, qualifiche=?, updated_at=unixepoch() WHERE id=?
  `).run(next.nome, next.ruolo || null, next.azienda || null, next.telefono || null, next.wp_id || null, next.stato, next.qualifiche || null, req.params.id);
  res.json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM maestranze WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'maestranza non trovata' });
  res.status(204).end();
});

// ---- fornitori collegati (scelti dal Registro Stakeholder) ----
router.get('/:id/fornitori', (req, res) => {
  const rows = db.prepare('SELECT stakeholder_id FROM maestranze_fornitori WHERE maestranza_id = ?').all(req.params.id);
  res.json({ data: rows.map((r) => r.stakeholder_id) });
});

// Sostituisce in blocco i fornitori collegati. Body: { stakeholder_ids: [...] }
router.put('/:id/fornitori', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'maestranza non trovata' });
  const ids = Array.isArray(req.body.stakeholder_ids) ? req.body.stakeholder_ids : [];

  const salva = db.transaction(() => {
    db.prepare('DELETE FROM maestranze_fornitori WHERE maestranza_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO maestranze_fornitori (maestranza_id, stakeholder_id) VALUES (?, ?)');
    ids.forEach((sid) => insert.run(req.params.id, sid));
  });
  salva();
  res.json({ data: ids });
});

module.exports = router;
