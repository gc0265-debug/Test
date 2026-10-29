const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// Protegge le rotte API: richiede una sessione autenticata.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'sessione non autenticata' });
  }
  req.user = req.session.user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.ruolo !== 'admin') {
    return res.status(403).json({ error: 'richiesti permessi di amministratore' });
  }
  next();
}

// Un utente "cliente" vede solo le sezioni elencate in sezioni_consentite
// (JSON array sulla riga users), salvate così sulla sessione dal login.
function parseSezioni(raw) {
  if (!raw) return [];
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

// Protegge una rotta per gli utenti cliente: admin e operatore passano
// sempre, un cliente solo se almeno una delle sezioni indicate è fra
// quelle a cui è stato dato accesso (es. i dati delle lavorazioni
// servono sia alla sezione "lavorazioni" che alla "timeline").
function requireSection(...sectionKeys) {
  return (req, res, next) => {
    if (!req.user || req.user.ruolo !== 'cliente') return next();
    const consentite = parseSezioni(req.user.sezioni_consentite);
    if (sectionKeys.some((k) => consentite.includes(k))) return next();
    return res.status(403).json({ error: 'non hai accesso a questa sezione' });
  };
}

// Un cliente ha sempre accesso in sola lettura: qualunque scrittura è
// bloccata qui, indipendentemente dalla sezione — difesa aggiuntiva
// anche sulle rotte non coperte da requireSection (es. commesse).
function blockWriteForCliente(req, res, next) {
  if (req.user && req.user.ruolo === 'cliente' && req.method !== 'GET') {
    return res.status(403).json({ error: 'il tuo account ha accesso in sola lettura' });
  }
  next();
}

module.exports = {
  hashPassword, verifyPassword, requireAuth, requireAdmin,
  parseSezioni, requireSection, blockWriteForCliente,
};
