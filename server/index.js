require('./db/migrations');

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/cantieri', require('./routes/cantieri'));
app.use('/api/lavorazioni', require('./routes/lavorazioni'));
app.use('/api/giornale', require('./routes/giornale'));
app.use('/api/maestranze', require('./routes/maestranze'));
app.use('/api/documenti', require('./routes/documenti'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Board Field Project server running on port ${PORT}`));
