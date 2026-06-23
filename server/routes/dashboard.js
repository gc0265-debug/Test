const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const counts = {
    cantieri: db.prepare("SELECT COUNT(*) as n FROM cantieri WHERE status = 'active'").get().n,
    lavorazioni: db.prepare("SELECT COUNT(*) as n FROM lavorazioni WHERE status = 'in-corso'").get().n,
    giornale_oggi: db.prepare("SELECT COUNT(*) as n FROM giornale WHERE date = ?").get(today).n,
    maestranze: db.prepare("SELECT COUNT(*) as n FROM maestranze WHERE status = 'attivo'").get().n,
    documenti: db.prepare('SELECT COUNT(*) as n FROM documenti').get().n,
    archives: db.prepare('SELECT COUNT(*) as n FROM archives').get().n,
  };

  const recentLavorazioni = db.prepare(`
    SELECT l.*, c.title as cantiere_name
    FROM lavorazioni l
    LEFT JOIN cantieri c ON l.cantiere_id = c.id
    WHERE l.status IN ('in-corso','da-fare')
    ORDER BY l.created_at DESC
    LIMIT 5
  `).all();

  const recentLogs = db.prepare(`
    SELECT g.*, c.title as cantiere_name,
           (c.title || ' — ' || g.date) as title
    FROM giornale g
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    ORDER BY g.date DESC, g.created_at DESC
    LIMIT 5
  `).all();

  res.json({ counts, recentLavorazioni, recentLogs });
});

module.exports = router;
