const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

require('./db/database'); // crea lo schema se non esiste
require('./db/seed');     // popola solo se il database è vuoto

const { requireAuth, requireAdmin } = require('./utils/auth');
const SqliteSessionStore = require('./utils/sessionStore');
const logger = require('./utils/logger');

const authRouter = require('./routes/auth');
const commesseRouter = require('./routes/commesse');
const criticitaRouter = require('./routes/criticita');
const decisioniRouter = require('./routes/decisioni');
const noteCoordinamentoRouter = require('./routes/noteCoordinamento');
const diarioRouter = require('./routes/diario');
const lavorazioniRouter = require('./routes/lavorazioni');
const maestranzeRouter = require('./routes/maestranze');
const documentiRouter = require('./routes/documenti');
const dashboardRouter = require('./routes/dashboard');
const allertRouter = require('./routes/allert');
const auditRouter = require('./routes/audit');
const exportRouter = require('./routes/export');
const milestoneRouter = require('./routes/milestone');
const lezioniApprese = require('./routes/lezioniApprese');
const requisitiRouter = require('./routes/requisiti');
const capitolatoRouter = require('./routes/capitolato');
const contrattiRouter = require('./routes/contratti');
const stakeholderRouter = require('./routes/stakeholder');
const comunicazioneRouter = require('./routes/comunicazione');
const categorieRouter = require('./routes/categorie');
const finanziariaRouter = require('./routes/finanziaria');
const approvazioniDrawingsRouter = require('./routes/approvazioniDrawings');

// Il secret firma i cookie di sessione: deve restare lo stesso tra un
// riavvio e l'altro, altrimenti ogni riavvio invaliderebbe tutte le
// sessioni salvate — vanificando il punto di averle persistenti su
// SQLite. Se non è impostata una variabile d'ambiente, viene generato
// una sola volta e salvato in un file escluso da git.
function getOrCreateSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretPath = path.join(__dirname, '.session-secret');
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, 'utf8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:'],
      'script-src': ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(session({
  store: new SqliteSessionStore(),
  secret: getOrCreateSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

// tutto il resto delle API richiede una sessione autenticata
app.use('/api/commesse', requireAuth, commesseRouter);
app.use('/api/criticita', requireAuth, criticitaRouter);
app.use('/api/decisioni', requireAuth, decisioniRouter);
app.use('/api/note-coordinamento', requireAuth, noteCoordinamentoRouter);
app.use('/api/diario', requireAuth, diarioRouter);
app.use('/api/lavorazioni', requireAuth, lavorazioniRouter);
app.use('/api/maestranze', requireAuth, maestranzeRouter);
app.use('/api/documenti', requireAuth, documentiRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/allert', requireAuth, allertRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/milestone', requireAuth, milestoneRouter);
app.use('/api/lezioni-apprese', requireAuth, lezioniApprese);
app.use('/api/requisiti', requireAuth, requisitiRouter);
app.use('/api/capitolato', requireAuth, capitolatoRouter);
app.use('/api/contratti', requireAuth, contrattiRouter);
app.use('/api/stakeholder', requireAuth, stakeholderRouter);
app.use('/api/comunicazione', requireAuth, comunicazioneRouter);
app.use('/api/categorie', requireAuth, categorieRouter);
app.use('/api/finanziaria', requireAuth, requireAdmin, finanziariaRouter);
app.use('/api/approvazioni-drawings', requireAuth, approvazioniDrawingsRouter);

// client statico — nessun build step, serviti così come sono
app.use(express.static(path.join(__dirname, '..', 'client')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// error handler — ultima risorsa, non deve mai far cadere il processo
app.use((err, req, res, next) => {
  console.error(err);
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({ error: 'errore interno del server' });
});

const PORT = process.env.PORT || 3002;
// avvia il server solo quando il file viene eseguito direttamente (node
// index.js / npm start) — non quando viene richiesto dai test, che hanno
// bisogno dell'app Express senza che si metta in ascolto da sola.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Coordinamento Commesse — running on port ${PORT}`));
}
module.exports = app;
