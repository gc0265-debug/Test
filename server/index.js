require('./db/migrations');

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/projects', require('./routes/projects'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
