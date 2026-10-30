// Piano Comunicazioni: un processo di gestione per riga, con una
// matrice RACI verso gli stakeholder della commessa. Le assegnazioni si
// salvano in blocco (PUT) per processo, non riga per riga.

const express = require('express');
const db = require('../db/database');
const { logAudit } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

router.get('/processi', (req, res) => {
  let sql = `
    SELECT p.*, cm.codice AS commessa_codice
    FROM processi_comunicazione p
    LEFT JOIN commesse cm ON p.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'p.commessa_id');
  sql += ' ORDER BY nome ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/processi', (req, res) => {
  const { commessa_id, nome, scopo, frequenza, canale, output, ruolo_responsabile, note } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO processi_comunicazione (commessa_id, nome, scopo, frequenza, canale, output, ruolo_responsabile, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, nome, scopo || null, frequenza || 'settimanale', canale || null, output || null, ruolo_responsabile || null, note || null);
  const row = db.prepare('SELECT * FROM processi_comunicazione WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'processi_comunicazione', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: nome });
  res.status(201).json(row);
});

router.put('/processi/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM processi_comunicazione WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'processo non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE processi_comunicazione SET nome=?, scopo=?, frequenza=?, canale=?, output=?, ruolo_responsabile=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.nome, next.scopo || null, next.frequenza, next.canale || null, next.output || null, next.ruolo_responsabile || null, next.note || null, req.params.id);
  const row = db.prepare('SELECT * FROM processi_comunicazione WHERE id = ?').get(req.params.id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'processi_comunicazione', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: 'aggiornato' });
  res.json(row);
});

router.delete('/processi/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM processi_comunicazione WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'processo non trovato' });
  db.prepare('DELETE FROM processi_comunicazione WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'processi_comunicazione', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.nome });
  res.status(204).end();
});

router.get('/processi/:id/raci', (req, res) => {
  const rows = db.prepare(`
    SELECT ra.*, s.nome AS stakeholder_nome, s.categoria AS stakeholder_categoria
    FROM raci_assegnazioni ra
    JOIN stakeholder s ON ra.stakeholder_id = s.id
    WHERE ra.processo_id = ?
  `).all(req.params.id);
  res.json({ data: rows });
});

// Sostituisce in blocco le assegnazioni RACI di un processo.
// Body: { assegnazioni: [{ stakeholder_id, ruolo }] } — ruolo null/assente rimuove lo stakeholder dalla matrice.
router.put('/processi/:id/raci', (req, res) => {
  const processo = db.prepare('SELECT * FROM processi_comunicazione WHERE id = ?').get(req.params.id);
  if (!processo) return res.status(404).json({ error: 'processo non trovato' });
  const assegnazioni = Array.isArray(req.body.assegnazioni) ? req.body.assegnazioni : [];
  const valide = assegnazioni.filter((a) => ['R', 'A', 'C', 'I'].includes(a.ruolo));

  const salva = db.transaction(() => {
    db.prepare('DELETE FROM raci_assegnazioni WHERE processo_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO raci_assegnazioni (processo_id, stakeholder_id, ruolo) VALUES (?, ?, ?)');
    valide.forEach((a) => insert.run(req.params.id, a.stakeholder_id, a.ruolo));
  });
  salva();

  const rows = db.prepare(`
    SELECT ra.*, s.nome AS stakeholder_nome FROM raci_assegnazioni ra
    JOIN stakeholder s ON ra.stakeholder_id = s.id WHERE ra.processo_id = ?
  `).all(req.params.id);
  res.json({ data: rows });
});

module.exports = router;
