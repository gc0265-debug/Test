// Test di integrazione minimi sul webhook WhatsApp: verifica dell'URL,
// firma HMAC, numeri autorizzati, e registrazione effettiva della nota
// nel Diario di Cantiere. Database SQLite temporaneo, separato da quello
// reale, via DATABASE_PATH (stesso pattern di auth.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const tmpDb = path.join(os.tmpdir(), `coord-test-whatsapp-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.SESSION_SECRET = 'test-secret-non-usato-in-produzione';
process.env.WHATSAPP_VERIFY_TOKEN = 'token-di-prova';
process.env.WHATSAPP_APP_SECRET = 'app-secret-di-prova';
process.env.WHATSAPP_NUMERI_AUTORIZZATI = '393331234567';

const app = require('../index.js');
const db = require('../db/database');

db.prepare('DELETE FROM diario').run();
db.prepare('DELETE FROM commesse').run();
db.prepare(`
  INSERT INTO commesse (id, codice, nome, stato) VALUES (1, '2514RW', 'Hotel Rosewood Roma', 'attiva')
`).run();

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch (_) { /* già rimosso o mai creato */ }
  }
});

function firma(corpo) {
  return 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(corpo).digest('hex');
}

function payloadMessaggio(from, testo) {
  return JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body: testo } }] } }] }],
  });
}

test('verifica webhook: token corretto risponde con la challenge', async () => {
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=token-di-prova&hub.challenge=abc123`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'abc123');
});

test('verifica webhook: token sbagliato risponde 403', async () => {
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=sbagliato&hub.challenge=abc123`);
  assert.equal(res.status, 403);
});

test('messaggio con firma non valida non scrive nel diario', async () => {
  const corpo = payloadMessaggio('393331234567', '2514RW: nota con firma sbagliata');
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=firmaNonValida' },
    body: corpo,
  });
  assert.equal(res.status, 200); // sempre 200 verso Meta, anche se scartato
  const riga = db.prepare('SELECT * FROM diario WHERE commessa_id = 1').get();
  assert.equal(riga, undefined);
});

test('messaggio da numero non autorizzato non scrive nel diario', async () => {
  const corpo = payloadMessaggio('390000000000', '2514RW: nota da numero non autorizzato');
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma(corpo) },
    body: corpo,
  });
  assert.equal(res.status, 200);
  const riga = db.prepare('SELECT * FROM diario WHERE commessa_id = 1').get();
  assert.equal(riga, undefined);
});

test('messaggio valido con codice commessa crea la voce di diario', async () => {
  const corpo = payloadMessaggio('393331234567', '2514RW: oggi completato il montaggio del corridoio P+4');
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma(corpo) },
    body: corpo,
  });
  assert.equal(res.status, 200);
  const riga = db.prepare('SELECT * FROM diario WHERE commessa_id = 1').get();
  assert.ok(riga);
  assert.match(riga.attivita, /oggi completato il montaggio del corridoio P\+4/);
});

test('un secondo messaggio nello stesso giorno si accoda alla stessa voce', async () => {
  const corpo = payloadMessaggio('393331234567', '2514RW: arrivato il materiale per il bar');
  await fetch(`${baseUrl}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma(corpo) },
    body: corpo,
  });
  const righe = db.prepare('SELECT * FROM diario WHERE commessa_id = 1').all();
  assert.equal(righe.length, 1); // ancora una sola voce per oggi
  assert.match(righe[0].attivita, /corridoio P\+4/);
  assert.match(righe[0].attivita, /arrivato il materiale per il bar/);
});
