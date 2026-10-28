const express = require('express');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');

const router = express.Router();

// Cruscotto per commessa: rispecchia la struttura del Registro Decisioni DL
// (richieste totali, decise, tasso di resa, pendenze oltre 21gg, anzianità
// media, % confermate per iscritto) più lo stato delle criticità e delle
// lavorazioni. Non introduce metriche nuove: aggrega quanto già registrato.
router.get('/:commessaId', (req, res) => {
  const commessaId = req.params.commessaId;
  const commessa = db.prepare('SELECT * FROM commesse WHERE id = ?').get(commessaId);
  if (!commessa) return res.status(404).json({ error: 'commessa non trovata' });

  const oggi = todayStr();

  // ---- criticità ----
  const criticitaRows = db.prepare('SELECT * FROM criticita WHERE commessa_id = ?').all(commessaId);
  const criticitaAperte = criticitaRows.filter(c => c.stato !== 'chiusa');
  const violaScadute = criticitaAperte.filter(c => c.urgenza === 'viola' && c.entro_quando && daysBetween(oggi, c.entro_quando) < 0);
  const criticita = {
    totali: criticitaRows.length,
    aperte: criticitaAperte.length,
    viola_aperte: criticitaAperte.filter(c => c.urgenza === 'viola').length,
    viola_scadute: violaScadute.length,
    verde_aperte: criticitaAperte.filter(c => c.urgenza === 'verde').length,
  };

  // ---- decisioni ----
  const decisioniRows = db.prepare('SELECT * FROM decisioni WHERE commessa_id = ?').all(commessaId);
  const decise = decisioniRows.filter(d => d.stato === 'decisa');
  const aperte = decisioniRows.filter(d => d.stato !== 'decisa');
  const anzianitaAperte = aperte.map(d => daysBetween(d.data_prima_richiesta, oggi));
  const anzianitaMedia = anzianitaAperte.length
    ? Math.round(anzianitaAperte.reduce((a, b) => a + b, 0) / anzianitaAperte.length)
    : 0;
  const decisioni = {
    richieste_totali: decisioniRows.length,
    decise: decise.length,
    tasso_resa_pct: decisioniRows.length ? Math.round((decise.length / decisioniRows.length) * 100) : 0,
    pendenze_aperte: aperte.length,
    oltre_21gg: anzianitaAperte.filter(g => g > 21).length,
    anzianita_media_gg: anzianitaMedia,
    confermate_iscritto_pct: decisioniRows.length
      ? Math.round((decisioniRows.filter(d => d.conferma_scritta).length / decisioniRows.length) * 100)
      : 0,
  };

  // ---- lavorazioni ----
  const lavorazioniRows = db.prepare('SELECT stato, COUNT(*) AS n FROM lavorazioni WHERE commessa_id = ? GROUP BY stato').all(commessaId);
  const lavorazioni = { 'da-fare': 0, 'in-corso': 0, completata: 0, bloccata: 0 };
  lavorazioniRows.forEach(r => { lavorazioni[r.stato] = r.n; });

  res.json({ commessa, criticita, decisioni, lavorazioni });
});

module.exports = router;
