const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/kpi/tempi — tempi medi per tipo arredo (skill estimate)
router.get('/tempi', (req, res) => {
  const { tipo_arredo } = req.query;
  let sql = `
    SELECT
      tipo_arredo,
      COUNT(*) as campioni,
      SUM(quantita) as totale_pezzi,
      ROUND(AVG(CAST(durata_minuti AS REAL) / quantita), 1) as minuti_per_pezzo,
      MIN(CAST(durata_minuti AS REAL) / quantita) as min_minuti,
      MAX(CAST(durata_minuti AS REAL) / quantita) as max_minuti
    FROM tempi_montaggio
    WHERE 1=1
  `;
  const params = [];
  if (tipo_arredo) { sql += ' AND tipo_arredo LIKE ?'; params.push(`%${tipo_arredo}%`); }
  sql += ' GROUP BY tipo_arredo ORDER BY campioni DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

// GET /api/kpi/tempi/dettaglio — lista grezza per tipo arredo
router.get('/tempi/dettaglio', (req, res) => {
  const { tipo_arredo } = req.query;
  if (!tipo_arredo) return res.status(400).json({ error: 'tipo_arredo richiesto' });
  const rows = db.prepare(`
    SELECT t.*, g.date, g.cantiere_id, c.title as cantiere_name, l.title as lavorazione_name
    FROM tempi_montaggio t
    LEFT JOIN giornale g ON t.giornale_id = g.id
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    LEFT JOIN lavorazioni l ON t.lavorazione_id = l.id
    WHERE t.tipo_arredo LIKE ?
    ORDER BY g.date DESC
  `).all(`%${tipo_arredo}%`);
  res.json({ data: rows });
});

module.exports = router;
