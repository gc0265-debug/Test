// Calcolo e composizione delle notifiche di scadenza (cut-off Approvazioni
// Drawings ancora IFA, criticità urgenti) — usato sia dallo script
// pianificato (server/scripts/invia-notifiche-scadenze.js) sia dal
// pulsante "Invia notifica di prova" in Commesse. Non duplica la logica
// di calcolo già usata altrove (stessa finestra di 7 giorni del Cruscotto,
// stessa definizione di cut-off di Approvazioni Drawings).

const db = require('../db/database');
const { daysBetween, todayStr, addDays } = require('./dates');

const FINESTRA_GIORNI = 7;

function calcolaScadenze(commessaId) {
  const oggi = todayStr();
  const limite = addDays(oggi, FINESTRA_GIORNI);

  const criticita = db.prepare(`
    SELECT c.*, w.codice AS wp_codice FROM criticita c
    LEFT JOIN work_packages w ON c.wp_id = w.id
    WHERE c.commessa_id = ? AND c.stato != 'chiusa' AND c.urgenza = 'viola' AND c.entro_quando IS NOT NULL AND c.entro_quando <= ?
  `).all(commessaId, limite).map((c) => ({ ...c, giorni: daysBetween(oggi, c.entro_quando) }))
    .sort((a, b) => a.giorni - b.giorni);

  const cutoff = db.prepare(`
    SELECT a.*, w.codice AS wp_codice FROM approvazioni_drawings a
    LEFT JOIN work_packages w ON a.wp_id = w.id
    WHERE a.commessa_id = ? AND a.emissione = 'IFA' AND a.data_limite_approvazione IS NOT NULL AND a.data_limite_approvazione <= ?
  `).all(commessaId, limite).map((a) => ({ ...a, giorni: daysBetween(oggi, a.data_limite_approvazione) }))
    .sort((a, b) => a.giorni - b.giorni);

  return { criticita, cutoff };
}

function etichettaGiorni(giorni) {
  if (giorni < 0) return `scaduta da ${-giorni} ${-giorni === 1 ? 'giorno' : 'giorni'}`;
  if (giorni === 0) return 'scade oggi';
  return `scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
}

function rigaCriticita(c) {
  return `<li><b>${c.tema}</b>${c.wp_codice ? ` — ${c.wp_codice}` : ''}<br><span style="color:#666;font-size:12px">${etichettaGiorni(c.giorni)} (entro il ${c.entro_quando})</span></li>`;
}

function rigaCutoff(a) {
  const titolo = [a.codice, a.titolo].filter(Boolean).join(' — ');
  return `<li><b>${titolo}</b>${a.wp_codice ? ` — ${a.wp_codice}` : ''}<br><span style="color:#666;font-size:12px">cut-off ${a.giorni < 0 ? `scaduto da ${-a.giorni} ${-a.giorni === 1 ? 'giorno' : 'giorni'}` : (a.giorni === 0 ? 'oggi' : `tra ${a.giorni} ${a.giorni === 1 ? 'giorno' : 'giorni'}`)} (${a.data_limite_approvazione})</span></li>`;
}

function intestazione(commessa) {
  return `<p style="color:#1F3A4D;font-weight:700;margin:0 0 4px">${commessa.codice} — ${commessa.nome}</p>`;
}

function corpoDigest(commessa, scadenze) {
  const vuoto = !scadenze.criticita.length && !scadenze.cutoff.length;
  const blocchi = [
    scadenze.criticita.length ? `<h3 style="margin:18px 0 6px;font-size:13px">Criticità urgenti</h3><ul style="margin:0;padding-left:18px">${scadenze.criticita.map(rigaCriticita).join('')}</ul>` : '',
    scadenze.cutoff.length ? `<h3 style="margin:18px 0 6px;font-size:13px">Cut-off Approvazioni Drawings</h3><ul style="margin:0;padding-left:18px">${scadenze.cutoff.map(rigaCutoff).join('')}</ul>` : '',
  ].join('');
  return `<div style="font-family:Arial,sans-serif;color:#262626;font-size:14px">
    ${intestazione(commessa)}
    <p style="color:#666;font-size:12px;margin:0 0 14px">Riepilogo giornaliero — scadenze nei prossimi ${FINESTRA_GIORNI} giorni, comprese quelle già scadute.</p>
    ${vuoto ? '<p>Nessuna scadenza imminente.</p>' : blocchi}
  </div>`;
}

function corpoImmediato(commessa, elementi) {
  const righe = elementi.map((e) => (e.tipo === 'criticita' ? rigaCriticita(e.row) : rigaCutoff(e.row))).join('');
  return `<div style="font-family:Arial,sans-serif;color:#262626;font-size:14px">
    ${intestazione(commessa)}
    <p style="color:#C0332B;font-weight:700;margin:0 0 10px">Scadenza superata — verifica appena possibile.</p>
    <ul style="margin:0;padding-left:18px">${righe}</ul>
  </div>`;
}

function testoSemplice(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { FINESTRA_GIORNI, calcolaScadenze, corpoDigest, corpoImmediato, testoSemplice };
