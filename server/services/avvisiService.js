const db = require('../db/database');
const { oggi, oraCorrente, isWeekend } = require('./tempo');
const { leggiTutte } = require('./impostazioniService');

// Promemoria di chiusura giornata.
//
// Non è una notifica push: è uno stato che la dashboard legge a ogni apertura.
// Serve a proteggere il rituale, non a rimproverare — per questo tace nel weekend
// (salvo diversa impostazione) e prima dell'ora di fine turno.
function promemoriaChiusura(imp, adesso) {
  if (imp.promemoria_chiusura_attivo !== '1') return [];
  if (imp.promemoria_salta_weekend === '1' && isWeekend(adesso)) return [];

  const ora = oraCorrente(adesso);
  if (ora < imp.promemoria_chiusura_ora) return [];

  const data = oggi(adesso);
  const scoperti = db.prepare(`
    SELECT c.id, c.title
    FROM cantieri c
    WHERE c.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM giornale g WHERE g.cantiere_id = c.id AND g.date = ?)
    ORDER BY c.title
  `).all(data);

  return scoperti.map(c => ({
    id: `chiusura-mancante-${c.id}-${data}`,
    tipo: 'chiusura_mancante',
    livello: 'attenzione',
    titolo: 'Giornata non ancora chiusa',
    messaggio: `${c.title} — nessuna chiusura registrata per il ${data}.`,
    azione: { etichetta: 'Chiudi giornata', percorso: '/chiusura' },
    cantiere_id: c.id,
  }));
}

function calcolaAvvisi(adesso = new Date()) {
  const imp = leggiTutte();
  return [
    ...promemoriaChiusura(imp, adesso),
  ];
}

module.exports = { calcolaAvvisi };
