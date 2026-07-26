require('./db/migrations');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/cantieri', require('./routes/cantieri'));
app.use('/api/wp', require('./routes/wp'));
app.use('/api/lavorazioni', require('./routes/lavorazioni'));
app.use('/api/giornale', require('./routes/giornale'));
app.use('/api/chiusura', require('./routes/chiusura'));
app.use('/api/maestranze', require('./routes/maestranze'));
app.use('/api/documenti', require('./routes/documenti'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/kpi', require('./routes/kpi'));
app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// Frontend statico + fallback SPA.
// Servito ogni volta che la build esiste, non solo con NODE_ENV=production:
// evita che il server risponda "Cannot GET /chiusura" quando la variabile
// d'ambiente non è impostata (Railway, avvii manuali, script di test).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Board Field Project running on port ${PORT}`));
