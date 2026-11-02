// Requisiti — estratti da un capitolato, con codice WBS per commessa e
// fase di esecuzione. Una modifica a titolo o descrizione crea una nuova
// riga in requisiti_versioni (versionamento append-only): è la base su
// cui il Contratto rileva le variazioni rispetto alla propria baseline.

const express = require('express');
const multer = require('multer');
const db = require('../db/database');
const { todayStr } = require('../utils/dates');
const { logAudit } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { verificaVersione } = require('../utils/concorrenza');
const { parseCsv, normalizzaTestoCsv, mappaColonne } = require('../utils/csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { wp_id, fase, stato, search } = req.query;
  let sql = `
    SELECT r.*, w.codice AS wp_codice, w.nome AS wp_nome, cv.codice_wbs AS capitolato_wbs, cv.titolo AS capitolato_titolo, cm.codice AS commessa_codice
    FROM requisiti r
    LEFT JOIN work_packages w ON r.wp_id = w.id
    LEFT JOIN capitolato_voci cv ON r.rif_capitolato_voce_id = cv.id
    LEFT JOIN commesse cm ON r.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'r.commessa_id');
  if (wp_id) { sql += ' AND r.wp_id = ?'; params.push(wp_id); }
  if (fase) { sql += ' AND r.fase = ?'; params.push(fase); }
  if (stato) { sql += ' AND r.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (r.titolo LIKE ? OR r.codice_wbs LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY r.codice_wbs ASC';

  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'requisito non trovato' });
  res.json(row);
});

router.get('/:id/versioni', (req, res) => {
  const rows = db.prepare('SELECT * FROM requisiti_versioni WHERE requisito_id = ? ORDER BY numero_versione DESC').all(req.params.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, codice_wbs, fase, titolo, descrizione, fonte_capitolato, rif_capitolato_voce_id, stato, note } = req.body;
  if (!commessa_id || !codice_wbs || !titolo) {
    return res.status(400).json({ error: 'commessa_id, codice_wbs e titolo sono obbligatori' });
  }
  const insertRequisito = db.prepare(`
    INSERT INTO requisiti (commessa_id, wp_id, codice_wbs, fase, titolo, descrizione, fonte_capitolato, rif_capitolato_voce_id, stato, versione_corrente, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertVersione = db.prepare(`
    INSERT INTO requisiti_versioni (requisito_id, numero_versione, titolo, descrizione, motivo_modifica, data, autore)
    VALUES (?, 1, ?, ?, 'Creazione', ?, ?)
  `);
  const creaConVersione = db.transaction(() => {
    const result = insertRequisito.run(
      commessa_id, wp_id || null, codice_wbs, fase || 'progettazione', titolo, descrizione || null,
      fonte_capitolato || null, rif_capitolato_voce_id || null, stato || 'bozza', note || null
    );
    insertVersione.run(result.lastInsertRowid, titolo, descrizione || null, todayStr(), req.user?.nome || null);
    return result.lastInsertRowid;
  });
  const id = creaConVersione();
  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'requisiti', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${codice_wbs} — ${titolo}` });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'requisito non trovato' });
  if (!verificaVersione(req, res, existing)) return;
  const next = { ...existing, ...req.body };
  const contenutoCambiato = next.titolo !== existing.titolo || (next.descrizione || '') !== (existing.descrizione || '');
  const motivoModifica = req.body.motivo_modifica || null;

  const aggiorna = db.transaction(() => {
    const versione = contenutoCambiato ? existing.versione_corrente + 1 : existing.versione_corrente;
    db.prepare(`
      UPDATE requisiti SET wp_id=?, codice_wbs=?, fase=?, titolo=?, descrizione=?, fonte_capitolato=?, rif_capitolato_voce_id=?, stato=?,
        versione_corrente=?, note=?, updated_at=unixepoch()
      WHERE id=?
    `).run(
      next.wp_id || null, next.codice_wbs, next.fase, next.titolo, next.descrizione || null,
      next.fonte_capitolato || null, next.rif_capitolato_voce_id || null, next.stato, versione, next.note || null, req.params.id
    );
    if (contenutoCambiato) {
      db.prepare(`
        INSERT INTO requisiti_versioni (requisito_id, numero_versione, titolo, descrizione, motivo_modifica, data, autore)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, versione, next.titolo, next.descrizione || null, motivoModifica, todayStr(), req.user?.nome || null);
    }
    return versione;
  });
  const nuovaVersione = aggiorna();

  const row = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  const dettaglio = contenutoCambiato
    ? `Nuova versione (v${nuovaVersione})${motivoModifica ? ': ' + motivoModifica : ''}`
    : (existing.stato !== next.stato ? `Stato: ${existing.stato} → ${next.stato}` : 'aggiornato');
  logAudit({ commessa_id: row.commessa_id, entity_type: 'requisiti', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM requisiti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'requisito non trovato' });
  db.prepare('DELETE FROM requisiti WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'requisiti', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `${existing.codice_wbs} — ${existing.titolo}` });
  res.status(204).end();
});

// Import in blocco da CSV: intestazioni Codice WBS, Titolo, WP, Fase,
// Descrizione, Fonte capitolato, Stato, Note. Ogni riga crea anche la
// propria v1 in requisiti_versioni, come una creazione manuale.
const ALIAS_COLONNE_REQUISITI = {
  codice_wbs: ['codice wbs', 'wbs', 'codice'],
  titolo: ['titolo'],
  wp: ['wp', 'work package', 'workpackage', 'codice wp'],
  fase: ['fase'],
  descrizione: ['descrizione'],
  fonte_capitolato: ['fonte capitolato', 'capitolato', 'riferimento capitolato'],
  stato: ['stato'],
  note: ['note'],
};
const STATO_ALIAS_REQUISITI = {
  bozza: 'bozza', '': 'bozza', approvato: 'approvato', 'in revisione': 'in-revisione', 'in-revisione': 'in-revisione', superato: 'superato',
};

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });
  const commessaId = req.body.commessa_id;
  if (!commessaId) return res.status(400).json({ error: 'commessa_id obbligatorio' });

  let righe;
  try { righe = parseCsv(req.file.buffer.toString('utf8')); }
  catch (err) { return res.status(400).json({ error: 'file CSV non leggibile' }); }
  if (!righe.length) return res.status(400).json({ error: 'il file è vuoto' });

  const colIndex = mappaColonne(righe[0], ALIAS_COLONNE_REQUISITI);
  if (colIndex.codice_wbs === undefined || colIndex.titolo === undefined) {
    return res.status(400).json({ error: 'non trovo le colonne "Codice WBS" e/o "Titolo" nel file: le intestazioni attese sono Codice WBS, Titolo, WP, Fase, Descrizione, Fonte capitolato, Stato, Note' });
  }
  const cella = (riga, campo) => (colIndex[campo] !== undefined ? String(riga[colIndex[campo]] || '').trim() : '');

  const wpRows = db.prepare('SELECT id, codice FROM work_packages WHERE commessa_id = ?').all(commessaId);
  const wpByCodice = new Map(wpRows.map((w) => [w.codice.toLowerCase(), w.id]));

  const insertRequisito = db.prepare(`
    INSERT INTO requisiti (commessa_id, wp_id, codice_wbs, fase, titolo, descrizione, fonte_capitolato, stato, versione_corrente, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertVersione = db.prepare(`
    INSERT INTO requisiti_versioni (requisito_id, numero_versione, titolo, descrizione, motivo_modifica, data, autore)
    VALUES (?, 1, ?, ?, 'Creazione (import CSV)', ?, ?)
  `);

  let imported = 0;
  const skippedMotivi = [];
  const avvisi = [];
  db.transaction(() => {
    for (let r = 1; r < righe.length; r++) {
      const riga = righe[r];
      const numeroRiga = r + 1;
      const codiceWbs = cella(riga, 'codice_wbs');
      const titolo = cella(riga, 'titolo');
      if (!codiceWbs || !titolo) { skippedMotivi.push(`riga ${numeroRiga}: manca il codice WBS o il titolo`); continue; }

      const wpTxt = cella(riga, 'wp');
      const wpId = wpTxt ? (wpByCodice.get(wpTxt.toLowerCase()) || null) : null;
      if (wpTxt && !wpId) avvisi.push(`riga ${numeroRiga} ("${codiceWbs}"): WP "${wpTxt}" non trovato in questa commessa — importata senza WP`);

      const descrizione = cella(riga, 'descrizione') || null;
      const result = insertRequisito.run(
        commessaId, wpId, codiceWbs, cella(riga, 'fase') || 'progettazione', titolo, descrizione,
        cella(riga, 'fonte_capitolato') || null,
        STATO_ALIAS_REQUISITI[normalizzaTestoCsv(cella(riga, 'stato'))] || 'bozza', cella(riga, 'note') || null
      );
      insertVersione.run(result.lastInsertRowid, titolo, descrizione, todayStr(), req.user?.nome || null);
      logAudit({ commessa_id: commessaId, entity_type: 'requisiti', entity_id: result.lastInsertRowid, azione: 'creata', utente: req.user?.nome, dettaglio: `${codiceWbs} — ${titolo} (import)` });
      imported++;
    }
  })();

  res.status(201).json({ imported, skipped: skippedMotivi.length, dettaglioScarti: skippedMotivi.slice(0, 30), avvisi: avvisi.slice(0, 30) });
});

module.exports = router;
