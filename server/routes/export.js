const express = require('express');
const db = require('../db/database');
const { oggi } = require('../services/tempo');

const router = express.Router();

// Tabelle esportabili. Elenco esplicito: il nome finisce dentro una query, quindi
// non può arrivare dall'utente.
const TABELLE = [
  'cantieri', 'work_packages', 'lavorazioni', 'giornale', 'presenze',
  'spese', 'materiali', 'nc_riferimenti', 'tempi_montaggio',
  'maestranze', 'documenti', 'archives',
];

function leggiTabella(nome) {
  return db.prepare(`SELECT * FROM ${nome}`).all();
}

// GET /api/export/backup.json — l'intero database in un file, da mettere su kDrive
router.get('/backup.json', (req, res) => {
  const dati = Object.fromEntries(TABELLE.map(t => [t, leggiTabella(t)]));
  const versione = db.prepare('SELECT MAX(version) as v FROM _schema_version').get()?.v || 0;

  const backup = {
    applicazione: 'BFP — Board Field Project',
    schema_versione: versione,
    esportato_il: new Date().toISOString(),
    conteggi: Object.fromEntries(TABELLE.map(t => [t, dati[t].length])),
    dati,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bfp-backup-${oggi()}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

function toCsv(righe) {
  if (righe.length === 0) return '';
  const colonne = Object.keys(righe[0]);
  const cella = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Separatore ";" e BOM: è quello che Excel in configurazione italiana apre
  // senza chiedere nulla.
  return '﻿' + [
    colonne.join(';'),
    ...righe.map(r => colonne.map(c => cella(r[c])).join(';')),
  ].join('\r\n');
}

// GET /api/export/:tabella.csv — una tabella per volta, leggibile in Excel
router.get('/:tabella.csv', (req, res) => {
  const { tabella } = req.params;
  if (!TABELLE.includes(tabella)) {
    return res.status(404).json({ error: `Tabella non esportabile: ${tabella}` });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bfp-${tabella}-${oggi()}.csv"`);
  res.send(toCsv(leggiTabella(tabella)));
});

// GET /api/export — cosa c'è da esportare, per costruire la pagina di backup
router.get('/', (req, res) => {
  res.json({
    tabelle: TABELLE.map(t => ({
      nome: t,
      righe: db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get().n,
    })),
  });
});

module.exports = router;
