// SAL operativo — Stato Avanzamento Lavori: % di completamento delle
// Lavorazioni aggregata per Work Package e per Impresa, numerata
// progressivamente per commessa. Nessun dato economico (quantità, prezzi
// unitari): Lavorazioni non li traccia, quindi questo non è un SAL
// contabile ai sensi del DM 49/2018 — solo un registro di avanzamento
// fisico, pensato per restare semplice e affidabile sui dati già in uso
// in cantiere invece di introdurne di nuovi e non verificati.

const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { logAudit } = require('../utils/audit');

const router = express.Router();

function aggregate(rows) {
  const totali = rows.length;
  const completate = rows.filter((r) => r.stato === 'completata').length;
  const in_corso = rows.filter((r) => r.stato === 'in-corso').length;
  const bloccata = rows.filter((r) => r.stato === 'bloccata').length;
  const da_fare = rows.filter((r) => r.stato === 'da-fare').length;
  return { totali, completate, in_corso, bloccata, da_fare, pct: totali ? Math.round((completate / totali) * 100) : 0 };
}

// Calcola lo stato di avanzamento corrente (non salvato) a partire dalle
// Lavorazioni della commessa: totale, per Work Package, per Impresa.
function calcolaAvanzamento(commessaId) {
  const rows = db.prepare(`
    SELECT l.stato, w.id AS wp_id, w.codice AS wp_codice, w.nome AS wp_nome,
           COALESCE(c.controparte, l.impresa) AS impresa
    FROM lavorazioni l
    LEFT JOIN work_packages w ON l.wp_id = w.id
    LEFT JOIN contratti c ON l.contratto_id = c.id
    WHERE l.commessa_id = ?
  `).all(commessaId);

  const perWp = new Map();
  rows.forEach((r) => {
    const key = r.wp_id || 'none';
    if (!perWp.has(key)) perWp.set(key, { wp_id: r.wp_id, codice: r.wp_codice, nome: r.wp_id ? r.wp_nome : 'Senza WP', righe: [] });
    perWp.get(key).righe.push(r);
  });
  const per_wp = [...perWp.values()].map((g) => ({ wp_id: g.wp_id, codice: g.codice, nome: g.nome, ...aggregate(g.righe) }));

  const perImpresa = new Map();
  rows.forEach((r) => {
    const key = r.impresa || '—';
    if (!perImpresa.has(key)) perImpresa.set(key, { impresa: key, righe: [] });
    perImpresa.get(key).righe.push(r);
  });
  const per_impresa = [...perImpresa.values()].map((g) => ({ impresa: g.impresa, ...aggregate(g.righe) }));

  return { totale: aggregate(rows), per_wp, per_impresa };
}

// Stato corrente, calcolato al volo: usato per l'anteprima prima di
// chiudere un nuovo SAL, non va confuso con uno già chiuso e congelato.
router.get('/corrente', (req, res) => {
  const { commessa_id } = req.query;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  res.json(calcolaAvanzamento(commessa_id));
});

router.get('/', (req, res) => {
  const { commessa_id } = req.query;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  const rows = db.prepare('SELECT * FROM sal WHERE commessa_id = ? ORDER BY numero DESC').all(commessa_id);
  res.json({ data: rows.map((r) => ({ ...r, dati: JSON.parse(r.dati_json) })), total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sal WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'SAL non trovato' });
  res.json({ ...row, dati: JSON.parse(row.dati_json) });
});

// Chiude un nuovo SAL: calcola lo snapshot corrente, lo confronta con
// l'ultimo SAL chiuso (se esiste) per il delta percentuale, e lo
// congela come nuova riga numerata progressivamente.
router.post('/chiudi', (req, res) => {
  const { commessa_id, data, note } = req.body;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });

  const ultimo = db.prepare('SELECT * FROM sal WHERE commessa_id = ? ORDER BY numero DESC LIMIT 1').get(commessa_id);
  const numero = ultimo ? ultimo.numero + 1 : 1;
  const dati = calcolaAvanzamento(commessa_id);

  if (ultimo) {
    const precedente = JSON.parse(ultimo.dati_json);
    dati.totale.delta_pct = dati.totale.pct - precedente.totale.pct;
    dati.per_wp.forEach((g) => {
      const prev = precedente.per_wp.find((p) => p.wp_id === g.wp_id);
      if (prev) g.delta_pct = g.pct - prev.pct;
    });
  }

  const result = db.prepare(`
    INSERT INTO sal (commessa_id, numero, data, note, dati_json, creato_da)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(commessa_id, numero, data || todayStr(), note || null, JSON.stringify(dati), req.user?.nome || null);

  const row = db.prepare('SELECT * FROM sal WHERE id = ?').get(result.lastInsertRowid);
  logAudit({
    commessa_id, entity_type: 'sal', entity_id: row.id, azione: 'creata', utente: req.user?.nome,
    dettaglio: `SAL n. ${numero} — avanzamento ${dati.totale.pct}%${dati.totale.delta_pct !== undefined ? ` (${dati.totale.delta_pct >= 0 ? '+' : ''}${dati.totale.delta_pct}% dal precedente)` : ''}`,
  });
  res.status(201).json({ ...row, dati: JSON.parse(row.dati_json) });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sal WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'SAL non trovato' });
  db.prepare('DELETE FROM sal WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'sal', entity_id: row.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `SAL n. ${row.numero}` });
  res.status(204).end();
});

module.exports = router;
