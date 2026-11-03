// Webhook WhatsApp Business (Meta Cloud API): riceve i messaggi inviati
// al numero WhatsApp Business dell'app e li registra come riga del
// Diario di Cantiere del giorno — vedi GUIDA_WHATSAPP.md per come
// attivarlo lato Meta. Rotta pubblica (nessuna sessione): la sicurezza è
// affidata alla firma HMAC della richiesta (WHATSAPP_APP_SECRET) e
// all'elenco dei numeri autorizzati a scrivere (WHATSAPP_NUMERI_AUTORIZZATI).
const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const logger = require('../utils/logger');

const router = express.Router();

function numeroAutorizzato(numero) {
  const elenco = (process.env.WHATSAPP_NUMERI_AUTORIZZATI || '')
    .split(',').map((n) => n.trim()).filter(Boolean);
  return elenco.includes(numero);
}

function firmaValida(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // Senza App Secret configurato non si può verificare nulla: si procede
  // comunque (così il resto — numero autorizzato — funziona anche prima
  // di aver completato la configurazione), ma viene registrato un avviso.
  if (!secret) {
    logger.warn('whatsapp: WHATSAPP_APP_SECRET non configurato, firma non verificata');
    return true;
  }
  const firma = req.get('X-Hub-Signature-256');
  if (!firma || !req.rawBody) return false;
  const attesa = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const bufFirma = Buffer.from(firma);
  const bufAttesa = Buffer.from(attesa);
  if (bufFirma.length !== bufAttesa.length) return false;
  return crypto.timingSafeEqual(bufFirma, bufAttesa);
}

// "2514RW: testo della nota" -> usa quella commessa; altrimenti quella
// indicata in WHATSAPP_COMMESSA_DEFAULT_ID, o se anche questa manca la
// prima commessa attiva registrata (utile finché se ne segue una sola).
function risolviCommessa(testoGrezzo) {
  const match = testoGrezzo.match(/^\s*([A-Za-z0-9]+)\s*:\s*([\s\S]+)$/);
  if (match) {
    const commessa = db.prepare('SELECT * FROM commesse WHERE codice = ? COLLATE NOCASE').get(match[1]);
    if (commessa) return { commessa, testo: match[2].trim() };
  }
  const defaultId = process.env.WHATSAPP_COMMESSA_DEFAULT_ID;
  const commessa = defaultId
    ? db.prepare('SELECT * FROM commesse WHERE id = ?').get(defaultId)
    : db.prepare("SELECT * FROM commesse WHERE stato = 'attiva' ORDER BY id LIMIT 1").get();
  return { commessa, testo: testoGrezzo.trim() };
}

async function inviaRisposta(numeroDestinatario, testo) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return; // risposta di conferma facoltativa
  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: numeroDestinatario, text: { body: testo } }),
    });
  } catch (err) {
    logger.error('whatsapp: invio risposta fallito', { message: err.message });
  }
}

// Registra il testo come riga del Diario di Cantiere di oggi per la
// commessa risolta: accoda a una voce già esistente per lo stesso giorno
// (una voce per giornata, come nelle altre vie di inserimento) invece di
// crearne una nuova ogni volta.
function registraInDiario(commessa, testo) {
  const oggi = todayStr();
  const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const riga = `[${ora}] ${testo}`;
  const esistente = db.prepare('SELECT * FROM diario WHERE commessa_id = ? AND data = ?').get(commessa.id, oggi);
  if (esistente) {
    const nuovoTesto = esistente.attivita ? `${esistente.attivita}\n${riga}` : riga;
    db.prepare('UPDATE diario SET attivita = ?, updated_at = unixepoch() WHERE id = ?').run(nuovoTesto, esistente.id);
  } else {
    db.prepare('INSERT INTO diario (commessa_id, data, attivita) VALUES (?, ?, ?)').run(commessa.id, oggi, riga);
  }
  return oggi;
}

// Verifica dell'URL webhook richiesta da Meta una tantum, in fase di
// configurazione (Meta for Developers → WhatsApp → Configurazione).
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  // Meta ripete la consegna se non riceve 200 in fretta: si risponde
  // subito, il resto avviene "a cose fatte" senza bloccare la risposta.
  res.sendStatus(200);

  if (!firmaValida(req)) {
    logger.warn('whatsapp: firma non valida, richiesta ignorata');
    return;
  }

  const messaggio = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!messaggio) return; // conferma di consegna/lettura, non un messaggio nuovo
  if (messaggio.type !== 'text') {
    // foto/audio/altro: non gestiti in questa prima versione.
    if (numeroAutorizzato(messaggio.from)) {
      await inviaRisposta(messaggio.from, 'Per ora capisco solo i messaggi di testo: scrivimi la nota come testo.');
    }
    return;
  }

  const numeroMittente = messaggio.from;
  if (!numeroAutorizzato(numeroMittente)) {
    logger.warn('whatsapp: messaggio da numero non autorizzato', { numeroMittente });
    return;
  }

  const testoGrezzo = (messaggio.text?.body || '').trim();
  if (!testoGrezzo) return;

  const { commessa, testo } = risolviCommessa(testoGrezzo);
  if (!commessa || !testo) {
    await inviaRisposta(numeroMittente, 'Non trovo nessuna commessa su cui registrare la nota: specifica il codice, es. "2514RW: testo della nota".');
    return;
  }

  const oggi = registraInDiario(commessa, testo);
  const dataItaliana = oggi.split('-').reverse().join('/');
  await inviaRisposta(numeroMittente, `✓ Aggiunto al Diario di Cantiere ${commessa.codice} del ${dataItaliana}.`);
});

module.exports = router;
