// Milestone / montaggi: alimenta la Timeline (Gantt per settimane/mesi).
// giorni_alla_fine e in_ritardo sono calcolati come per le criticità
// urgenti, senza bisogno di un job pianificato.

const express = require('express');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');
const { logAudit, diffFields } = require('../utils/audit');

const router = express.Router();

const TRACKED = [
  { key: 'titolo', label: 'Titolo' },
  { key: 'stato', label: 'Stato' },
  { key: 'data_inizio', label: 'Inizio' },
  { key: 'data_fine', label: 'Fine' },
];

function arricchisci(row) {
  const giorni_alla_fine = daysBetween(todayStr(), row.data_fine);
  const in_ritardo = row.stato !== 'completata' && giorni_alla_fine < 0;
  return { ...row, giorni_alla_fine, in_ritardo };
}

router.get('/', (req, res) => {
  const { commessa_id, wp_id, stato, piano, zona } = req.query;
  let sql = `
    SELECT m.*, w.codice AS wp_codice, w.nome AS wp_nome
    FROM milestone m
    LEFT JOIN work_packages w ON m.wp_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND m.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND m.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND m.stato = ?'; params.push(stato); }
  if (piano) { sql += ' AND m.piano = ?'; params.push(piano); }
  if (zona) { sql += ' AND m.zona = ?'; params.push(zona); }
  sql += ' ORDER BY m.data_inizio ASC';

  const rows = db.prepare(sql).all(...params).map(arricchisci);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, piano, zona, titolo, data_inizio, data_fine, stato, note } = req.body;
  if (!commessa_id || !titolo || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'commessa_id, titolo, data_inizio e data_fine sono obbligatori' });
  }
  if (data_fine < data_inizio) return res.status(400).json({ error: 'la data di fine non può precedere la data di inizio' });

  const result = db.prepare(`
    INSERT INTO milestone (commessa_id, wp_id, piano, zona, titolo, data_inizio, data_fine, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, piano || null, zona || null, titolo, data_inizio, data_fine, stato || 'pianificata', note || null);
  const row = db.prepare('SELECT * FROM milestone WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'milestone', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: titolo });
  res.status(201).json(arricchisci(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM milestone WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'milestone non trovata' });
  const next = { ...existing, ...req.body };
  if (next.data_fine < next.data_inizio) return res.status(400).json({ error: 'la data di fine non può precedere la data di inizio' });

  db.prepare(`
    UPDATE milestone SET wp_id=?, piano=?, zona=?, titolo=?, data_inizio=?, data_fine=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.wp_id || null, next.piano || null, next.zona || null, next.titolo, next.data_inizio, next.data_fine, next.stato, next.note || null, req.params.id);
  const row = db.prepare('SELECT * FROM milestone WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  const azione = (existing.stato !== 'completata' && next.stato === 'completata') ? 'chiusa'
    : (existing.stato === 'completata' && next.stato !== 'completata') ? 'riaperta' : 'modificata';
  logAudit({ commessa_id: row.commessa_id, entity_type: 'milestone', entity_id: row.id, azione, utente: req.user?.nome, dettaglio: dettaglio || 'aggiornata' });
  res.json(arricchisci(row));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM milestone WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'milestone non trovata' });
  db.prepare('DELETE FROM milestone WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'milestone', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.titolo });
  res.status(204).end();
});

module.exports = router;
