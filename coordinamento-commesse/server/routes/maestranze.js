const express = require('express');
const multer = require('multer');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { verificaVersione } = require('../utils/concorrenza');
const { parseCsv, normalizzaTestoCsv, mappaColonne } = require('../utils/csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { wp_id, stato, search } = req.query;
  let sql = `
    SELECT m.*, w.codice AS wp_codice, w.nome AS wp_nome, cm.codice AS commessa_codice,
           (SELECT GROUP_CONCAT(s.nome, ', ') FROM maestranze_fornitori mf
            JOIN stakeholder s ON mf.stakeholder_id = s.id WHERE mf.maestranza_id = m.id) AS fornitori_nomi
    FROM maestranze m
    LEFT JOIN work_packages w ON m.wp_id = w.id
    LEFT JOIN commesse cm ON m.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'm.commessa_id');
  if (wp_id) { sql += ' AND m.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND m.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (m.nome LIKE ? OR m.azienda LIKE ? OR m.ruolo LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY m.nome ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, ruolo, azienda, telefono, wp_id, stato, qualifiche } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO maestranze (commessa_id, nome, ruolo, azienda, telefono, wp_id, stato, qualifiche)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, nome, ruolo || null, azienda || null, telefono || null, wp_id || null, stato || 'attivo', qualifiche || null);
  res.status(201).json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'maestranza non trovata' });
  if (!verificaVersione(req, res, existing)) return;
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE maestranze SET nome=?, ruolo=?, azienda=?, telefono=?, wp_id=?, stato=?, qualifiche=?, updated_at=unixepoch() WHERE id=?
  `).run(next.nome, next.ruolo || null, next.azienda || null, next.telefono || null, next.wp_id || null, next.stato, next.qualifiche || null, req.params.id);
  res.json(db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM maestranze WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'maestranza non trovata' });
  res.status(204).end();
});

// ---- fornitori collegati (scelti dal Registro Stakeholder) ----
router.get('/:id/fornitori', (req, res) => {
  const rows = db.prepare('SELECT stakeholder_id FROM maestranze_fornitori WHERE maestranza_id = ?').all(req.params.id);
  res.json({ data: rows.map((r) => r.stakeholder_id) });
});

// Sostituisce in blocco i fornitori collegati. Body: { stakeholder_ids: [...] }
router.put('/:id/fornitori', (req, res) => {
  const existing = db.prepare('SELECT * FROM maestranze WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'maestranza non trovata' });
  const ids = Array.isArray(req.body.stakeholder_ids) ? req.body.stakeholder_ids : [];

  const salva = db.transaction(() => {
    db.prepare('DELETE FROM maestranze_fornitori WHERE maestranza_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO maestranze_fornitori (maestranza_id, stakeholder_id) VALUES (?, ?)');
    ids.forEach((sid) => insert.run(req.params.id, sid));
  });
  salva();
  res.json({ data: ids });
});

// Import in blocco da CSV: intestazioni Nome, Ruolo, Azienda, Telefono,
// WP, Stato, Qualifiche. I fornitori collegati (Registro Stakeholder) non
// sono gestiti qui: si aggiungono a mano dopo l'import.
const ALIAS_COLONNE_MAESTRANZE = {
  nome: ['nome'],
  ruolo: ['ruolo'],
  azienda: ['azienda', 'impresa', 'ditta'],
  telefono: ['telefono', 'cellulare', 'tel'],
  wp: ['wp', 'work package', 'workpackage', 'codice wp'],
  stato: ['stato'],
  qualifiche: ['qualifiche', 'qualifica'],
};
const STATO_ALIAS_MAESTRANZE = { attivo: 'attivo', '': 'attivo', 'non attivo': 'non-attivo', 'non-attivo': 'non-attivo', inattivo: 'non-attivo' };

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });
  const commessaId = req.body.commessa_id;
  if (!commessaId) return res.status(400).json({ error: 'commessa_id obbligatorio' });

  let righe;
  try { righe = parseCsv(req.file.buffer.toString('utf8')); }
  catch (err) { return res.status(400).json({ error: 'file CSV non leggibile' }); }
  if (!righe.length) return res.status(400).json({ error: 'il file è vuoto' });

  const colIndex = mappaColonne(righe[0], ALIAS_COLONNE_MAESTRANZE);
  if (colIndex.nome === undefined) {
    return res.status(400).json({ error: 'non trovo una colonna "Nome" nel file: le intestazioni attese sono Nome, Ruolo, Azienda, Telefono, WP, Stato, Qualifiche' });
  }
  const cella = (riga, campo) => (colIndex[campo] !== undefined ? String(riga[colIndex[campo]] || '').trim() : '');

  const wpRows = db.prepare('SELECT id, codice FROM work_packages WHERE commessa_id = ?').all(commessaId);
  const wpByCodice = new Map(wpRows.map((w) => [w.codice.toLowerCase(), w.id]));

  const insert = db.prepare(`
    INSERT INTO maestranze (commessa_id, nome, ruolo, azienda, telefono, wp_id, stato, qualifiche)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const skippedMotivi = [];
  const avvisi = [];
  db.transaction(() => {
    for (let r = 1; r < righe.length; r++) {
      const riga = righe[r];
      const numeroRiga = r + 1;
      const nome = cella(riga, 'nome');
      if (!nome) { skippedMotivi.push(`riga ${numeroRiga}: manca il nome`); continue; }

      const wpTxt = cella(riga, 'wp');
      const wpId = wpTxt ? (wpByCodice.get(wpTxt.toLowerCase()) || null) : null;
      if (wpTxt && !wpId) avvisi.push(`riga ${numeroRiga} ("${nome}"): WP "${wpTxt}" non trovato in questa commessa — importata senza WP`);

      insert.run(
        commessaId, nome, cella(riga, 'ruolo') || null, cella(riga, 'azienda') || null, cella(riga, 'telefono') || null,
        wpId, STATO_ALIAS_MAESTRANZE[normalizzaTestoCsv(cella(riga, 'stato'))] || 'attivo', cella(riga, 'qualifiche') || null
      );
      imported++;
    }
  })();

  res.status(201).json({ imported, skipped: skippedMotivi.length, dettaglioScarti: skippedMotivi.slice(0, 30), avvisi: avvisi.slice(0, 30) });
});

module.exports = router;
