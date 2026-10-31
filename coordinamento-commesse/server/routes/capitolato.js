// Capitolato — scrittura in stile tabella con codici WBS, a monte dei
// Requisiti di progetto. Una voce di capitolato può collegarsi a più
// requisiti (tramite requisiti.rif_capitolato_voce_id); qui esponiamo
// anche il conteggio dei requisiti collegati per ciascuna voce.

const express = require('express');
const db = require('../db/database');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

const TRACKED = [
  { key: 'codice_wbs', label: 'Codice WBS' },
  { key: 'titolo', label: 'Titolo' },
  { key: 'data', label: 'Data' },
];

router.get('/', (req, res) => {
  let sql = `
    SELECT c.*, (SELECT COUNT(*) FROM requisiti r WHERE r.rif_capitolato_voce_id = c.id) AS n_requisiti,
           ct.titolo AS contratto_titolo, ct.controparte AS contratto_controparte, cm.codice AS commessa_codice
    FROM capitolato_voci c
    LEFT JOIN contratti ct ON c.contratto_id = ct.id
    LEFT JOIN commesse cm ON c.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'c.commessa_id');
  if (req.query.contratto_id) { sql += ' AND c.contratto_id = ?'; params.push(req.query.contratto_id); }
  sql += ' ORDER BY c.codice_wbs ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/', (req, res) => {
  const { commessa_id, codice_wbs, titolo, data, contratto_id, descrizione, note } = req.body;
  if (!commessa_id || !codice_wbs || !titolo) {
    return res.status(400).json({ error: 'commessa_id, codice_wbs e titolo sono obbligatori' });
  }
  const result = db.prepare(`
    INSERT INTO capitolato_voci (commessa_id, codice_wbs, titolo, data, contratto_id, descrizione, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, codice_wbs, titolo, data || null, contratto_id || null, descrizione || null, note || null);
  const row = db.prepare('SELECT * FROM capitolato_voci WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'capitolato_voci', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${codice_wbs} — ${titolo}` });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM capitolato_voci WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'voce di capitolato non trovata' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE capitolato_voci SET codice_wbs=?, titolo=?, data=?, contratto_id=?, descrizione=?, note=?, updated_at=unixepoch() WHERE id=?
  `).run(next.codice_wbs, next.titolo, next.data || null, next.contratto_id || null, next.descrizione || null, next.note || null, req.params.id);
  const row = db.prepare('SELECT * FROM capitolato_voci WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'capitolato_voci', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: dettaglio || 'aggiornata' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM capitolato_voci WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'voce di capitolato non trovata' });
  db.prepare('DELETE FROM capitolato_voci WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'capitolato_voci', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `${existing.codice_wbs} — ${existing.titolo}` });
  res.status(204).end();
});

module.exports = router;
