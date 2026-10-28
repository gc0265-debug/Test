const express = require('express');
const db = require('../db/database');
const { daysBetween, todayStr, addDays } = require('../utils/dates');

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
  const violaAperte = criticitaAperte.filter(c => c.urgenza === 'viola' && c.entro_quando);
  const violaScadute = violaAperte.filter(c => daysBetween(oggi, c.entro_quando) < 0);
  const inScadenza3gg = violaAperte.filter(c => { const g = daysBetween(oggi, c.entro_quando); return g >= 0 && g <= 3; });
  // promemoria scadenze: le prossime 5 criticità urgenti per data di scadenza,
  // scadute comprese — pensate per essere mostrate direttamente sul Cruscotto.
  const prossimeScadenze = violaAperte
    .map(c => ({ id: c.id, tema: c.tema, entro_quando: c.entro_quando, giorni_rimanenti: daysBetween(oggi, c.entro_quando) }))
    .sort((a, b) => a.giorni_rimanenti - b.giorni_rimanenti)
    .slice(0, 5);
  const criticita = {
    totali: criticitaRows.length,
    aperte: criticitaAperte.length,
    viola_aperte: violaAperte.length,
    viola_scadute: violaScadute.length,
    in_scadenza_3gg: inScadenza3gg.length,
    verde_aperte: criticitaAperte.filter(c => c.urgenza === 'verde').length,
    prossime_scadenze: prossimeScadenze,
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

  // ---- allert (presidio GC / tutela) ----
  const allertRows = db.prepare('SELECT stato, classificazione FROM allert WHERE commessa_id = ?').all(commessaId);
  const allertAperti = allertRows.filter(a => a.stato !== 'chiuso');
  const allert = {
    totali: allertRows.length,
    aperti: allertAperti.length,
    critici_aperti: allertAperti.filter(a => a.classificazione === 'critico').length,
  };

  // ---- attività recente (storico modifiche, ultime 8 su tutti i registri) ----
  const attivitaRecente = db.prepare('SELECT * FROM audit_log WHERE commessa_id = ? ORDER BY created_at DESC LIMIT 8').all(commessaId);

  // ---- milestone / montaggi ----
  const limite7 = addDays(oggi, 7);
  const milestoneRows = db.prepare('SELECT * FROM milestone WHERE commessa_id = ?').all(commessaId);
  const milestoneAperte = milestoneRows.filter(m => m.stato !== 'completata');
  const milestoneInRitardo = milestoneAperte.filter(m => m.data_fine < oggi);
  const milestoneInScadenza = milestoneAperte.filter(m => m.data_fine >= oggi && m.data_fine <= limite7);
  const milestone = {
    totali: milestoneRows.length,
    aperte: milestoneAperte.length,
    in_ritardo: milestoneInRitardo.length,
    in_scadenza_7gg: milestoneInScadenza.length,
  };

  // ---- scadenze della settimana (criticità urgenti + milestone, entro 7 giorni o già scadute) ----
  const scadenzeSettimana = [
    ...violaAperte
      .filter(c => c.entro_quando <= limite7)
      .map(c => ({ tipo: 'criticita', id: c.id, titolo: c.tema, data: c.entro_quando, giorni: daysBetween(oggi, c.entro_quando) })),
    ...milestoneAperte
      .filter(m => m.data_fine <= limite7)
      .map(m => ({ tipo: 'milestone', id: m.id, titolo: m.titolo, data: m.data_fine, giorni: daysBetween(oggi, m.data_fine) })),
  ].sort((a, b) => a.giorni - b.giorni);

  // ---- requisiti ----
  const requisitiRows = db.prepare('SELECT stato FROM requisiti WHERE commessa_id = ?').all(commessaId);
  const requisiti = {
    totali: requisitiRows.length,
    approvati: requisitiRows.filter(r => r.stato === 'approvato').length,
    in_revisione: requisitiRows.filter(r => r.stato === 'in-revisione').length,
    bozza: requisitiRows.filter(r => r.stato === 'bozza').length,
  };

  // ---- contratto: variazioni rispetto alla baseline, su tutti i contratti attivi ----
  const contrattiAttivi = db.prepare("SELECT * FROM contratti WHERE commessa_id = ? AND stato = 'attivo'").all(commessaId);
  let variazioniDaGestire = 0;
  contrattiAttivi.forEach((c) => {
    if (!c.capitolato_baseline_data) return;
    const n = db.prepare(`
      SELECT COUNT(*) AS n FROM requisiti_versioni rv JOIN requisiti r ON rv.requisito_id = r.id
      WHERE r.commessa_id = ? AND rv.data > ? AND rv.numero_versione > 1
    `).get(commessaId, c.capitolato_baseline_data).n;
    variazioniDaGestire += n;
  });
  const contratto = { attivi: contrattiAttivi.length, variazioni_da_gestire: variazioniDaGestire };

  // ---- stakeholder ----
  const stakeholderRows = db.prepare("SELECT * FROM stakeholder WHERE commessa_id = ? AND stato = 'attivo'").all(commessaId);
  const stakeholder = {
    totali: stakeholderRows.length,
    chiave: stakeholderRows.filter(s => s.interesse === 'alto' && s.influenza === 'alta').length,
  };

  res.json({
    commessa, criticita, decisioni, lavorazioni, allert, milestone, requisiti, contratto, stakeholder,
    attivita_recente: attivitaRecente, scadenze_settimana: scadenzeSettimana,
  });
});

module.exports = router;
