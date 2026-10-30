// Registro Allert: classificazione di perimetro e azioni di tutela
// (funzione di presidio GC), collegabile a una criticità o decisione.
// Distinto dal coordinamento operativo dei registri precedenti, ma
// agganciabile ad essi tramite rif_criticita_id / rif_decisione_id.

const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

const TRACKED = [
  { key: 'classificazione', label: 'Classificazione' },
  { key: 'perimetro', label: 'Perimetro' },
  { key: 'stato', label: 'Stato' },
  { key: 'azione_tutela', label: 'Azione di tutela' },
];

router.get('/', (req, res) => {
  const { wp_id, stato, perimetro, classificazione } = req.query;
  let sql = `
    SELECT a.*, w.codice AS wp_codice, w.nome AS wp_nome,
           c.tema AS criticita_tema, d.tema AS decisione_tema, r.codice_wbs AS requisito_wbs, r.titolo AS requisito_titolo,
           cm.codice AS commessa_codice
    FROM allert a
    LEFT JOIN work_packages w ON a.wp_id = w.id
    LEFT JOIN criticita c ON a.rif_criticita_id = c.id
    LEFT JOIN decisioni d ON a.rif_decisione_id = d.id
    LEFT JOIN requisiti r ON a.rif_requisito_id = r.id
    LEFT JOIN commesse cm ON a.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'a.commessa_id');
  if (wp_id) { sql += ' AND a.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND a.stato = ?'; params.push(stato); }
  if (perimetro) { sql += ' AND a.perimetro = ?'; params.push(perimetro); }
  if (classificazione) { sql += ' AND a.classificazione = ?'; params.push(classificazione); }
  sql += " ORDER BY (a.classificazione = 'critico') DESC, a.data DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM allert WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'allert non trovato' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, data, perimetro, classificazione, descrizione, azione_tutela,
          rif_documento, rif_criticita_id, rif_decisione_id, rif_requisito_id, stato, note } = req.body;
  if (!commessa_id || !descrizione) return res.status(400).json({ error: 'commessa_id e descrizione sono obbligatori' });

  const result = db.prepare(`
    INSERT INTO allert (commessa_id, wp_id, data, perimetro, classificazione, descrizione, azione_tutela,
      rif_documento, rif_criticita_id, rif_decisione_id, rif_requisito_id, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, wp_id || null, data || todayStr(), perimetro || 'interno', classificazione || 'attenzione',
    descrizione, azione_tutela || null, rif_documento || null, rif_criticita_id || null, rif_decisione_id || null,
    rif_requisito_id || null, stato || 'aperto', note || null
  );
  const row = db.prepare('SELECT * FROM allert WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'allert', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: descrizione });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM allert WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'allert non trovato' });
  const next = { ...existing, ...req.body };

  db.prepare(`
    UPDATE allert SET wp_id=?, data=?, perimetro=?, classificazione=?, descrizione=?, azione_tutela=?, rif_documento=?,
      rif_criticita_id=?, rif_decisione_id=?, rif_requisito_id=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.data, next.perimetro, next.classificazione, next.descrizione, next.azione_tutela || null,
    next.rif_documento || null, next.rif_criticita_id || null, next.rif_decisione_id || null, next.rif_requisito_id || null,
    next.stato, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM allert WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  const azione = (existing.stato !== 'chiuso' && next.stato === 'chiuso') ? 'chiusa'
    : (existing.stato === 'chiuso' && next.stato !== 'chiuso') ? 'riaperta' : 'modificata';
  logAudit({ commessa_id: row.commessa_id, entity_type: 'allert', entity_id: row.id, azione, utente: req.user?.nome, dettaglio: dettaglio || 'aggiornato' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM allert WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'allert non trovato' });
  db.prepare('DELETE FROM allert WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'allert', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.descrizione });
  res.status(204).end();
});

module.exports = router;
