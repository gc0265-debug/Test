const db = require('../db/database');

// Impostazioni note, con il loro valore di partenza. Una chiave non elencata qui
// viene rifiutata in scrittura: evita che un client scriva configurazione arbitraria.
const DEFAULT = {
  promemoria_chiusura_attivo: '1',
  promemoria_chiusura_ora: '17:00',
  promemoria_salta_weekend: '1',
};

const ORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function leggiTutte() {
  const righe = db.prepare('SELECT chiave, valore FROM impostazioni').all();
  const salvate = Object.fromEntries(righe.map(r => [r.chiave, r.valore]));
  return { ...DEFAULT, ...salvate };
}

function leggi(chiave) {
  return leggiTutte()[chiave];
}

function valida(chiave, valore) {
  if (!(chiave in DEFAULT)) return `Impostazione sconosciuta: ${chiave}`;
  if (chiave === 'promemoria_chiusura_ora' && !ORA_VALIDA.test(valore)) {
    return "L'ora del promemoria deve essere nel formato HH:MM (es. 17:00)";
  }
  if (chiave.endsWith('_attivo') || chiave === 'promemoria_salta_weekend') {
    if (!['0', '1'].includes(String(valore))) return `${chiave} accetta solo 0 o 1`;
  }
  return null;
}

function scrivi(valori) {
  for (const [chiave, valore] of Object.entries(valori)) {
    const errore = valida(chiave, String(valore));
    if (errore) return { errore };
  }

  const salva = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO impostazioni (chiave, valore) VALUES (?, ?)
      ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore, updated_at = unixepoch()
    `);
    for (const [chiave, valore] of Object.entries(valori)) stmt.run(chiave, String(valore));
  });
  salva();

  return { dati: leggiTutte() };
}

module.exports = { leggiTutte, leggi, scrivi, DEFAULT };
