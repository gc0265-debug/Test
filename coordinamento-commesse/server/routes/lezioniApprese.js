// Lezioni Apprese: raccolte dalle altre sezioni (criticità, decisioni,
// allert) tramite collegamento opzionale.

const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

const TRACKED = [
  { key: 'titolo', label: 'Titolo' },
  { key: 'categoria', label: 'Categoria' },
];

router.get('/', (req, res) => {
  const { categoria } = req.query;
  let sql = `
    SELECT l.*, w.codice AS wp_codice, w.nome AS wp_nome,
           c.tema AS criticita_tema, d.tema AS decisione_tema, a.descrizione AS allert_descrizione,
           cm.codice AS commessa_codice
    FROM lezioni_apprese l
    LEFT JOIN work_packages w ON l.wp_id = w.id
    LEFT JOIN criticita c ON l.rif_criticita_id = c.id
    LEFT JOIN decisioni d ON l.rif_decisione_id = d.id
    LEFT JOIN allert a ON l.rif_allert_id = a.id
    LEFT JOIN commesse cm ON l.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'l.commessa_id');
  if (categoria) { sql += ' AND l.categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY l.data DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, data, titolo, cosa_e_successo, cosa_abbiamo_imparato, azione_futura,
          categoria, rif_criticita_id, rif_decisione_id, rif_allert_id, note } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });

  const result = db.prepare(`
    INSERT INTO lezioni_apprese (commessa_id, wp_id, data, titolo, cosa_e_successo, cosa_abbiamo_imparato, azione_futura,
      categoria, rif_criticita_id, rif_decisione_id, rif_allert_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, wp_id || null, data || todayStr(), titolo, cosa_e_successo || null, cosa_abbiamo_imparato || null,
    azione_futura || null, categoria || 'generale', rif_criticita_id || null, rif_decisione_id || null, rif_allert_id || null, note || null
  );
  const row = db.prepare('SELECT * FROM lezioni_apprese WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'lezioni_apprese', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: titolo });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lezioni_apprese WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'lezione non trovata' });
  const next = { ...existing, ...req.body };

  db.prepare(`
    UPDATE lezioni_apprese SET wp_id=?, data=?, titolo=?, cosa_e_successo=?, cosa_abbiamo_imparato=?, azione_futura=?,
      categoria=?, rif_criticita_id=?, rif_decisione_id=?, rif_allert_id=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.data, next.titolo, next.cosa_e_successo || null, next.cosa_abbiamo_imparato || null,
    next.azione_futura || null, next.categoria, next.rif_criticita_id || null, next.rif_decisione_id || null,
    next.rif_allert_id || null, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM lezioni_apprese WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'lezioni_apprese', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: dettaglio || 'aggiornata' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lezioni_apprese WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'lezione non trovata' });
  db.prepare('DELETE FROM lezioni_apprese WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'lezioni_apprese', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.titolo });
  res.status(204).end();
});

module.exports = router;
