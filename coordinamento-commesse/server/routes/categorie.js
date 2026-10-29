// Categorie — valori configurabili per le liste a tendina che non
// guidano logica applicativa (stakeholder_categoria, allert_perimetro,
// comunicazione_frequenza, requisiti_fase). Lettura per tutti gli
// utenti autenticati, scrittura riservata agli amministratori
// (guardia applicata in index.js con requireAdmin su scrittura).

const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { lista } = req.query;
  let sql = 'SELECT * FROM categorie WHERE 1=1';
  const params = [];
  if (lista) { sql += ' AND lista = ?'; params.push(lista); }
  sql += ' ORDER BY lista ASC, ordine ASC, id ASC';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post('/', requireAdmin, (req, res) => {
  const { lista, valore, etichetta, ordine } = req.body;
  if (!lista || !valore || !etichetta) return res.status(400).json({ error: 'lista, valore ed etichetta sono obbligatori' });
  try {
    const result = db.prepare(`
      INSERT INTO categorie (lista, valore, etichetta, ordine) VALUES (?, ?, ?, ?)
    `).run(lista, valore, etichetta, Number(ordine) || 0);
    res.status(201).json(db.prepare('SELECT * FROM categorie WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: 'esiste già un\'opzione con questo valore in questa lista' });
    throw err;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM categorie WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'opzione non trovata' });
  const next = { ...existing, ...req.body };
  try {
    db.prepare('UPDATE categorie SET valore=?, etichetta=?, ordine=? WHERE id=?')
      .run(next.valore, next.etichetta, Number(next.ordine) || 0, req.params.id);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: 'esiste già un\'opzione con questo valore in questa lista' });
    throw err;
  }
  res.json(db.prepare('SELECT * FROM categorie WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM categorie WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'opzione non trovata' });
  res.status(204).end();
});

module.exports = router;
