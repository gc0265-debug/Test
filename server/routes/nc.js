const express = require('express');
const db = require('../db/database');

const router = express.Router();

const STATI = ['aperta', 'in-lavorazione', 'chiusa'];

// GET /api/nc — elenco riferimenti NC, filtrabile per stato e cantiere
router.get('/', (req, res) => {
  const { stato, cantiere_id, search } = req.query;
  let sql = `
    SELECT nc.*, g.date, g.cantiere_id, c.title as cantiere_name
    FROM nc_riferimenti nc
    JOIN giornale g ON nc.giornale_id = g.id
    LEFT JOIN cantieri c ON g.cantiere_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (stato) { sql += ' AND nc.stato = ?'; params.push(stato); }
  if (cantiere_id) { sql += ' AND g.cantiere_id = ?'; params.push(cantiere_id); }
  if (search) {
    sql += ' AND (nc.descrizione LIKE ? OR nc.codice_nc LIKE ? OR nc.note LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY g.date DESC, nc.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

// PUT /api/nc/:id — aggiorna una NC (tipicamente per chiuderla)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM nc_riferimenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { codice_nc, link_esterno, descrizione, stato, note } = req.body;

  if (stato !== undefined && !STATI.includes(stato)) {
    return res.status(400).json({ error: `stato deve essere uno di: ${STATI.join(', ')}` });
  }

  db.prepare(`
    UPDATE nc_riferimenti
    SET codice_nc=?, link_esterno=?, descrizione=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    codice_nc !== undefined ? codice_nc : existing.codice_nc,
    link_esterno !== undefined ? link_esterno : existing.link_esterno,
    descrizione ?? existing.descrizione,
    stato ?? existing.stato,
    note !== undefined ? note : existing.note,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM nc_riferimenti WHERE id = ?').get(req.params.id));
});

module.exports = router;
