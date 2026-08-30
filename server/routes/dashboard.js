const express = require('express');
const db = require('../db/database');
const { oggi } = require('../services/tempo');

const router = express.Router();

router.get('/', (req, res) => {
  const today = oggi();

  const counts = {
    cantieri: db.prepare("SELECT COUNT(*) as n FROM cantieri WHERE status = 'active'").get().n,
    wp_attivi: db.prepare("SELECT COUNT(*) as n FROM work_packages WHERE status = 'attivo'").get().n,
    lavorazioni: db.prepare("SELECT COUNT(*) as n FROM lavorazioni WHERE status = 'in-corso'").get().n,
    presenze_oggi: db.prepare("SELECT COUNT(*) as n FROM presenze p JOIN giornale g ON p.giornale_id = g.id WHERE g.date = ?").get(today).n,
    nc_aperte: db.prepare("SELECT COUNT(*) as n FROM nc_riferimenti WHERE stato IN ('aperta','in-lavorazione')").get().n,
    chiusura_oggi: db.prepare("SELECT COUNT(*) as n FROM giornale WHERE date = ?").get(today).n,
    tempi_campioni: db.prepare("SELECT COUNT(*) as n FROM tempi_montaggio").get().n,
    archives: db.prepare('SELECT COUNT(*) as n FROM archives').get().n,
  };

  const recentChiusure = db.prepare(`
    SELECT g.*, c.title as cantiere_name,
      (SELECT COUNT(*) FROM presenze p WHERE p.giornale_id = g.id) as n_presenze,
      (SELECT COUNT(*) FROM nc_riferimenti nc WHERE nc.giornale_id = g.id) as n_nc
    FROM giornale g
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    ORDER BY g.date DESC, g.created_at DESC
    LIMIT 5
  `).all();

  const ncAperte = db.prepare(`
    SELECT nc.*, g.date, g.cantiere_id, c.title as cantiere_name
    FROM nc_riferimenti nc
    JOIN giornale g ON nc.giornale_id = g.id
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    WHERE nc.stato IN ('aperta','in-lavorazione')
    ORDER BY nc.created_at DESC
    LIMIT 5
  `).all();

  res.json({ counts, recentChiusure, ncAperte });
});

module.exports = router;
