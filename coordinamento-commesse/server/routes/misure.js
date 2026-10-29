// Misure rilevate in opera per una lavorazione: quota di progetto vs
// quota effettivamente rilevata in cantiere, con lo scostamento calcolato
// qui (mai salvato, sempre ricalcolato dai due valori) ed evidenziato
// quando supera la soglia di attenzione — soglia visiva, non una
// tolleranza contrattuale (quella resta una valutazione del Direttore di
// Cantiere, da annotare nella nota tecnica).

const express = require('express');
const db = require('../db/database');
const { logAudit } = require('../utils/audit');

const router = express.Router();

const SOGLIA_SCOSTAMENTO_PCT = 3;

function arrotonda(n) {
  return Math.round(n * 1000) / 1000;
}

function arricchisci(row) {
  const haEntrambe = row.quota_progetto !== null && row.quota_rilevata !== null;
  const delta = haEntrambe ? arrotonda(row.quota_rilevata - row.quota_progetto) : null;
  const percentuale = haEntrambe && row.quota_progetto !== 0 ? arrotonda((delta / row.quota_progetto) * 100) : null;
  return {
    ...row,
    delta,
    percentuale_scostamento: percentuale,
    oltre_soglia: percentuale !== null && Math.abs(percentuale) > SOGLIA_SCOSTAMENTO_PCT,
  };
}

router.get('/', (req, res) => {
  const { lavorazione_id } = req.query;
  if (!lavorazione_id) return res.status(400).json({ error: 'lavorazione_id obbligatorio' });
  const rows = db.prepare(`
    SELECT m.*, d.titolo AS documento_titolo, c.tema AS criticita_tema, c.stato AS criticita_stato
    FROM misure m
    LEFT JOIN documenti d ON m.documento_id = d.id
    LEFT JOIN criticita c ON m.rif_criticita_id = c.id
    WHERE m.lavorazione_id = ?
    ORDER BY m.data_rilievo ASC, m.id ASC
  `).all(lavorazione_id);
  res.json({ data: rows.map(arricchisci), total: rows.length });
});

router.post('/', (req, res) => {
  const { lavorazione_id, tratta, quota_progetto, quota_rilevata, unita, nota_tecnica, data_rilievo, documento_id } = req.body;
  if (!lavorazione_id || !tratta) return res.status(400).json({ error: 'lavorazione_id e tratta sono obbligatori' });
  const lavorazione = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(lavorazione_id);
  if (!lavorazione) return res.status(404).json({ error: 'lavorazione non trovata' });

  const result = db.prepare(`
    INSERT INTO misure (lavorazione_id, tratta, quota_progetto, quota_rilevata, unita, nota_tecnica, data_rilievo, documento_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    lavorazione_id, tratta,
    quota_progetto === '' || quota_progetto === undefined ? null : Number(quota_progetto),
    quota_rilevata === '' || quota_rilevata === undefined ? null : Number(quota_rilevata),
    unita || 'm', nota_tecnica || null, data_rilievo || new Date().toISOString().slice(0, 10), documento_id || null
  );
  const row = db.prepare('SELECT * FROM misure WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: lavorazione.commessa_id, entity_type: 'misure', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${lavorazione.titolo} — ${tratta}` });
  res.status(201).json(arricchisci(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM misure WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'misura non trovata' });
  const { tratta, quota_progetto, quota_rilevata, unita, nota_tecnica, data_rilievo, documento_id, rif_criticita_id } = req.body;
  const next = {
    tratta: tratta ?? existing.tratta,
    quota_progetto: quota_progetto === '' ? null : (quota_progetto !== undefined ? Number(quota_progetto) : existing.quota_progetto),
    quota_rilevata: quota_rilevata === '' ? null : (quota_rilevata !== undefined ? Number(quota_rilevata) : existing.quota_rilevata),
    unita: unita ?? existing.unita,
    nota_tecnica: nota_tecnica !== undefined ? (nota_tecnica || null) : existing.nota_tecnica,
    data_rilievo: data_rilievo ?? existing.data_rilievo,
    documento_id: documento_id !== undefined ? (documento_id || null) : existing.documento_id,
    rif_criticita_id: rif_criticita_id !== undefined ? (rif_criticita_id || null) : existing.rif_criticita_id,
  };
  db.prepare(`
    UPDATE misure SET tratta=?, quota_progetto=?, quota_rilevata=?, unita=?, nota_tecnica=?, data_rilievo=?, documento_id=?, rif_criticita_id=?, updated_at=unixepoch()
    WHERE id=?
  `).run(next.tratta, next.quota_progetto, next.quota_rilevata, next.unita, next.nota_tecnica, next.data_rilievo, next.documento_id, next.rif_criticita_id, req.params.id);
  const row = db.prepare('SELECT * FROM misure WHERE id = ?').get(req.params.id);
  res.json(arricchisci(row));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM misure WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'misura non trovata' });
  res.status(204).end();
});

// Crea una criticità nel Registro Criticità precompilata da questa misura
// (usata quando lo scostamento è oltre soglia e serve una decisione del
// cliente/DL), e collega la misura alla criticità appena creata.
router.post('/:id/segnala-criticita', (req, res) => {
  const misura = db.prepare('SELECT * FROM misure WHERE id = ?').get(req.params.id);
  if (!misura) return res.status(404).json({ error: 'misura non trovata' });
  const lavorazione = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(misura.lavorazione_id);
  if (!lavorazione) return res.status(404).json({ error: 'lavorazione collegata non trovata' });

  const delta = (misura.quota_progetto !== null && misura.quota_rilevata !== null) ? misura.quota_rilevata - misura.quota_progetto : null;
  const tema = `Scostamento misura — ${lavorazione.titolo} (${misura.tratta})`;
  const cosaServe = [
    `Quota di progetto: ${misura.quota_progetto ?? '—'} ${misura.unita}`,
    `Quota rilevata in opera: ${misura.quota_rilevata ?? '—'} ${misura.unita}`,
    delta !== null ? `Delta: ${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${misura.unita}` : null,
    misura.nota_tecnica ? `Nota tecnica: ${misura.nota_tecnica}` : null,
  ].filter(Boolean).join('\n');

  const result = db.prepare(`
    INSERT INTO criticita (commessa_id, wp_id, tema, cosa_serve, urgenza, stato)
    VALUES (?, ?, ?, ?, 'normale', 'aperta')
  `).run(lavorazione.commessa_id, lavorazione.wp_id || null, tema, cosaServe);

  db.prepare('UPDATE misure SET rif_criticita_id = ? WHERE id = ?').run(result.lastInsertRowid, misura.id);
  logAudit({ commessa_id: lavorazione.commessa_id, entity_type: 'criticita', entity_id: result.lastInsertRowid, azione: 'creata', utente: req.user?.nome, dettaglio: tema });

  const row = db.prepare('SELECT * FROM misure WHERE id = ?').get(misura.id);
  res.status(201).json(arricchisci(row));
});

module.exports = router;
