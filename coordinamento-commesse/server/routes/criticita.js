const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const TRACKED = [
  { key: 'tema', label: 'Tema' },
  { key: 'destinatario', label: 'Destinatario' },
  { key: 'urgenza', label: 'Urgenza' },
  { key: 'stato', label: 'Stato' },
  { key: 'entro_quando', label: 'Entro quando' },
];

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
  const { wp_id, stato, urgenza, search } = req.query;
  let sql = `
    SELECT c.*, w.codice AS wp_codice, w.nome AS wp_nome, cm.codice AS commessa_codice
    FROM criticita c
    LEFT JOIN work_packages w ON c.wp_id = w.id
    LEFT JOIN commesse cm ON c.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'c.commessa_id');
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
  const row = db.prepare('SELECT * FROM criticita WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'criticita', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: tema });
  res.status(201).json(arricchisci(row));
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
  const row = db.prepare('SELECT * FROM criticita WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  const azione = (existing.stato !== 'chiusa' && next.stato === 'chiusa') ? 'chiusa'
    : (existing.stato === 'chiusa' && next.stato !== 'chiusa') ? 'riaperta' : 'modificata';
  logAudit({ commessa_id: row.commessa_id, entity_type: 'criticita', entity_id: row.id, azione, utente: req.user?.nome, dettaglio: dettaglio || 'aggiornata' });
  res.json(arricchisci(row));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM criticita WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'criticità non trovata' });
  db.prepare('DELETE FROM criticita WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'criticita', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.tema });
  res.status(204).end();
});

// Import da Registro Criticità PM in Excel (formato usato dai PM Gili: un
// foglio "Registro criticità" con righe di legenda in testa, intestazioni
// su una riga variabile, una riga per criticità). A differenza di
// Approvazioni Drawings, qui la commessa NON è quella selezionata in
// pagina: ogni riga porta con sé, nella colonna "PM" (es. "PM Corridoi",
// "PM FOH", "PM Suite", "PM Variante Room"), a quale squadra/WP
// appartiene, e da lì si risale alla commessa — stesso approccio
// multi-commessa del Registro Decisioni.
const PLACEHOLDER_VALS = new Set(['', 'n/a', 'na', '/', '-', '—']);
function valoreCella(v) {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if (v.result !== undefined) return valoreCella(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join('');
  }
  return v;
}
function testoCriticita(raw) {
  const v = valoreCella(raw);
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return PLACEHOLDER_VALS.has(s.toLowerCase()) ? '' : s;
}
function dataCriticita(raw) {
  const v = valoreCella(raw);
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const eu = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

// Mappa la colonna "PM" sulla commessa e il Work Package di destinazione.
// "PM Suite" va su 2514RW/WP3 per decisione esplicita dell'utente (non
// sulla commessa 2593RW suggerita dalla legenda colori del file, che in
// questo caso indicava un raggruppamento diverso da quello adottato
// nell'app). Un PM non riconosciuto — es. "PM Variante Room", che fa
// riferimento a una commessa 2666RW non ancora creata — fa scartare la
// riga con un motivo chiaro, senza creare commesse automaticamente.
const PM_MAP = {
  'pm corridoi': { commessa: '2514RW', wp: 'WP2' },
  'pm foh': { commessa: '2514RW', wp: 'WP1' },
  'pm suite': { commessa: '2514RW', wp: 'WP3' },
  'pm scala b': { commessa: '2514RW', wp: 'WP4' },
};
const TIPO_LABEL = { P: 'Progetto/Approvazioni', C: 'Cantiere/Area', T: 'Tempi/Programma', V: 'Variante/Modifica' };

function normalizzaUrgenza(raw, haEntroQuando) {
  const s = testoCriticita(raw).toLowerCase();
  if (s.startsWith('urgente')) return haEntroQuando ? 'viola' : 'normale';
  if (s.startsWith('non urgente')) return 'verde';
  return 'normale';
}
function normalizzaStatoCriticita(raw) {
  const s = testoCriticita(raw).toLowerCase();
  if (s.startsWith('chius')) return 'chiusa';
  if (s.startsWith('in attesa')) return 'in-attesa';
  return 'aperta';
}

const ALIAS_CRITICITA = {
  pm: ['pm'],
  pianoArea: ['piano / area', 'piano/area'],
  tipo: ['tipo'],
  tema: ['criticità', 'criticita'],
  cosaServe: ['cosa serve'],
  urgenza: ['urgenza'],
  dataLimite: ['data limite'],
  impattoPl: ['impatto pl (s/no)', 'impatto pl'],
  stato: ['stato'],
  noteDdc1: ['note dal ddc (giovanni)', 'note dal ddc'],
  noteDdc2: ['note ddc (giovanni)', 'note ddc'],
  rispostaPm: ['risposta dei pm a giovanni', 'risposta pm'],
};
function normalizzaIntestazioneCriticita(v) {
  return String(valoreCella(v) || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function trovaRigaIntestazioneCriticita(sheet) {
  const tuttiAlias = new Set(Object.values(ALIAS_CRITICITA).flat());
  let miglioreRiga = 1;
  let miglioreScore = 0;
  for (let r = 1; r <= Math.min(15, sheet.rowCount); r++) {
    let score = 0;
    sheet.getRow(r).eachCell((cell) => {
      if (tuttiAlias.has(normalizzaIntestazioneCriticita(cell.value))) score++;
    });
    if (score > miglioreScore) { miglioreScore = score; miglioreRiga = r; }
  }
  return miglioreRiga;
}

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'file Excel non leggibile' });
  }
  const sheet = wb.worksheets.find((s) => /criticit/i.test(s.name)) || wb.worksheets[0];
  if (!sheet) return res.status(400).json({ error: 'il file non contiene fogli' });

  const rigaIntestazione = trovaRigaIntestazioneCriticita(sheet);
  const colByText = {};
  sheet.getRow(rigaIntestazione).eachCell((cell, colNumber) => {
    const key = normalizzaIntestazioneCriticita(cell.value);
    if (!(key in colByText)) colByText[key] = colNumber;
  });
  const colIndex = {};
  for (const [campo, alias] of Object.entries(ALIAS_CRITICITA)) {
    for (const a of alias) {
      if (colByText[a]) { colIndex[campo] = colByText[a]; break; }
    }
  }
  if (!colIndex.tema) {
    return res.status(400).json({ error: 'non trovo una colonna "Criticità" (il tema) nel file' });
  }
  const cella = (row, campo) => (colIndex[campo] ? row.getCell(colIndex[campo]).value : null);

  const commesseRows = db.prepare('SELECT id, codice FROM commesse').all();
  const commessaByCodice = new Map(commesseRows.map((c) => [c.codice.toLowerCase(), c.id]));

  const insert = db.prepare(`
    INSERT INTO criticita (commessa_id, wp_id, tema, cosa_serve, entro_quando, impatto_programma, urgenza, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const skippedMotivi = [];
  db.transaction(() => {
    for (let r = rigaIntestazione + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const tema = testoCriticita(cella(row, 'tema'));
      if (!tema) continue; // riga vuota o di sezione, non è un errore

      const pmTxt = testoCriticita(cella(row, 'pm')).toLowerCase();
      const mappa = PM_MAP[pmTxt];
      if (!mappa) { skippedMotivi.push(`riga ${r}: colonna PM "${testoCriticita(cella(row, 'pm')) || '(vuota)'}" non riconosciuta`); continue; }
      const commessaId = commessaByCodice.get(mappa.commessa.toLowerCase());
      if (!commessaId) { skippedMotivi.push(`riga ${r}: commessa "${mappa.commessa}" non trovata`); continue; }
      const wp = db.prepare('SELECT id FROM work_packages WHERE commessa_id = ? AND LOWER(codice) = ?')
        .get(commessaId, mappa.wp.toLowerCase());

      const dataLimite = dataCriticita(cella(row, 'dataLimite'));
      const urgenza = normalizzaUrgenza(cella(row, 'urgenza'), !!dataLimite);
      const stato = normalizzaStatoCriticita(cella(row, 'stato'));
      const cosaServe = testoCriticita(cella(row, 'cosaServe')) || null;
      const impattoPl = testoCriticita(cella(row, 'impattoPl')) || null;

      const noteParti = [];
      const pianoArea = testoCriticita(cella(row, 'pianoArea'));
      if (pianoArea) noteParti.push(`Piano/Area: ${pianoArea}`);
      const tipo = testoCriticita(cella(row, 'tipo')).toUpperCase();
      if (tipo && TIPO_LABEL[tipo]) noteParti.push(`Tipo: ${TIPO_LABEL[tipo]}`);
      const noteDdc = [...new Set([cella(row, 'noteDdc1'), cella(row, 'noteDdc2')].map(testoCriticita).filter(Boolean))];
      if (noteDdc.length) noteParti.push(`Note dal DDC: ${noteDdc.join(' | ')}`);
      const rispostaPm = testoCriticita(cella(row, 'rispostaPm'));
      if (rispostaPm) noteParti.push(`Risposta PM: ${rispostaPm}`);
      const note = noteParti.join(' — ') || null;

      const result = insert.run(
        commessaId, wp ? wp.id : null, tema, cosaServe, dataLimite, impattoPl, urgenza, stato, note
      );
      logAudit({ commessa_id: commessaId, entity_type: 'criticita', entity_id: result.lastInsertRowid, azione: 'creata', utente: req.user?.nome, dettaglio: `${tema} (import)` });
      imported++;
    }
  })();

  res.status(201).json({ imported, skipped: skippedMotivi.length, dettaglioScarti: skippedMotivi.slice(0, 20) });
});

module.exports = router;
