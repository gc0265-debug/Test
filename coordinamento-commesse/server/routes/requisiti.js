// Requisiti — estratti da un capitolato, con codice WBS per commessa e
// fase di esecuzione. Una modifica a titolo o descrizione crea una nuova
// riga in requisiti_versioni (versionamento append-only): è la base su
// cui il Contratto rileva le variazioni rispetto alla propria baseline.

const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', (req, res) => {
  const { commessa_id, wp_id, fase, stato, search } = req.query;
  let sql = `
    SELECT r.*, w.codice AS wp_codice, w.nome AS wp_nome, cv.codice_wbs AS capitolato_wbs, cv.titolo AS capitolato_titolo
    FROM requisiti r
    LEFT JOIN work_packages w ON r.wp_id = w.id
    LEFT JOIN capitolato_voci cv ON r.rif_capitolato_voce_id = cv.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND r.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND r.wp_id = ?'; params.push(wp_id); }
  if (fase) { sql += ' AND r.fase = ?'; params.push(fase); }
  if (stato) { sql += ' AND r.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (r.titolo LIKE ? OR r.codice_wbs LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY r.codice_wbs ASC';

  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'requisito non trovato' });
  res.json(row);
});

router.get('/:id/versioni', (req, res) => {
  const rows = db.prepare('SELECT * FROM requisiti_versioni WHERE requisito_id = ? ORDER BY numero_versione DESC').all(req.params.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, codice_wbs, fase, titolo, descrizione, fonte_capitolato, rif_capitolato_voce_id, stato, note } = req.body;
  if (!commessa_id || !codice_wbs || !titolo) {
    return res.status(400).json({ error: 'commessa_id, codice_wbs e titolo sono obbligatori' });
  }
  const insertRequisito = db.prepare(`
    INSERT INTO requisiti (commessa_id, wp_id, codice_wbs, fase, titolo, descrizione, fonte_capitolato, rif_capitolato_voce_id, stato, versione_corrente, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertVersione = db.prepare(`
    INSERT INTO requisiti_versioni (requisito_id, numero_versione, titolo, descrizione, motivo_modifica, data, autore)
    VALUES (?, 1, ?, ?, 'Creazione', ?, ?)
  `);
  const creaConVersione = db.transaction(() => {
    const result = insertRequisito.run(
      commessa_id, wp_id || null, codice_wbs, fase || 'progettazione', titolo, descrizione || null,
      fonte_capitolato || null, rif_capitolato_voce_id || null, stato || 'bozza', note || null
    );
    insertVersione.run(result.lastInsertRowid, titolo, descrizione || null, todayStr(), req.user?.nome || null);
    return result.lastInsertRowid;
  });
  const id = creaConVersione();
  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'requisiti', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${codice_wbs} — ${titolo}` });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'requisito non trovato' });
  const next = { ...existing, ...req.body };
  const contenutoCambiato = next.titolo !== existing.titolo || (next.descrizione || '') !== (existing.descrizione || '');
  const motivoModifica = req.body.motivo_modifica || null;

  const aggiorna = db.transaction(() => {
    const versione = contenutoCambiato ? existing.versione_corrente + 1 : existing.versione_corrente;
    db.prepare(`
      UPDATE requisiti SET wp_id=?, codice_wbs=?, fase=?, titolo=?, descrizione=?, fonte_capitolato=?, rif_capitolato_voce_id=?, stato=?,
        versione_corrente=?, note=?, updated_at=unixepoch()
      WHERE id=?
    `).run(
      next.wp_id || null, next.codice_wbs, next.fase, next.titolo, next.descrizione || null,
      next.fonte_capitolato || null, next.rif_capitolato_voce_id || null, next.stato, versione, next.note || null, req.params.id
    );
    if (contenutoCambiato) {
      db.prepare(`
        INSERT INTO requisiti_versioni (requisito_id, numero_versione, titolo, descrizione, motivo_modifica, data, autore)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, versione, next.titolo, next.descrizione || null, motivoModifica, todayStr(), req.user?.nome || null);
    }
    return versione;
  });
  const nuovaVersione = aggiorna();

  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  const dettaglio = contenutoCambiato
    ? `Nuova versione (v${nuovaVersione})${motivoModifica ? ': ' + motivoModifica : ''}`
    : (existing.stato !== next.stato ? `Stato: ${existing.stato} → ${next.stato}` : 'aggiornato');
  logAudit({ commessa_id: row.commessa_id, entity_type: 'requisiti', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'requisito non trovato' });
  db.prepare('DELETE FROM requisiti WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'requisiti', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `${existing.codice_wbs} — ${existing.titolo}` });
  res.status(204).end();
});

module.exports = router;
