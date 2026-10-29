// Dashboard Finanziaria — unica vista multi-commessa dell'app (tutte le
// altre sono scoped a una commessa): valore contratti + atti aggiuntivi
// per commessa e totale complessivo. Montata admin-only in index.js.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const contrattiPerCommessa = db.prepare(`
    SELECT co.id AS commessa_id, co.codice, co.nome, co.stato,
           COUNT(DISTINCT c.id) AS n_contratti,
           COALESCE(SUM(c.valore), 0) AS valore_contratti
    FROM commesse co
    LEFT JOIN contratti c ON c.commessa_id = co.id
    GROUP BY co.id
  `).all();

  const attiPerCommessa = db.prepare(`
    SELECT co.id AS commessa_id,
           COUNT(a.id) AS n_atti,
           COALESCE(SUM(a.valore), 0) AS valore_atti
    FROM commesse co
    LEFT JOIN contratti c ON c.commessa_id = co.id
    LEFT JOIN atti_aggiuntivi a ON a.contratto_id = c.id
    GROUP BY co.id
  `).all();
  const attiMap = {};
  attiPerCommessa.forEach((r) => { attiMap[r.commessa_id] = r; });

  const commesse = contrattiPerCommessa
    .map((c) => {
      const atti = attiMap[c.commessa_id] || { n_atti: 0, valore_atti: 0 };
      return {
        commessa_id: c.commessa_id, codice: c.codice, nome: c.nome, stato: c.stato,
        n_contratti: c.n_contratti, valore_contratti: c.valore_contratti,
        n_atti: atti.n_atti, valore_atti: atti.valore_atti,
        valore_totale: c.valore_contratti + atti.valore_atti,
      };
    })
    .sort((a, b) => a.codice.localeCompare(b.codice));

  const totali = commesse.reduce((acc, c) => ({
    n_commesse: acc.n_commesse + 1,
    n_contratti: acc.n_contratti + c.n_contratti,
    n_atti: acc.n_atti + c.n_atti,
    valore_contratti: acc.valore_contratti + c.valore_contratti,
    valore_atti: acc.valore_atti + c.valore_atti,
    valore_totale: acc.valore_totale + c.valore_totale,
  }), { n_commesse: 0, n_contratti: 0, n_atti: 0, valore_contratti: 0, valore_atti: 0, valore_totale: 0 });

  res.json({ commesse, totali });
});

module.exports = router;
