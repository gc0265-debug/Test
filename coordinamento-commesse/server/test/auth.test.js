// Test di integrazione minimi su login e rate-limiting: niente ambizione
// di coprire tutto, solo smettere di affidarsi alla sola verifica manuale
// sui punti più delicati dal lato sicurezza. Usa un database SQLite
// temporaneo, separato da quello reale, via DATABASE_PATH.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmpDb = path.join(os.tmpdir(), `coord-test-auth-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.SESSION_SECRET = 'test-secret-non-usato-in-produzione';

const app = require('../index.js');
const db = require('../db/database');
const { hashPassword } = require('../utils/auth');

db.prepare('DELETE FROM users').run();
db.prepare(`
  INSERT INTO users (nome, email, password_hash, ruolo) VALUES (?, ?, ?, 'admin')
`).run('Utente di test', 'test@example.com', hashPassword('Password123!'));

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch (_) { /* già rimosso o mai creato */ }
  }
});

test('login con credenziali sbagliate risponde 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password-sbagliata' }),
  });
  assert.equal(res.status, 401);
});

test('login con credenziali corrette risponde 200 con l\'utente (senza password_hash)', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.email, 'test@example.com');
  assert.equal(body.password_hash, undefined);
});

test('troppi tentativi di login dallo stesso IP vengono bloccati (429)', async () => {
  let lastStatus = null;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'tentativo-sbagliato' }),
    });
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);
});
