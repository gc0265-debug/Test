// Response Matrix — commenti ricevuti su una revisione di un elaborato
// (Approvazioni Drawings), con la risposta del subappaltatore e lo stato.
// Un commento marcato change_order segnala una modifica allo scope
// concordato (non un semplice dettaglio grafico): va congelato in attesa
// di una variante economica approvata, invece di essere recepito
// tacitamente nel disegno — vedi server/db/schema.sql.

const express = require('express');
const db = require('../db/database');
const { logAudit, diffFields } = require('../utils/audit');

const router = express.Router();

const TRACKED = [
  { key: 'autore', label: 'Autore' },
  { key: 'richiesta', label: 'Richiesta' },
  { key: 'azione', label: 'Azione intrapresa' },
  { key: 'stato', label: 'Stato' },
  { key: 'change_order', label: 'Change Order' },
];

router.get('/', (req, res) => {
  const { elaborato_id } = req.query;
  if (!elaborato_id) return res.status(400).json({ error: 'elaborato_id obbligatorio' });
  const rows = db.prepare('SELECT * FROM drawing_commenti WHERE elaborato_id = ? ORDER BY id ASC').all(elaborato_id);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { elaborato_id, autore, richiesta, azione, stato, change_order, note } = req.body;
  if (!elaborato_id || !richiesta) return res.status(400).json({ error: 'elaborato_id e richiesta sono obbligatori' });
  const elaborato = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(elaborato_id);
  if (!elaborato) return res.status(404).json({ error: 'elaborato non trovato' });
  const result = db.prepare(`
    INSERT INTO drawing_commenti (elaborato_id, autore, richiesta, azione, stato, change_order, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(elaborato_id, autore || null, richiesta, azione || null, stato || 'aperto', change_order ? 1 : 0, note || null);
  const row = db.prepare('SELECT * FROM drawing_commenti WHERE id = ?').get(result.lastInsertRowid);
  logAudit({
    commessa_id: elaborato.commessa_id, entity_type: 'approvazioni_drawings', entity_id: elaborato.id, azione: 'modificata',
    utente: req.user?.nome, dettaglio: `Nuovo commento su ${elaborato.codice}: ${richiesta.slice(0, 80)}`,
  });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM drawing_commenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'commento non trovato' });
  const next = { ...existing, ...req.body, change_order: req.body.change_order !== undefined ? (req.body.change_order ? 1 : 0) : existing.change_order };
  db.prepare(`
    UPDATE drawing_commenti SET autore=?, richiesta=?, azione=?, stato=?, change_order=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.autore || null, next.richiesta, next.azione || null, next.stato, next.change_order, next.note || null, req.params.id);
  const row = db.prepare('SELECT * FROM drawing_commenti WHERE id = ?').get(req.params.id);
  const elaborato = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(row.elaborato_id);
  const dettaglio = diffFields(existing, next, TRACKED);
  if (elaborato) {
    logAudit({
      commessa_id: elaborato.commessa_id, entity_type: 'approvazioni_drawings', entity_id: elaborato.id, azione: 'modificata',
      utente: req.user?.nome, dettaglio: `Commento su ${elaborato.codice} aggiornato — ${dettaglio || 'nessun campo tracciato cambiato'}`,
    });
  }
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM drawing_commenti WHERE id = ?').get(req.params.id);
  const result = db.prepare('DELETE FROM drawing_commenti WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'commento non trovato' });
  if (existing) {
    const elaborato = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(existing.elaborato_id);
    if (elaborato) {
      logAudit({
        commessa_id: elaborato.commessa_id, entity_type: 'approvazioni_drawings', entity_id: elaborato.id, azione: 'modificata',
        utente: req.user?.nome, dettaglio: `Commento eliminato da ${elaborato.codice}: ${existing.richiesta.slice(0, 80)}`,
      });
    }
  }
  res.status(204).end();
});

module.exports = router;
