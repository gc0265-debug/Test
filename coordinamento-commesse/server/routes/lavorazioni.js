const express = require('express');
const multer = require('multer');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { verificaVersione } = require('../utils/concorrenza');
const { parseCsv } = require('../utils/csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// 0-100, qualunque cosa arrivi dal client (anche assente o fuori range).
function clampPercentuale(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

router.post('/', (req, res) => {
  const { commessa_id, wp_id, titolo, descrizione, stato, priorita, piano, zona, data_inizio, data_fine, impresa, contratto_id, parent_id, percentuale_completamento } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const erroreParent = validaParent(parent_id, commessa_id, null);
  if (erroreParent) return res.status(400).json({ error: erroreParent });
  const result = db.prepare(`
    INSERT INTO lavorazioni (commessa_id, wp_id, titolo, descrizione, stato, priorita, piano, zona, data_inizio, data_fine, impresa, contratto_id, parent_id, percentuale_completamento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, titolo, descrizione || null, stato || 'da-fare', priorita || 'media',
    piano || null, zona || null, data_inizio || null, data_fine || null, impresa || null, contratto_id || null, parent_id || null,
    clampPercentuale(percentuale_completamento, 0));
  res.status(201).json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'lavorazione non trovata' });
  if (!verificaVersione(req, res, existing)) return;
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
  const percentuale = clampPercentuale(req.body.percentuale_completamento, existing.percentuale_completamento);
  db.prepare(`
    UPDATE lavorazioni SET wp_id=?, titolo=?, descrizione=?, stato=?, priorita=?, piano=?, zona=?, data_inizio=?, data_fine=?, impresa=?, contratto_id=?, parent_id=?, percentuale_completamento=?, updated_at=unixepoch() WHERE id=?
  `).run(
    next.wp_id || null, next.titolo, next.descrizione || null, next.stato, next.priorita,
    next.piano || null, next.zona || null, next.data_inizio || null, next.data_fine || null,
    next.impresa || null, next.contratto_id || null, next.parent_id || null, percentuale, req.params.id
  );
  res.json(db.prepare('SELECT * FROM lavorazioni WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare("DELETE FROM timeline_dipendenze WHERE (pred_tipo='lavorazione' AND pred_id=?) OR (succ_tipo='lavorazione' AND succ_id=?)").run(req.params.id, req.params.id);
  const result = db.prepare('DELETE FROM lavorazioni WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'lavorazione non trovata' });
  res.status(204).end();
});

// Import cronoprogramma da CSV: un file con intestazioni in italiano
// (Titolo, WP, Piano, Zona, Data inizio, Data fine, Stato, Priorità,
// Impresa, Descrizione) genera in blocco le lavorazioni corrispondenti —
// visibili subito anche in Timeline, che legge le stesse righe. Pensato
// per chi ha già un cronoprogramma in Excel/MS Project e vuole evitare di
// re-inserire a mano riga per riga. Non gestisce le sotto-attività
// (Lavorazione madre): quelle, essendo rare, restano da collegare a mano
// dopo l'import, dal modulo della singola riga.
function normalizzaTestoLav(v) {
  return String(v || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
const ALIAS_COLONNE_LAVORAZIONE = {
  titolo: ['titolo', 'attivita', 'nome', 'descrizione attivita', 'task', 'lavorazione'],
  wp: ['wp', 'work package', 'workpackage', 'codice wp'],
  piano: ['piano'],
  zona: ['zona', 'area'],
  data_inizio: ['data inizio', 'inizio', 'start', 'data di inizio'],
  data_fine: ['data fine', 'fine', 'end', 'data di fine', 'scadenza'],
  stato: ['stato', 'status'],
  priorita: ['priorita', 'priority'],
  impresa: ['impresa', 'ditta', 'fornitore', 'subappaltatore', 'azienda'],
  descrizione: ['descrizione', 'note', 'dettagli'],
};
function parseDataLav(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const eu = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  return null;
}
const STATO_ALIAS_LAV = {
  'da fare': 'da-fare', 'dafare': 'da-fare', 'pianificata': 'da-fare', 'non iniziata': 'da-fare', 'to do': 'da-fare', '': 'da-fare',
  'in corso': 'in-corso', 'in-corso': 'in-corso', 'incorso': 'in-corso', 'in lavorazione': 'in-corso',
  completata: 'completata', completato: 'completata', conclusa: 'completata', fatta: 'completata', done: 'completata',
  bloccata: 'bloccata', bloccato: 'bloccata', sospesa: 'bloccata',
};
const PRIORITA_ALIAS_LAV = {
  alta: 'alta', high: 'alta', '': 'media', media: 'media', medium: 'media', normale: 'media', bassa: 'bassa', low: 'bassa',
};

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });
  const commessaId = req.body.commessa_id;
  if (!commessaId) return res.status(400).json({ error: 'commessa_id obbligatorio' });

  let righe;
  try {
    righe = parseCsv(req.file.buffer.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'file CSV non leggibile' });
  }
  if (!righe.length) return res.status(400).json({ error: 'il file è vuoto' });

  const intestazione = righe[0].map(normalizzaTestoLav);
  const colIndex = {};
  for (const [campo, alias] of Object.entries(ALIAS_COLONNE_LAVORAZIONE)) {
    const idx = intestazione.findIndex((h) => alias.includes(h));
    if (idx !== -1) colIndex[campo] = idx;
  }
  if (colIndex.titolo === undefined) {
    return res.status(400).json({ error: 'non trovo una colonna "Titolo" nel file: le intestazioni attese sono Titolo, WP, Piano, Zona, Data inizio, Data fine, Stato, Priorità, Impresa, Descrizione' });
  }
  const cella = (riga, campo) => (colIndex[campo] !== undefined ? String(riga[colIndex[campo]] || '').trim() : '');

  const wpRows = db.prepare('SELECT id, codice FROM work_packages WHERE commessa_id = ?').all(commessaId);
  const wpByCodice = new Map(wpRows.map((w) => [w.codice.toLowerCase(), w.id]));

  const insert = db.prepare(`
    INSERT INTO lavorazioni (commessa_id, wp_id, titolo, descrizione, stato, priorita, piano, zona, data_inizio, data_fine, impresa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const skippedMotivi = [];
  const avvisi = [];
  db.transaction(() => {
    for (let r = 1; r < righe.length; r++) {
      const riga = righe[r];
      const numeroRiga = r + 1; // +1: righe[0] è l'intestazione, cioè la riga 1 del file
      const titolo = cella(riga, 'titolo');
      if (!titolo) { skippedMotivi.push(`riga ${numeroRiga}: manca il titolo`); continue; }
      const dataInizio = parseDataLav(cella(riga, 'data_inizio'));
      const dataFine = parseDataLav(cella(riga, 'data_fine'));
      if (!dataInizio || !dataFine) { skippedMotivi.push(`riga ${numeroRiga} ("${titolo}"): data inizio/fine mancante o non riconosciuta (usare GG/MM/AAAA o AAAA-MM-GG)`); continue; }
      if (dataFine < dataInizio) { skippedMotivi.push(`riga ${numeroRiga} ("${titolo}"): la data di fine precede la data di inizio`); continue; }

      const wpTxt = cella(riga, 'wp');
      const wpId = wpTxt ? (wpByCodice.get(wpTxt.toLowerCase()) || null) : null;
      if (wpTxt && !wpId) avvisi.push(`riga ${numeroRiga} ("${titolo}"): WP "${wpTxt}" non trovato in questa commessa — importata senza WP`);

      insert.run(
        commessaId, wpId, titolo, cella(riga, 'descrizione') || null,
        STATO_ALIAS_LAV[normalizzaTestoLav(cella(riga, 'stato'))] || 'da-fare',
        PRIORITA_ALIAS_LAV[normalizzaTestoLav(cella(riga, 'priorita'))] || 'media',
        cella(riga, 'piano') || null, cella(riga, 'zona') || null,
        dataInizio, dataFine, cella(riga, 'impresa') || null
      );
      imported++;
    }
  })();

  res.status(201).json({
    imported, skipped: skippedMotivi.length, dettaglioScarti: skippedMotivi.slice(0, 30), avvisi: avvisi.slice(0, 30),
  });
});

module.exports = router;
