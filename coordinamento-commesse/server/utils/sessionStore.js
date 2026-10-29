// Store di sessione su SQLite al posto del MemoryStore di default di
// express-session: così gli accessi sopravvivono a un riavvio o a un
// aggiornamento del server, e lo store è adatto alla produzione (il
// MemoryStore di default non lo è, ed express-session lo segnala).
// Riusa la stessa connessione better-sqlite3 del resto dell'app, invece
// di aggiungere una seconda libreria sqlite come dipendenza.

const session = require('express-session');
const db = require('../db/database');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

class SqliteSessionStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?');
    this.upsertStmt = db.prepare(`
      INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
    `);
    this.destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchExpiresStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.pruneStmt = db.prepare('DELETE FROM sessions WHERE expires < ?');

    this.pruneStmt.run(Date.now());
    const timer = setInterval(() => {
      try { this.pruneStmt.run(Date.now()); } catch (_) { /* pulizia best-effort */ }
    }, PRUNE_INTERVAL_MS);
    timer.unref();
  }

  expiresOf(sessionData) {
    const exp = sessionData.cookie && sessionData.cookie.expires;
    return exp ? new Date(exp).getTime() : Date.now() + DEFAULT_TTL_MS;
  }

  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) { this.destroyStmt.run(sid); return cb(null, null); }
      cb(null, JSON.parse(row.sess));
    } catch (err) { cb(err); }
  }

  set(sid, sessionData, cb) {
    try {
      this.upsertStmt.run(sid, JSON.stringify(sessionData), this.expiresOf(sessionData));
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }

  destroy(sid, cb) {
    try { this.destroyStmt.run(sid); cb && cb(null); } catch (err) { cb && cb(err); }
  }

  touch(sid, sessionData, cb) {
    try { this.touchExpiresStmt.run(this.expiresOf(sessionData), sid); cb && cb(null); } catch (err) { cb && cb(err); }
  }
}

module.exports = SqliteSessionStore;
