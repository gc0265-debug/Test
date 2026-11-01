// Dipendenze fra attività della Timeline (milestone e/o lavorazioni),
// sempre Fine-Inizio con un ritardo/anticipo opzionale in giorni — vedi
// server/utils/scheduling.js per il calcolo di percorso critico e
// conflitti fra date reali e vincoli dichiarati.

const express = require('express');
const db = require('../db/database');
const { caricaGrafo, creerebbeCiclo, calcolaSchedulazione, chiave } = require('../utils/scheduling');

const router = express.Router();

const TIPI_VALIDI = ['milestone', 'lavorazione'];

router.get('/', (req, res) => {
  const { commessa_id } = req.query;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  const { archi } = calcolaSchedulazione(commessa_id);
  res.json({ data: archi, total: archi.length });
});

router.post('/', (req, res) => {
  const { commessa_id, pred_tipo, pred_id, succ_tipo, succ_id, ritardo_giorni } = req.body;
  if (!commessa_id || !pred_tipo || !pred_id || !succ_tipo || !succ_id) {
    return res.status(400).json({ error: 'commessa_id, predecessore e successore sono obbligatori' });
  }
  if (!TIPI_VALIDI.includes(pred_tipo) || !TIPI_VALIDI.includes(succ_tipo)) {
    return res.status(400).json({ error: 'tipo attività non valido' });
  }
  if (pred_tipo === succ_tipo && String(pred_id) === String(succ_id)) {
    return res.status(400).json({ error: 'un\'attività non può dipendere da se stessa' });
  }

  const { archi } = caricaGrafo(commessa_id);
  const predKey = chiave(pred_tipo, pred_id);
  const succKey = chiave(succ_tipo, succ_id);
  if (creerebbeCiclo(archi, predKey, succKey)) {
    return res.status(409).json({ error: 'questo collegamento creerebbe un ciclo di dipendenze (la successora risulta già, anche indirettamente, un predecessore)' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO timeline_dipendenze (commessa_id, pred_tipo, pred_id, succ_tipo, succ_id, ritardo_giorni)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commessa_id, pred_tipo, pred_id, succ_tipo, succ_id, Number(ritardo_giorni) || 0);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'questo collegamento esiste già' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM timeline_dipendenze WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'collegamento non trovato' });
  res.status(204).end();
});

module.exports = router;
