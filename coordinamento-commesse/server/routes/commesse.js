const express = require('express');
const db = require('../db/database');

const router = express.Router();

// ---------- commesse ----------

router.get('/', (req, res) => {
  const { stato, search } = req.query;
  let sql = 'SELECT * FROM commesse WHERE 1=1';
  const params = [];
  if (stato) { sql += ' AND stato = ?'; params.push(stato); }
  if (search) {
    sql += ' AND (codice LIKE ? OR nome LIKE ? OR cliente LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM commesse WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'commessa non trovata' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { codice, nome, cliente, committente_finale, gc, dl, advisor, direttore_cantiere, data_apertura, stato, note } = req.body;
  if (!codice || !nome) return res.status(400).json({ error: 'codice e nome sono obbligatori' });

  try {
    const result = db.prepare(`
      INSERT INTO commesse (codice, nome, cliente, committente_finale, gc, dl, advisor, direttore_cantiere, data_apertura, stato, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codice, nome, cliente || null, committente_finale || null, gc || null, dl || null,
      advisor || null, direttore_cantiere || null, data_apertura || null, stato || 'attiva', note || null
    );
    const row = db.prepare('SELECT * FROM commesse WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `esiste già una commessa con codice "${codice}"` });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM commesse WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'commessa non trovata' });

  const fields = ['codice', 'nome', 'cliente', 'committente_finale', 'gc', 'dl', 'advisor', 'direttore_cantiere', 'data_apertura', 'stato', 'note'];
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE commesse SET codice=?, nome=?, cliente=?, committente_finale=?, gc=?, dl=?, advisor=?, direttore_cantiere=?, data_apertura=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(...fields.map(f => next[f] ?? null), req.params.id);

  res.json(db.prepare('SELECT * FROM commesse WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM commesse WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'commessa non trovata' });
  res.status(204).end();
});

// ---------- work package (sotto-risorsa di commessa) ----------

router.get('/:commessaId/wp', (req, res) => {
  const rows = db.prepare('SELECT * FROM work_packages WHERE commessa_id = ? ORDER BY ordine ASC, id ASC').all(req.params.commessaId);
  res.json({ data: rows, total: rows.length });
});

router.post('/:commessaId/wp', (req, res) => {
  const { codice, nome, pm_responsabile, ordine } = req.body;
  if (!codice || !nome) return res.status(400).json({ error: 'codice e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO work_packages (commessa_id, codice, nome, pm_responsabile, ordine)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.commessaId, codice, nome, pm_responsabile || null, ordine ?? 0);
  res.status(201).json(db.prepare('SELECT * FROM work_packages WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/wp/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM work_packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'work package non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE work_packages SET commessa_id=?, codice=?, nome=?, pm_responsabile=?, ordine=?, updated_at=unixepoch() WHERE id=?
  `).run(next.commessa_id, next.codice, next.nome, next.pm_responsabile, next.ordine, req.params.id);
  res.json(db.prepare('SELECT * FROM work_packages WHERE id = ?').get(req.params.id));
});

router.delete('/wp/:id', (req, res) => {
  const result = db.prepare('DELETE FROM work_packages WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'work package non trovato' });
  res.status(204).end();
});

module.exports = router;
