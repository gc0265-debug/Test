const express = require('express');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');

const router = express.Router();

// anzianita_giorni: giorni dalla prima richiesta, calcolata fino a oggi se
// ancora aperta/parziale, fino alla data_decisione se decisa. oltre_21gg
// segue la regola del Registro Decisioni DL: pendenze oltre 21 giorni sono
// candidate a scrittura formale.
function arricchisci(row) {
  const fine = row.stato === 'decisa' && row.data_decisione ? row.data_decisione : todayStr();
  const anzianita_giorni = daysBetween(row.data_prima_richiesta, fine);
  const oltre_21gg = row.stato !== 'decisa' && anzianita_giorni > 21;
  return { ...row, anzianita_giorni, oltre_21gg };
}

router.get('/', (req, res) => {
  const { commessa_id, wp_id, stato, a_chi, search } = req.query;
  let sql = `
    SELECT d.*, w.codice AS wp_codice, w.nome AS wp_nome
    FROM decisioni d
    LEFT JOIN work_packages w ON d.wp_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (commessa_id) { sql += ' AND d.commessa_id = ?'; params.push(commessa_id); }
  if (wp_id) { sql += ' AND d.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND d.stato = ?'; params.push(stato); }
  if (a_chi) { sql += ' AND d.a_chi = ?'; params.push(a_chi); }
  if (search) { sql += ' AND (d.tema LIKE ? OR d.domanda_chiusa LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY (d.stato != \'decisa\') DESC, d.data_prima_richiesta ASC';

  const rows = db.prepare(sql).all(...params).map(arricchisci);
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM decisioni WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'decisione non trovata' });
  res.json(arricchisci(row));
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, tema, domanda_chiusa, a_chi, data_prima_richiesta, impatto_se_non_decisa,
          esito_ultima_riunione, data_decisione, stato, conferma_scritta, rif_conferma, n_riproposte, note } = req.body;
  if (!commessa_id || !tema || !domanda_chiusa) {
    return res.status(400).json({ error: 'commessa_id, tema e domanda_chiusa sono obbligatori' });
  }
  const result = db.prepare(`
    INSERT INTO decisioni (commessa_id, wp_id, tema, domanda_chiusa, a_chi, data_prima_richiesta, impatto_se_non_decisa,
      esito_ultima_riunione, data_decisione, stato, conferma_scritta, rif_conferma, n_riproposte, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, wp_id || null, tema, domanda_chiusa, a_chi || null, data_prima_richiesta || todayStr(),
    impatto_se_non_decisa || null, esito_ultima_riunione || null, data_decisione || null, stato || 'richiesta',
    conferma_scritta ? 1 : 0, rif_conferma || null, n_riproposte || 0, note || null
  );
  res.status(201).json(arricchisci(db.prepare('SELECT * FROM decisioni WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM decisioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'decisione non trovata' });
  const next = { ...existing, ...req.body };
  if (next.stato === 'decisa' && !next.data_decisione) next.data_decisione = todayStr();
  if (next.stato !== 'decisa') next.data_decisione = null;

  db.prepare(`
    UPDATE decisioni SET wp_id=?, tema=?, domanda_chiusa=?, a_chi=?, data_prima_richiesta=?, impatto_se_non_decisa=?,
      esito_ultima_riunione=?, data_decisione=?, stato=?, conferma_scritta=?, rif_conferma=?, n_riproposte=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.tema, next.domanda_chiusa, next.a_chi || null, next.data_prima_richiesta,
    next.impatto_se_non_decisa || null, next.esito_ultima_riunione || null, next.data_decisione || null, next.stato,
    next.conferma_scritta ? 1 : 0, next.rif_conferma || null, next.n_riproposte || 0, next.note || null,
    req.params.id
  );
  res.json(arricchisci(db.prepare('SELECT * FROM decisioni WHERE id = ?').get(req.params.id)));
});

// Rilancia una decisione ancora aperta: incrementa n_riproposte e azzera
// implicitamente l'anzianità mantenendo però la data originale a fini
// storici — equivalente a "sollecitata di nuovo oggi".
router.post('/:id/rilancia', (req, res) => {
  const existing = db.prepare('SELECT * FROM decisioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'decisione non trovata' });
  db.prepare('UPDATE decisioni SET n_riproposte = n_riproposte + 1, updated_at=unixepoch() WHERE id = ?').run(req.params.id);
  res.json(arricchisci(db.prepare('SELECT * FROM decisioni WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM decisioni WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'decisione non trovata' });
  res.status(204).end();
});

module.exports = router;
