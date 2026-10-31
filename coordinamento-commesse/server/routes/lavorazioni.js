const express = require('express');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

// Una lavorazione madre deve: esistere, appartenere alla stessa commessa,
// non essere la lavorazione stessa e non avere a sua volta una madre —
// la gerarchia resta volutamente a 2 livelli (lavorazione → sotto-attività),
// come nella Timeline "stile MPP" richiesta, senza scendere in alberi
// arbitrariamente profondi.
function validaParent(parentId, commessaId, ownId) {
  if (!parentId) return null;
  const parent = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(parentId);
  if (!parent) return 'lavorazione madre non trovata';
  if (parent.commessa_id !== Number(commessaId)) return 'la lavorazione madre deve appartenere alla stessa commessa';
  if (ownId && Number(parentId) === Number(ownId)) return 'una lavorazione non può essere madre di se stessa';
  if (parent.parent_id) return 'la lavorazione madre scelta è già una sotto-attività: la gerarchia è limitata a 2 livelli';
  return null;
}

router.get('/', (req, res) => {
  const { wp_id, stato, priorita, search } = req.query;
  let sql = `
    SELECT l.*, w.codice AS wp_codice, w.nome AS wp_nome, c.titolo AS contratto_titolo, c.controparte AS contratto_controparte,
           cm.codice AS commessa_codice, lp.titolo AS parent_titolo
    FROM lavorazioni l
    LEFT JOIN work_packages w ON l.wp_id = w.id
    LEFT JOIN contratti c ON l.contratto_id = c.id
    LEFT JOIN commesse cm ON l.commessa_id = cm.id
    LEFT JOIN lavorazioni lp ON l.parent_id = lp.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'l.commessa_id');
  if (wp_id) { sql += ' AND l.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND l.stato = ?'; params.push(stato); }
  if (priorita) { sql += ' AND l.priorita = ?'; params.push(priorita); }
  if (search) { sql += ' AND (l.titolo LIKE ? OR l.descrizione LIKE ? OR l.impresa LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY l.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, titolo, descrizione, stato, priorita, piano, zona, data_inizio, data_fine, impresa, contratto_id, parent_id } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const erroreParent = validaParent(parent_id, commessa_id, null);
  if (erroreParent) return res.status(400).json({ error: erroreParent });
  const result = db.prepare(`
    INSERT INTO lavorazioni (commessa_id, wp_id, titolo, descrizione, stato, priorita, piano, zona, data_inizio, data_fine, impresa, contratto_id, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, titolo, descrizione || null, stato || 'da-fare', priorita || 'media',
    piano || null, zona || null, data_inizio || null, data_fine || null, impresa || null, contratto_id || null, parent_id || null);
  res.status(201).json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'lavorazione non trovata' });
  const next = { ...existing, ...req.body };
  const erroreParent = validaParent(next.parent_id, existing.commessa_id, existing.id);
  if (erroreParent) return res.status(400).json({ error: erroreParent });
  // una lavorazione che ha già delle sotto-attività non può a sua volta
  // diventare sotto-attività di un'altra: manterrebbe comunque la
  // gerarchia a 2 livelli.
  if (next.parent_id) {
    const haFigli = db.prepare('SELECT COUNT(*) AS n FROM lavorazioni WHERE parent_id = ?').get(existing.id).n;
    if (haFigli > 0) return res.status(400).json({ error: 'questa lavorazione ha già delle sotto-attività: non può diventare a sua volta una sotto-attività' });
  }
  db.prepare(`
    UPDATE lavorazioni SET wp_id=?, titolo=?, descrizione=?, stato=?, priorita=?, piano=?, zona=?, data_inizio=?, data_fine=?, impresa=?, contratto_id=?, parent_id=?, updated_at=unixepoch() WHERE id=?
  `).run(
    next.wp_id || null, next.titolo, next.descrizione || null, next.stato, next.priorita,
    next.piano || null, next.zona || null, next.data_inizio || null, next.data_fine || null,
    next.impresa || null, next.contratto_id || null, next.parent_id || null, req.params.id
  );
  res.json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'lavorazione non trovata' });
  res.status(204).end();
});

module.exports = router;
