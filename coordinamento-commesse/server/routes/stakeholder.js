const express = require('express');
const db = require('../db/database');
const { logAudit } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

router.get('/', (req, res) => {
  const { categoria, stato } = req.query;
  let sql = `
    SELECT s.*, cm.codice AS commessa_codice
    FROM stakeholder s
    LEFT JOIN commesse cm ON s.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 's.commessa_id');
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  if (stato) { sql += ' AND stato = ?'; params.push(stato); }
  sql += ' ORDER BY nome ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, organizzazione, ruolo, categoria, interesse, influenza, email, telefono, stato, note } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO stakeholder (commessa_id, nome, organizzazione, ruolo, categoria, interesse, influenza, email, telefono, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, nome, organizzazione || null, ruolo || null, categoria || 'interno',
    interesse || 'medio', influenza || 'media', email || null, telefono || null, stato || 'attivo', note || null
  );
  const row = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'stakeholder', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: nome });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'stakeholder non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE stakeholder SET nome=?, organizzazione=?, ruolo=?, categoria=?, interesse=?, influenza=?, email=?, telefono=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.nome, next.organizzazione || null, next.ruolo || null, next.categoria, next.interesse, next.influenza,
    next.email || null, next.telefono || null, next.stato, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'stakeholder', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: 'aggiornato' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'stakeholder non trovato' });
  db.prepare('DELETE FROM stakeholder WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'stakeholder', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.nome });
  res.status(204).end();
});

module.exports = router;
