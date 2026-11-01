// Test di integrazione minimi sulla policy password e sull'MFA TOTP
// (login/mfa/setup/verifica/disattiva). Processo separato dagli altri file
// di test: ha un proprio rate-limiter e un proprio database temporaneo.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { authenticator } = require('otplib');

const tmpDb = path.join(os.tmpdir(), `coord-test-mfa-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.SESSION_SECRET = 'test-secret-non-usato-in-produzione';

const app = require('../index.js');
const db = require('../db/database');
const { hashPassword } = require('../utils/auth');

db.prepare('DELETE FROM users').run();
db.prepare(`
  INSERT INTO users (nome, email, password_hash, ruolo) VALUES (?, ?, ?, 'admin')
`).run('Utente di test', 'mfa@example.com', hashPassword('Password123!'));

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch (_) { /* già rimosso o mai creato */ }
  }
});

// Mini client con gestione cookie di sessione, condiviso fra i test di
// questo file (che devono restare in ordine: login → setup → verifica…).
let cookie = '';
async function call(pathname, opts = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let body = null;
  try { body = await res.json(); } catch (_) { /* es. 204 */ }
  return { status: res.status, body };
}

test('login amministratore', async () => {
  const r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'mfa@example.com', password: 'Password123!' }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.mfa_richiesta, undefined);
});

test('creazione utente con password debole viene rifiutata (policy minima)', async () => {
  const r = await call('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({ nome: 'Debole', email: 'debole@example.com', password: 'abc123', ruolo: 'operatore' }),
  });
  assert.equal(r.status, 400);
});

test('creazione utente con password conforme alla policy va a buon fine', async () => {
  const r = await call('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({ nome: 'Forte', email: 'forte@example.com', password: 'Abcdefgh12', ruolo: 'operatore' }),
  });
  assert.equal(r.status, 201);
});

let secretMfa = null;

test('mfa/setup restituisce un secret e un QR, senza ancora attivare l\'MFA', async () => {
  const r = await call('/api/auth/mfa/setup', { method: 'POST', body: '{}' });
  assert.equal(r.status, 200);
  assert.ok(r.body.secret);
  assert.ok(r.body.qr.startsWith('data:image'));
  secretMfa = r.body.secret;
});

test('mfa/verifica con codice errato viene rifiutata', async () => {
  const r = await call('/api/auth/mfa/verifica', { method: 'POST', body: JSON.stringify({ codice: '000000' }) });
  assert.equal(r.status, 400);
});

test('mfa/verifica con codice corretto attiva l\'MFA e non espone il secret su /me', async () => {
  const r = await call('/api/auth/mfa/verifica', { method: 'POST', body: JSON.stringify({ codice: authenticator.generate(secretMfa) }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.mfa_enabled, true);
  const me = await call('/api/auth/me');
  assert.equal(me.body.mfa_enabled, 1);
  assert.equal(me.body.mfa_secret, undefined);
});

test('dopo l\'attivazione, il login richiede il secondo passaggio e non apre subito la sessione', async () => {
  await call('/api/auth/logout', { method: 'POST' });
  cookie = '';
  const r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'mfa@example.com', password: 'Password123!' }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.mfa_richiesta, true);
  const me = await call('/api/auth/me');
  assert.equal(me.status, 401);
});

test('login/mfa con codice errato viene rifiutato, con codice corretto completa l\'accesso', async () => {
  const errato = await call('/api/auth/login/mfa', { method: 'POST', body: JSON.stringify({ codice: '000000' }) });
  assert.equal(errato.status, 401);
  const corretto = await call('/api/auth/login/mfa', { method: 'POST', body: JSON.stringify({ codice: authenticator.generate(secretMfa) }) });
  assert.equal(corretto.status, 200);
  assert.equal(corretto.body.email, 'mfa@example.com');
});

test('mfa/disattiva richiede la password corretta', async () => {
  const errata = await call('/api/auth/mfa/disattiva', { method: 'POST', body: JSON.stringify({ password: 'sbagliata' }) });
  assert.equal(errata.status, 401);
  const corretta = await call('/api/auth/mfa/disattiva', { method: 'POST', body: JSON.stringify({ password: 'Password123!' }) });
  assert.equal(corretta.status, 200);
  assert.equal(corretta.body.mfa_enabled, false);
});
