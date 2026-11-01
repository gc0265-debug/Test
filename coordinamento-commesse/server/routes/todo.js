// To-do e note veloci sul Cruscotto: appunti personali rapidi, non un
// registro formale — niente storico/audit, niente Work Package. La
// scadenza è facoltativa e impostata a mano da chi scrive la nota.
const express = require('express');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { verificaVersione } = require('../utils/concorrenza');

const router = express.Router();

router.get('/', (req, res) => {
  let sql = `
    SELECT t.*, cm.codice AS commessa_codice
    FROM todo t
    LEFT JOIN commesse cm ON t.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 't.commessa_id');
  sql += ' ORDER BY t.fatto ASC, (t.scadenza IS NULL), t.scadenza ASC, t.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, testo, scadenza } = req.body;
  if (!commessa_id || !testo || !testo.trim()) return res.status(400).json({ error: 'commessa_id e testo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO todo (commessa_id, testo, scadenza, autore) VALUES (?, ?, ?, ?)
  `).run(commessa_id, testo.trim(), scadenza || null, req.user?.nome || null);
  res.status(201).json(db.prepare('SELECT * FROM todo WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM todo WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'nota non trovata' });
  if (!verificaVersione(req, res, existing)) return;
  const { testo, scadenza, fatto } = req.body;
  const next = {
    testo: testo !== undefined ? String(testo).trim() : existing.testo,
    scadenza: scadenza !== undefined ? (scadenza || null) : existing.scadenza,
    fatto: fatto !== undefined ? (fatto ? 1 : 0) : existing.fatto,
  };
  db.prepare(`
    UPDATE todo SET testo=?, scadenza=?, fatto=?, updated_at=unixepoch() WHERE id=?
  `).run(next.testo, next.scadenza, next.fatto, req.params.id);
  res.json(db.prepare('SELECT * FROM todo WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM todo WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'nota non trovata' });
  res.status(204).end();
});

module.exports = router;
