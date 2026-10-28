const express = require('express');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');

const router = express.Router();

// Arricchisce una riga con i campi calcolati usati dall'interfaccia:
// giorni_rimanenti (solo per urgenza='viola' con scadenza impostata) e
// scaduta (true se la scadenza è passata e la criticità è ancora aperta).
function arricchisci(row) {
  let giorni_rimanenti = null;
  let scaduta = false;
  if (row.urgenza === 'viola' && row.entro_quando && row.stato !== 'chiusa') {
    giorni_rimanenti = daysBetween(todayStr(), row.entro_quando);
    scaduta = giorni_rimanenti < 0;
  }
  return { ...row, giorni_rimanenti, scaduta };
}

router.get('/', (req, res) => {
  const { commessa_id, wp_id, stato, urgenza, search } = req.query;
  let sql = `
    SELECT c.*, w.codice AS wp_codice, w.nome AS wp_nome
    FROM criticita c
    LEFT JOIN work_packages w ON c.wp_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND c.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND c.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND c.stato = ?'; params.push(stato); }
  if (urgenza) { sql += ' AND c.urgenza = ?'; params.push(urgenza); }
  if (search) { sql += ' AND (c.tema LIKE ? OR c.cosa_serve LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY (c.urgenza = \'viola\') DESC, c.entro_quando ASC, c.created_at DESC';

  const rows = db.prepare(sql).all(...params).map(arricchisci);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM criticita WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'criticità non trovata' });
  res.json(arricchisci(row));
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, tema, cosa_serve, entro_quando, impatto_programma, destinatario, urgenza, stato, data_apertura, note } = req.body;
  if (!commessa_id || !tema) return res.status(400).json({ error: 'commessa_id e tema sono obbligatori' });
  if (urgenza === 'viola' && !entro_quando) return res.status(400).json({ error: 'una criticità "viola" richiede una scadenza (entro_quando)' });

  const result = db.prepare(`
    INSERT INTO criticita (commessa_id, wp_id, tema, cosa_serve, entro_quando, impatto_programma, destinatario, urgenza, stato, data_apertura, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, wp_id || null, tema, cosa_serve || null, entro_quando || null, impatto_programma || null,
    destinatario || null, urgenza || 'normale', stato || 'aperta', data_apertura || todayStr(), note || null
  );
  res.status(201).json(arricchisci(db.prepare('SELECT * FROM criticita WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM criticita WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'criticità non trovata' });
  const next = { ...existing, ...req.body };
  if (next.urgenza === 'viola' && !next.entro_quando) {
    return res.status(400).json({ error: 'una criticità "viola" richiede una scadenza (entro_quando)' });
  }
  // la chiusura imposta automaticamente la data di chiusura se non indicata
  if (next.stato === 'chiusa' && !next.data_chiusura) next.data_chiusura = todayStr();
  if (next.stato !== 'chiusa') next.data_chiusura = null;

  db.prepare(`
    UPDATE criticita SET wp_id=?, tema=?, cosa_serve=?, entro_quando=?, impatto_programma=?, destinatario=?,
      urgenza=?, stato=?, data_apertura=?, data_chiusura=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.tema, next.cosa_serve || null, next.entro_quando || null, next.impatto_programma || null,
    next.destinatario || null, next.urgenza, next.stato, next.data_apertura, next.data_chiusura || null, next.note || null,
    req.params.id
  );
  res.json(arricchisci(db.prepare('SELECT * FROM criticita WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM criticita WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'criticità non trovata' });
  res.status(204).end();
});

module.exports = router;
