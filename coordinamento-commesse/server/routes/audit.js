// Storico modifiche — lettura: filtra per entità singola (usato dal
// pulsante "Storico" su una riga) o per commessa (usato dal Cruscotto
// per l'elenco "Attività recente").

const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { entity_type, entity_id, commessa_id, limit } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND entity_id = ?'; params.push(entity_id); }
  if (commessa_id) { sql += ' AND commessa_id = ?'; params.push(commessa_id); }
  sql += ' ORDER BY created_at DESC';
  const n = Number(limit);
  if (n > 0) sql += ` LIMIT ${n}`;

  res.json({ data: db.prepare(sql).all(...params) });
});

module.exports = router;
