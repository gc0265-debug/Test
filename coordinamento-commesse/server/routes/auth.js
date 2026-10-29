const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { hashPassword, verifyPassword, requireAuth, requireAdmin } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// Al massimo 10 tentativi di login ogni 15 minuti per indirizzo IP: chiude
// la porta più ovvia a un attacco a forza bruta sulla password, senza
// intralciare un uso normale (anche con qualche errore di battitura).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso da questo indirizzo. Riprova tra qualche minuto.' },
  handler: (req, res, next, options) => {
    logger.warn('login rate-limited', { ip: req.ip, email: req.body?.email });
    res.status(options.statusCode).json(options.message);
  },
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email e password sono obbligatorie' });
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND attivo = 1').get(String(email).toLowerCase().trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    logger.warn('login fallito', { ip: req.ip, email: String(email).toLowerCase().trim() });
    return res.status(401).json({ error: 'credenziali non valide' });
  }
  req.session.user = publicUser(user);
  res.json(publicUser(user));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// ---- gestione utenti (solo admin) ----
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, nome, email, ruolo, attivo, created_at FROM users ORDER BY nome').all();
  res.json({ data: rows, total: rows.length });
});

router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { nome, email, password, ruolo } = req.body;
  if (!nome || !email || !password) return res.status(400).json({ error: 'nome, email e password sono obbligatori' });
  try {
    const result = db.prepare(`
      INSERT INTO users (nome, email, password_hash, ruolo) VALUES (?, ?, ?, ?)
    `).run(nome, String(email).toLowerCase().trim(), hashPassword(password), ruolo === 'admin' ? 'admin' : 'operatore');
    const row = db.prepare('SELECT id, nome, email, ruolo, attivo, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: 'esiste già un utente con questa email' });
    throw err;
  }
});

router.put('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'utente non trovato' });
  const { nome, email, password, ruolo, attivo } = req.body;
  const next = {
    nome: nome ?? existing.nome,
    email: email ? String(email).toLowerCase().trim() : existing.email,
    ruolo: ruolo === 'admin' ? 'admin' : (ruolo === 'operatore' ? 'operatore' : existing.ruolo),
    attivo: attivo === undefined ? existing.attivo : (attivo ? 1 : 0),
    password_hash: password ? hashPassword(password) : existing.password_hash,
  };
  try {
    db.prepare(`
      UPDATE users SET nome=?, email=?, ruolo=?, attivo=?, password_hash=?, updated_at=unixepoch() WHERE id=?
    `).run(next.nome, next.email, next.ruolo, next.attivo, next.password_hash, req.params.id);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: 'esiste già un utente con questa email' });
    throw err;
  }
  const row = db.prepare('SELECT id, nome, email, ruolo, attivo, created_at FROM users WHERE id = ?').get(req.params.id);
  // se l'utente ha modificato se stesso, aggiorna anche la sessione corrente
  if (req.user.id === Number(req.params.id)) req.session.user = { ...req.user, ...row };
  res.json(row);
});

router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'non puoi eliminare il tuo stesso utente' });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'utente non trovato' });
  const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE ruolo = 'admin' AND attivo = 1").get().n;
  if (target.ruolo === 'admin' && target.attivo && admins <= 1) {
    return res.status(400).json({ error: 'deve rimanere almeno un amministratore attivo' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
