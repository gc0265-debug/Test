// Cartelle dei Documenti, nidificabili a piacere. Lo schema le tiene come
// un albero (parent_id), qui si verifica solo che spostare o creare una
// cartella non chiuda un ciclo (una cartella non può finire dentro una
// propria sotto-cartella) e che non si elimini una cartella non vuota
// senza prima spostarne o cancellarne il contenuto — nessuna perdita di
// dati nascosta dietro un'eliminazione.

const express = require('express');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM cartelle_documenti WHERE 1=1';
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'commessa_id');
  sql += ' ORDER BY nome COLLATE NOCASE';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

// Percorre gli antenati di una cartella (tramite parent_id) finché non
// trova quella cercata o esaurisce la catena: usato sia per impedire i
// cicli sia per calcolare il breadcrumb lato server quando serve.
function raggiungibile(partenzaId, obiettivoId) {
  let cur = partenzaId;
  const visti = new Set();
  while (cur != null) {
    if (Number(cur) === Number(obiettivoId)) return true;
    if (visti.has(cur)) return false; // dato corrotto a monte: meglio fermarsi che girare in loop
    visti.add(cur);
    const row = db.prepare('SELECT parent_id FROM cartelle_documenti WHERE id = ?').get(cur);
    cur = row ? row.parent_id : null;
  }
  return false;
}

router.post('/', (req, res) => {
  const { commessa_id, nome, parent_id } = req.body;
  if (!commessa_id || !nome || !nome.trim()) {
    return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  }
  if (parent_id) {
    const parent = db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(parent_id);
    if (!parent || parent.commessa_id !== Number(commessa_id)) {
      return res.status(400).json({ error: 'cartella superiore non valida' });
    }
  }
  const result = db.prepare(`
    INSERT INTO cartelle_documenti (commessa_id, parent_id, nome) VALUES (?, ?, ?)
  `).run(commessa_id, parent_id || null, nome.trim());
  res.status(201).json(db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'cartella non trovata' });
  const { nome, parent_id } = req.body;

  let nextParent = parent_id === undefined ? existing.parent_id : (parent_id || null);
  if (nextParent !== null) {
    if (Number(nextParent) === existing.id) {
      return res.status(400).json({ error: 'una cartella non può essere spostata dentro se stessa' });
    }
    const parent = db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(nextParent);
    if (!parent || parent.commessa_id !== existing.commessa_id) {
      return res.status(400).json({ error: 'cartella superiore non valida' });
    }
    // se la nuova cartella superiore è raggiungibile risalendo da se stessa fino a "existing",
    // significa che existing è un suo antenato: spostarcela dentro chiuderebbe un ciclo.
    if (raggiungibile(nextParent, existing.id)) {
      return res.status(409).json({ error: 'non puoi spostare una cartella dentro una sua sotto-cartella' });
    }
  }

  db.prepare('UPDATE cartelle_documenti SET nome=?, parent_id=?, updated_at=unixepoch() WHERE id=?')
    .run(nome !== undefined ? nome.trim() : existing.nome, nextParent, req.params.id);
  res.json(db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cartelle_documenti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'cartella non trovata' });
  const sottocartelle = db.prepare('SELECT COUNT(*) AS n FROM cartelle_documenti WHERE parent_id = ?').get(req.params.id).n;
  const documentiDentro = db.prepare('SELECT COUNT(*) AS n FROM documenti WHERE cartella_id = ?').get(req.params.id).n;
  if (sottocartelle > 0 || documentiDentro > 0) {
    return res.status(409).json({ error: 'la cartella non è vuota: sposta o elimina prima il suo contenuto' });
  }
  db.prepare('DELETE FROM cartelle_documenti WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
