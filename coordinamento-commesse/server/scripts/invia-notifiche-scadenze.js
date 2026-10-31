#!/usr/bin/env node
// Notifiche email di scadenza (cut-off Approvazioni Drawings, criticità
// urgenti) — vedi GUIDA_AGGIORNAMENTI.md per l'installazione
// (deploy/macos/installa-notifiche-scadenze.command).
//
// node scripts/invia-notifiche-scadenze.js   esegue un controllo ora
//
// Pensato per girare ogni ora (via launchd/cron): ad ogni esecuzione,
// per ogni commessa con un indirizzo email configurato,
// - invia subito un avviso per ogni criticità urgente o cut-off appena
//   risultato scaduto, una sola volta per elemento per giorno;
// - una volta al giorno, dall'ora configurata (NOTIFICHE_DIGEST_ORA,
//   default 7) in poi, invia anche un riepilogo con tutte le scadenze
//   nei prossimi 7 giorni, scadute comprese.
// Senza SMTP configurato nel file .env non invia nulla e lo segnala.

require('../utils/loadEnv').loadEnv();

const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { calcolaScadenze, corpoDigest, corpoImmediato, testoSemplice } = require('../utils/notificheScadenze');
const { inviaEmail, configurato } = require('../utils/mailer');

const DIGEST_ORA = Number(process.env.NOTIFICHE_DIGEST_ORA) || 7;

function giaInviato(commessaId, tipo, chiave, giorno) {
  return !!db.prepare('SELECT 1 FROM notifiche_inviate WHERE commessa_id = ? AND tipo = ? AND chiave = ? AND giorno = ?')
    .get(commessaId, tipo, chiave, giorno);
}
function segnaInviato(commessaId, tipo, chiave, giorno) {
  db.prepare('INSERT OR IGNORE INTO notifiche_inviate (commessa_id, tipo, chiave, giorno) VALUES (?, ?, ?, ?)')
    .run(commessaId, tipo, chiave, giorno);
}

async function processaCommessa(commessa, oggi, oraAttuale) {
  const destinatari = (commessa.email_notifiche || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!destinatari.length) return;

  const scadenze = calcolaScadenze(commessa.id);

  // --- avviso immediato: solo elementi appena diventati scaduti ---
  const scaduti = [
    ...scadenze.criticita.filter((c) => c.giorni < 0).map((row) => ({ tipo: 'criticita', chiave: `criticita:${row.id}`, row })),
    ...scadenze.cutoff.filter((a) => a.giorni < 0).map((row) => ({ tipo: 'cutoff', chiave: `cutoff:${row.id}`, row })),
  ];
  const daInviare = scaduti.filter((s) => !giaInviato(commessa.id, 'immediato', s.chiave, oggi));
  if (daInviare.length) {
    try {
      const html = corpoImmediato(commessa, daInviare);
      await inviaEmail({
        to: destinatari,
        subject: `URGENTE — ${daInviare.length} scadenza${daInviare.length === 1 ? '' : 'e'} superata${daInviare.length === 1 ? '' : 'e'} — ${commessa.codice}`,
        html, text: testoSemplice(html),
      });
      daInviare.forEach((s) => segnaInviato(commessa.id, 'immediato', s.chiave, oggi));
      console.log(`[${commessa.codice}] avviso immediato inviato: ${daInviare.length} elementi.`);
    } catch (err) {
      console.error(`[${commessa.codice}] errore invio avviso immediato: ${err.message}`);
    }
  }

  // --- digest giornaliero ---
  if (oraAttuale >= DIGEST_ORA && !giaInviato(commessa.id, 'digest', 'digest', oggi)) {
    if (scadenze.criticita.length || scadenze.cutoff.length) {
      try {
        const html = corpoDigest(commessa, scadenze);
        await inviaEmail({ to: destinatari, subject: `Scadenze della settimana — ${commessa.codice}`, html, text: testoSemplice(html) });
        console.log(`[${commessa.codice}] digest giornaliero inviato.`);
      } catch (err) {
        console.error(`[${commessa.codice}] errore invio digest: ${err.message}`);
      }
    }
    // Segnato come "fatto per oggi" anche se non c'era nulla da inviare,
    // per non ricalcolare ad ogni esecuzione successiva nella stessa giornata.
    segnaInviato(commessa.id, 'digest', 'digest', oggi);
  }
}

async function main() {
  if (!configurato()) {
    console.log('SMTP non configurato (vedi .env.example): nessuna notifica inviata.');
    return;
  }
  const oggi = todayStr();
  const oraAttuale = new Date().getHours();
  const commesse = db.prepare("SELECT * FROM commesse WHERE email_notifiche IS NOT NULL AND trim(email_notifiche) != ''").all();
  if (!commesse.length) {
    console.log('Nessuna commessa ha un indirizzo di notifica configurato.');
    return;
  }
  for (const commessa of commesse) {
    await processaCommessa(commessa, oggi, oraAttuale);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
