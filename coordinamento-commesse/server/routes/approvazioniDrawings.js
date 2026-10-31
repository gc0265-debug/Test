// Approvazioni Drawings — elenco elaborati/deliverable sottoposti a
// DL/GC per approvazione. Compilabile a mano o importando un file Excel.
// L'import riconosce sia un template semplice (intestazioni Codice,
// Titolo, Revisione, Data invio, Data approvazione, Stato, WP, Note) sia
// il formato reale dell'"Elenco Deliverable" usato da GILI (intestazioni
// su una riga qualunque tra le prime, righe di sezione per Livello senza
// dati, colonne Livello/Area/Ambiente/Loc/PM ripiegate nella nota). Ogni
// riga può agganciarsi a un Requisito del Capitolato Requisiti, restando
// così collegata agli altri registri di Coordinamento e Contratti.

const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const TRACKED = [
  { key: 'codice', label: 'Codice' },
  { key: 'titolo', label: 'Titolo' },
  { key: 'revisione', label: 'Revisione' },
  { key: 'stato', label: 'Stato' },
  { key: 'data_invio', label: 'Data invio' },
  { key: 'data_approvazione', label: 'Data approvazione' },
];

const STATI_VALIDI = ['in-attesa', 'approvato', 'approvato-con-riserve', 'rigettato'];
function normalizzaStato(v) {
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '-');
  return STATI_VALIDI.includes(s) ? s : 'in-attesa';
}
// Una cella Excel può essere una Date, una stringa, un numero o il
// risultato di una formula ({formula, result}) — qui si estrae sempre un
// valore "piatto" prima di qualunque altra elaborazione.
function valoreCella(v) {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if (v.result !== undefined) return valoreCella(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
  }
  return v;
}
function excelDateToISO(raw) {
  const v = valoreCella(raw);
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const eu = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}
// Valori segnaposto usati nell'elenco deliverable per "non ancora
// definito" — vanno trattati come cella vuota, non come un dato reale.
const PLACEHOLDER = new Set(['', 'n/a', 'na', '/', '-', '[…]', '...', '…']);
function testo(raw) {
  const v = valoreCella(raw);
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return PLACEHOLDER.has(s.toLowerCase()) ? '' : s;
}
function normalizzaIntestazione(v) {
  return String(valoreCella(v) || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Alias delle intestazioni riconosciute, in ordine di priorità: il primo
// che trova una colonna vince. Copre sia il template semplice sia il
// formato reale dell'Elenco Deliverable GILI.
const ALIAS = {
  titolo: ['nome elaborato', 'titolo', 'descrizione', 'nome'],
  codice: ['codice elaborato / nome file', 'codice', 'drawing', 'numero', 'elaborato'],
  codiceAlt: ['drawing (bar / design review)'], // codice provvisorio quando l'elaborato non ha ancora un nome file
  revisione: ['revisione', 'rev'],
  dataInvio: ['data invio', 'invio', 'data di consegna'],
  dataApprovazione: ['ricevimento approvazione', 'data approvazione', 'approvazione'],
  dataApprovazioneAttesa: ['approvazione (data ultima attesa, incluse revisioni)'],
  stato: ['status', 'stato'],
  wp: ['wp', 'work package'],
  note: ['note'],
  livello: ['level'],
  area: ['area'],
  ambiente: ['ambiente pe'],
  loc: ['loc'],
  pm: ['project manager'],
};
const TUTTI_GLI_ALIAS = new Set(Object.values(ALIAS).flat());

// L'intestazione non è sempre in riga 1 (l'Elenco Deliverable GILI ha un
// titolo unito in riga 1 e l'intestazione vera in riga 3): si cerca tra
// le prime righe quella che somiglia di più a un'intestazione nota.
function trovaRigaIntestazione(sheet) {
  let miglioreRiga = 1;
  let miglioreScore = 0;
  for (let r = 1; r <= Math.min(15, sheet.rowCount); r++) {
    let score = 0;
    sheet.getRow(r).eachCell((cell) => {
      if (TUTTI_GLI_ALIAS.has(normalizzaIntestazione(cell.value))) score++;
    });
    if (score > miglioreScore) { miglioreScore = score; miglioreRiga = r; }
  }
  return miglioreRiga;
}

function costruisciColIndex(sheet, rigaIntestazione) {
  const colByText = {};
  sheet.getRow(rigaIntestazione).eachCell((cell, colNumber) => {
    colByText[normalizzaIntestazione(cell.value)] = colNumber;
  });
  const colIndex = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    for (const a of alias) {
      if (colByText[a]) { colIndex[campo] = colByText[a]; break; }
    }
  }
  return colIndex;
}

// Mappa i valori liberi della colonna "Status" dell'Elenco Deliverable
// GILI sui 4 stati dell'app. Le etichette non riconosciute finiscono in
// "in-attesa" (a meno che risulti già ricevuta l'approvazione) e il testo
// originale resta in nota per non perdere la sfumatura.
const MAPPA_STATO_REALE = {
  'ok': 'approvato',
  'approvato': 'approvato',
  'temi minori': 'approvato-con-riserve',
  'approvato con riserve': 'approvato-con-riserve',
  'in approv.': 'in-attesa',
  'in approvazione': 'in-attesa',
  'in cons.': 'in-attesa',
  'in consegna': 'in-attesa',
  'in revisione': 'in-attesa',
  'in lavorazione': 'in-attesa',
  'da def.': 'in-attesa',
  'da definire': 'in-attesa',
  'da rilevare': 'in-attesa',
  'fissare data': 'in-attesa',
  'manca esecut.': 'in-attesa',
  'rigettato': 'rigettato',
  'respinto': 'rigettato',
};
function normalizzaStatoImport(statoRaw, haRicevimentoApprovazione) {
  const s = testo(statoRaw);
  if (!s) return { stato: haRicevimentoApprovazione ? 'approvato' : 'in-attesa', originaleDaAnnotare: null };
  const sNorm = s.toLowerCase();
  if (STATI_VALIDI.includes(sNorm.replace(/\s+/g, '-'))) {
    return { stato: normalizzaStato(s), originaleDaAnnotare: null };
  }
  if (MAPPA_STATO_REALE[sNorm]) {
    const stato = MAPPA_STATO_REALE[sNorm];
    return { stato, originaleDaAnnotare: stato === 'approvato-con-riserve' ? s : null };
  }
  return { stato: haRicevimentoApprovazione ? 'approvato' : 'in-attesa', originaleDaAnnotare: s };
}

router.get('/', (req, res) => {
  const { wp_id, stato, search } = req.query;
  let sql = `
    SELECT a.*, w.codice AS wp_codice, w.nome AS wp_nome,
           r.codice_wbs AS requisito_wbs, r.titolo AS requisito_titolo, cm.codice AS commessa_codice
    FROM approvazioni_drawings a
    LEFT JOIN work_packages w ON a.wp_id = w.id
    LEFT JOIN requisiti r ON a.rif_requisito_id = r.id
    LEFT JOIN commesse cm ON a.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 'a.commessa_id');
  if (wp_id) { sql += ' AND a.wp_id = ?'; params.push(wp_id); }
  if (stato) { sql += ' AND a.stato = ?'; params.push(stato); }
  if (search) { sql += ' AND (a.codice LIKE ? OR a.titolo LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY a.codice ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/', (req, res) => {
  const { commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, rif_requisito_id, note } = req.body;
  if (!commessa_id || !codice || !titolo) return res.status(400).json({ error: 'commessa_id, codice e titolo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO approvazioni_drawings (commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, rif_requisito_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commessa_id, wp_id || null, codice, titolo, revisione || null, data_invio || null, data_approvazione || null, stato || 'in-attesa', rif_requisito_id || null, note || null);
  const row = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'approvazioni_drawings', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${codice} — ${titolo}` });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'elaborato non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE approvazioni_drawings
    SET wp_id=?, codice=?, titolo=?, revisione=?, data_invio=?, data_approvazione=?, stato=?, rif_requisito_id=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.wp_id || null, next.codice, next.titolo, next.revisione || null, next.data_invio || null,
    next.data_approvazione || null, next.stato, next.rif_requisito_id || null, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'approvazioni_drawings', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: dettaglio || 'aggiornato' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM approvazioni_drawings WHERE id = ?').get(req.params.id);
  const result = db.prepare('DELETE FROM approvazioni_drawings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'elaborato non trovato' });
  if (existing) {
    logAudit({ commessa_id: existing.commessa_id, entity_type: 'approvazioni_drawings', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: `${existing.codice} — ${existing.titolo}` });
  }
  res.status(204).end();
});

// Import da elenco deliverable in Excel. Riconosce sia il template
// semplice sia il formato reale GILI: l'intestazione viene cercata tra le
// prime righe (vedi trovaRigaIntestazione), e le righe di sezione per
// Livello (senza Nome elaborato) vengono ignorate senza essere contate
// come errori — sono separatori, non elaborati mancanti.
router.post('/import', upload.single('file'), async (req, res) => {
  const { commessa_id } = req.body;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'file Excel non leggibile' });
  }
  const sheet = wb.worksheets[0];
  if (!sheet) return res.status(400).json({ error: 'il file non contiene fogli' });

  const rigaIntestazione = trovaRigaIntestazione(sheet);
  const colIndex = costruisciColIndex(sheet, rigaIntestazione);
  if (!colIndex.titolo) {
    return res.status(400).json({ error: 'non trovo una colonna con il nome dell\'elaborato (es. "Nome elaborato" o "Titolo") nel file' });
  }
  const cella = (row, campo) => (colIndex[campo] ? row.getCell(colIndex[campo]).value : null);

  const wpByCodice = new Map(
    db.prepare('SELECT id, codice FROM work_packages WHERE commessa_id = ?').all(commessa_id)
      .map((w) => [w.codice.toLowerCase(), w.id])
  );

  const insert = db.prepare(`
    INSERT INTO approvazioni_drawings (commessa_id, wp_id, codice, titolo, revisione, data_invio, data_approvazione, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let imported = 0;
  let righeSezione = 0;
  db.transaction(() => {
    for (let r = rigaIntestazione + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const livello = testo(cella(row, 'livello'));
      const area = testo(cella(row, 'area'));
      const ambiente = testo(cella(row, 'ambiente'));
      const loc = testo(cella(row, 'loc'));
      const pm = testo(cella(row, 'pm'));

      // Il nome formale dell'elaborato ("Nome elaborato") non sempre è
      // ancora assegnato: finché manca si usa come titolo provvisorio il
      // primo tra Loc/Ambiente/Area che descrive comunque l'item — è il
      // comportamento della maschera GILI stessa, dove quei campi fanno
      // da nome finché l'elaborato non ha un file. Vera riga di
      // sezione/Livello solo quando non c'è nessuno di questi.
      const titoloEsplicito = testo(cella(row, 'titolo'));
      const titolo = titoloEsplicito || loc || ambiente || area;
      if (!titolo) { righeSezione++; continue; }
      const titoloDaLoc = !titoloEsplicito && titolo === loc;
      const titoloDaAmbiente = !titoloEsplicito && !titoloDaLoc && titolo === ambiente;
      const titoloDaArea = !titoloEsplicito && !titoloDaLoc && !titoloDaAmbiente && titolo === area;

      const codice = testo(cella(row, 'codice')) || testo(cella(row, 'codiceAlt')) || titolo;
      const wpCodiceTxt = testo(cella(row, 'wp'));
      const wpId = wpCodiceTxt ? (wpByCodice.get(wpCodiceTxt.toLowerCase()) || null) : null;
      const revisione = testo(cella(row, 'revisione')) || null;

      const dataInvio = excelDateToISO(cella(row, 'dataInvio'));
      const rawRicevimento = cella(row, 'dataApprovazione');
      const dataApprovazione = excelDateToISO(rawRicevimento);
      const { stato, originaleDaAnnotare } = normalizzaStatoImport(cella(row, 'stato'), !!dataApprovazione);

      const parti = [testo(cella(row, 'note'))];
      if (livello) parti.push(`Livello: ${livello}`);
      if (area && area !== livello && !titoloDaArea) parti.push(`Area: ${area}`);
      if (ambiente && !titoloDaAmbiente) parti.push(`Ambiente: ${ambiente}`);
      if (loc && loc !== ambiente && !titoloDaLoc) parti.push(`Loc: ${loc}`);
      if (pm) parti.push(`PM: ${pm}`);
      // testo libero nelle colonne data quando non è una data valida
      // (es. "Sottomesso", "Da rilevare", "Fissare data")
      const consegnaTxt = !dataInvio ? testo(cella(row, 'dataInvio')) : '';
      if (consegnaTxt) parti.push(`Consegna: ${consegnaTxt}`);
      const attesaTxt = !dataApprovazione ? testo(cella(row, 'dataApprovazioneAttesa')) : '';
      if (attesaTxt && !excelDateToISO(cella(row, 'dataApprovazioneAttesa'))) parti.push(`Approvazione attesa: ${attesaTxt}`);
      else if (excelDateToISO(cella(row, 'dataApprovazioneAttesa')) && !dataApprovazione) {
        parti.push(`Approvazione attesa: ${excelDateToISO(cella(row, 'dataApprovazioneAttesa'))}`);
      }
      if (originaleDaAnnotare) parti.push(`Stato originale: ${originaleDaAnnotare}`);
      const note = parti.filter(Boolean).join(' — ') || null;

      insert.run(commessa_id, wpId, codice, titolo, revisione, dataInvio, dataApprovazione, stato, note);
      imported++;
    }
  })();

  res.status(201).json({ imported, righeSezione });
});

module.exports = router;
