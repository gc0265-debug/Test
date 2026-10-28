const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db/database'); // crea lo schema se non esiste
require('./db/seed');     // popola solo se il database è vuoto

const commesseRouter = require('./routes/commesse');
const criticitaRouter = require('./routes/criticita');
const decisioniRouter = require('./routes/decisioni');
const noteCoordinamentoRouter = require('./routes/noteCoordinamento');
const diarioRouter = require('./routes/diario');
const lavorazioniRouter = require('./routes/lavorazioni');
const maestranzeRouter = require('./routes/maestranze');
const documentiRouter = require('./routes/documenti');
const dashboardRouter = require('./routes/dashboard');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/commesse', commesseRouter);
app.use('/api/criticita', criticitaRouter);
app.use('/api/decisioni', decisioniRouter);
app.use('/api/note-coordinamento', noteCoordinamentoRouter);
app.use('/api/diario', diarioRouter);
app.use('/api/lavorazioni', lavorazioniRouter);
app.use('/api/maestranze', maestranzeRouter);
app.use('/api/documenti', documentiRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// client statico — nessun build step, serviti così come sono
app.use(express.static(path.join(__dirname, '..', 'client')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// error handler — ultima risorsa, non deve mai far cadere il processo
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'errore interno del server' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Coordinamento Commesse — running on port ${PORT}`));
