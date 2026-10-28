const express = require('express');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');

const router = express.Router();

function parseRow(row) {
  return { ...row, punti: JSON.parse(row.punti_json || '[]') };
}

router.get('/', (req, res) => {
  const { commessa_id } = req.query;
  let sql = 'SELECT * FROM note_coordinamento WHERE 1=1';
  const params = [];
  if (commessa_id) { sql += ' AND commessa_id = ?'; params.push(commessa_id); }
  sql += ' ORDER BY data DESC, created_at DESC';
  res.json({ data: db.prepare(sql).all(...params).map(parseRow), total: 0 });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM note_coordinamento WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'nota non trovata' });
  res.json(parseRow(row));
});

// Genera una bozza di nota numerando le criticità attualmente aperte della
// commessa (filtrabili per wp_id), nello stesso formato della Nota di
// Coordinamento ATI: un punto per criticità, con WP e stato.
router.post('/genera-bozza', (req, res) => {
  const { commessa_id, wp_id, destinatari, per_conoscenza, oggetto } = req.body;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id è obbligatorio' });

  let sql = `
    SELECT c.*, w.codice AS wp_codice, w.nome AS wp_nome
    FROM criticita c LEFT JOIN work_packages w ON c.wp_id = w.id
    WHERE c.commessa_id = ? AND c.stato != 'chiusa'
  `;
  const params = [commessa_id];
  if (wp_id) { sql += ' AND c.wp_id = ?'; params.push(wp_id); }
  sql += ' ORDER BY w.ordine ASC, (c.urgenza = \'viola\') DESC, c.entro_quando ASC';

  const aperte = db.prepare(sql).all(...params);
  const punti = aperte.map((c) => ({
    wp: c.wp_codice ? `${c.wp_codice} ${c.wp_nome}` : null,
    tema: c.tema,
    testo: c.cosa_serve || c.impatto_programma || '',
    stato: c.urgenza === 'viola'
      ? `Urgente — risposta entro ${c.entro_quando || 'da definire'}`
      : (c.stato === 'in-attesa' ? 'In attesa di riscontro' : 'Aperto'),
  }));

  const result = db.prepare(`
    INSERT INTO note_coordinamento (commessa_id, data, oggetto, destinatari, per_conoscenza, punti_json, stato)
    VALUES (?, ?, ?, ?, ?, ?, 'bozza')
  `).run(
    commessa_id, todayStr(), oggetto || 'Punti aperti per il coordinamento', destinatari || null,
    per_conoscenza || null, JSON.stringify(punti)
  );
  res.status(201).json(parseRow(db.prepare('SELECT * FROM note_coordinamento WHERE id = ?').get(result.lastInsertRowid)));
});

router.post('/', (req, res) => {
  const { commessa_id, data, oggetto, destinatari, per_conoscenza, punti, stato } = req.body;
  if (!commessa_id || !oggetto) return res.status(400).json({ error: 'commessa_id e oggetto sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO note_coordinamento (commessa_id, data, oggetto, destinatari, per_conoscenza, punti_json, stato)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, data || todayStr(), oggetto, destinatari || null, per_conoscenza || null, JSON.stringify(punti || []), stato || 'bozza');
  res.status(201).json(parseRow(db.prepare('SELECT * FROM note_coordinamento WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM note_coordinamento WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'nota non trovata' });
  const next = { ...existing, ...req.body };
  const punti = req.body.punti !== undefined ? req.body.punti : JSON.parse(existing.punti_json);
  db.prepare(`
    UPDATE note_coordinamento SET data=?, oggetto=?, destinatari=?, per_conoscenza=?, punti_json=?, stato=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.data, next.oggetto, next.destinatari || null, next.per_conoscenza || null, JSON.stringify(punti), next.stato, req.params.id);
  res.json(parseRow(db.prepare('SELECT * FROM note_coordinamento WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM note_coordinamento WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'nota non trovata' });
  res.status(204).end();
});

module.exports = router;
