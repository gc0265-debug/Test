// Verifica che le migrazioni additive (ensureColumns in db/database.js)
// siano davvero idempotenti: eseguirle due volte sullo stesso database
// non deve generare errori "duplicate column name".

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

test('ensureColumns non fallisce se eseguita due volte sullo stesso database', () => {
  const tmpDb = path.join(os.tmpdir(), `coord-test-migrate-${process.pid}-${Date.now()}.db`);
  process.env.DATABASE_PATH = tmpDb;

  const dbModulePath = require.resolve('../db/database');
  delete require.cache[dbModulePath];
  assert.doesNotThrow(() => require('../db/database'), 'primo avvio: crea schema e colonne aggiuntive');

  delete require.cache[dbModulePath];
  assert.doesNotThrow(() => require('../db/database'), 'secondo avvio sullo stesso file: non deve rilanciare ALTER TABLE già applicati');

  const db = require('../db/database');
  const colonne = db.prepare("PRAGMA table_info(documenti)").all().map((c) => c.name);
  assert.ok(colonne.includes('file_nome'), 'la colonna aggiunta via ensureColumns deve esistere');

  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch (_) { /* già rimosso o mai creato */ }
  }
});
