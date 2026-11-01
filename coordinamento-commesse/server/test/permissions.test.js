// Test del ruolo "cliente": sola lettura ovunque, e solo sulle sezioni
// esplicitamente concesse (chiuso per difetto su tutto il resto).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmpDb = path.join(os.tmpdir(), `coord-test-perm-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.SESSION_SECRET = 'test-secret-non-usato-in-produzione';

const app = require('../index.js');
const db = require('../db/database');
const { hashPassword } = require('../utils/auth');

db.prepare('DELETE FROM users').run();
db.prepare(`
  INSERT INTO users (nome, email, password_hash, ruolo) VALUES (?, ?, ?, 'operatore')
`).run('Operatore di test', 'operatore@example.com', hashPassword('Password123!'));
db.prepare(`
  INSERT INTO users (nome, email, password_hash, ruolo, sezioni_consentite)
  VALUES (?, ?, ?, 'cliente', ?)
`).run('Cliente di test', 'cliente@example.com', hashPassword('Password123!'), JSON.stringify(['timeline', 'approvazioni-drawings']));

const commessaId = db.prepare(`INSERT INTO commesse (codice, nome) VALUES ('TST', 'Commessa di test')`).run().lastInsertRowid;

// Righe per i test di ricerca cross-registro: una in una sezione concessa
// al cliente di test (timeline), una in una sezione non concessa (criticità).
db.prepare(`INSERT INTO milestone (commessa_id, titolo, data_inizio, data_fine, baseline_data_inizio, baseline_data_fine) VALUES (?, 'ParolaChiaveMilestoneTest', '2026-01-01', '2026-01-02', '2026-01-01', '2026-01-02')`).run(commessaId);
db.prepare(`INSERT INTO criticita (commessa_id, tema) VALUES (?, 'ParolaChiaveCriticitaTest')`).run(commessaId);

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch (_) { /* già rimosso o mai creato */ }
  }
});

async function loginCookie(email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `login fallito per ${email}`);
  return res.headers.get('set-cookie').split(';')[0];
}

test('cliente: una sezione concessa (timeline) risponde 200', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/milestone?commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
});

test('cliente: lavorazioni accessibile anche solo con "timeline" concessa (serve al Gantt)', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/lavorazioni?commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
});

test('cliente: una sezione NON concessa (criticità) risponde 403', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/criticita?commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 403);
});

test('cliente: qualunque scrittura è bloccata, anche su una sezione concessa', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/approvazioni-drawings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ commessa_id: commessaId, codice: 'AD-X', titolo: 'Test' }),
  });
  assert.equal(res.status, 403);
});

test('cliente: le rotte infrastrutturali (commesse) restano leggibili', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/commesse`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
});

test('operatore: non è soggetto a nessuna restrizione di sezione o di scrittura', async () => {
  const cookie = await loginCookie('operatore@example.com', 'Password123!');
  const getRes = await fetch(`${baseUrl}/api/criticita?commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(getRes.status, 200);
  const postRes = await fetch(`${baseUrl}/api/criticita`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ commessa_id: commessaId, tema: 'Test' }),
  });
  assert.equal(postRes.status, 201);
});

test('ricerca cross-registro: cliente trova solo i risultati delle sezioni concesse', async () => {
  const cookie = await loginCookie('cliente@example.com', 'Password123!');

  const resConcessa = await fetch(`${baseUrl}/api/ricerca?q=ParolaChiaveMilestoneTest&commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(resConcessa.status, 200);
  const bodyConcessa = await resConcessa.json();
  assert.equal(bodyConcessa.total, 1, 'la milestone (sezione timeline, concessa) deve comparire');
  assert.equal(bodyConcessa.data[0].tipo, 'milestone');

  const resNonConcessa = await fetch(`${baseUrl}/api/ricerca?q=ParolaChiaveCriticitaTest&commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(resNonConcessa.status, 200);
  const bodyNonConcessa = await resNonConcessa.json();
  assert.equal(bodyNonConcessa.total, 0, 'la criticità (sezione non concessa) non deve comparire, anche se il testo combacia');
});

test('ricerca cross-registro: operatore non ha restrizioni di sezione', async () => {
  const cookie = await loginCookie('operatore@example.com', 'Password123!');
  const res = await fetch(`${baseUrl}/api/ricerca?q=ParolaChiaveCriticitaTest&commessa_id=${commessaId}`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 1);
  assert.equal(body.data[0].tipo, 'criticita');
});
