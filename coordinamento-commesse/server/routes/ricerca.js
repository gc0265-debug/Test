// Ricerca cross-registro: un solo punto d'ingresso che interroga i campi
// testuali dei registri principali invece di dover sapere in anticipo in
// quale di essi si trova un'informazione. Ogni voce di REGISTRI deve
// restare in corrispondenza 1:1 con le chiavi passate a requireSection()
// per la stessa tabella in server/index.js: qui il filtro per sezione è
// rifatto a mano (la ricerca attraversa più tabelle, quindi non può stare
// dietro a un singolo requireSection) e se le due liste divergono un
// cliente rischia di leggere qui dati di una sezione a cui altrove non
// ha accesso.
const express = require('express');
const db = require('../db/database');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { parseSezioni } = require('../utils/auth');

const router = express.Router();

const REGISTRI = [
  {
    tipo: 'criticita', label: 'Registro Criticità', rotta: 'criticita', sezioni: ['criticita'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['tema', 'cosa_serve', 'destinatario', 'note'],
    select: 'tema AS titolo, cosa_serve AS estratto',
    tabella: 'criticita',
  },
  {
    tipo: 'decisioni', label: 'Registro Decisioni', rotta: 'decisioni', sezioni: ['decisioni'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['tema', 'domanda_chiusa', 'a_chi'],
    select: 'tema AS titolo, domanda_chiusa AS estratto',
    tabella: 'decisioni',
  },
  {
    tipo: 'allert', label: 'Registro Allert', rotta: 'allert', sezioni: ['allert'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['descrizione', 'azione_tutela'],
    select: "descrizione AS titolo, azione_tutela AS estratto",
    tabella: 'allert',
  },
  {
    tipo: 'note', label: 'Note di Coordinamento', rotta: 'note', sezioni: ['note'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['oggetto', 'destinatari', 'per_conoscenza'],
    select: "oggetto AS titolo, destinatari AS estratto",
    tabella: 'note_coordinamento',
  },
  {
    tipo: 'diario', label: 'Diario di Cantiere', rotta: 'diario', sezioni: ['diario'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['squadre', 'attivita', 'eventi', 'criticita_testo'],
    select: "('Diario del ' || data) AS titolo, attivita AS estratto",
    tabella: 'diario',
  },
  {
    tipo: 'lavorazioni', label: 'Lavorazioni', rotta: 'lavorazioni', sezioni: ['lavorazioni', 'timeline'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['titolo', 'descrizione'],
    select: 'titolo, descrizione AS estratto',
    tabella: 'lavorazioni',
  },
  {
    tipo: 'milestone', label: 'Timeline Montaggi', rotta: 'timeline', sezioni: ['timeline'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['titolo', 'note'],
    select: 'titolo, note AS estratto',
    tabella: 'milestone',
  },
  {
    tipo: 'maestranze', label: 'Maestranze', rotta: 'maestranze', sezioni: ['maestranze'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['nome', 'azienda', 'ruolo', 'qualifiche'],
    select: 'nome AS titolo, azienda AS estratto',
    tabella: 'maestranze',
  },
  {
    tipo: 'documenti', label: 'Documenti', rotta: 'documenti', sezioni: ['documenti'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['titolo', 'note'],
    select: 'titolo, note AS estratto',
    tabella: 'documenti',
  },
  {
    tipo: 'lezioni', label: 'Lezioni Apprese', rotta: 'lezioni', sezioni: ['lezioni'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['titolo', 'cosa_e_successo', 'cosa_abbiamo_imparato', 'azione_futura'],
    select: 'titolo, cosa_abbiamo_imparato AS estratto',
    tabella: 'lezioni_apprese',
  },
  {
    tipo: 'requisiti', label: 'Requisiti', rotta: 'requisiti', sezioni: ['requisiti', 'capitolato'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['codice_wbs', 'titolo', 'descrizione'],
    select: 'titolo, descrizione AS estratto',
    tabella: 'requisiti',
  },
  {
    tipo: 'capitolato', label: 'Capitolato Requisiti', rotta: 'capitolato', sezioni: ['capitolato'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['codice_wbs', 'titolo', 'descrizione', 'note'],
    select: 'titolo, descrizione AS estratto',
    tabella: 'capitolato_voci',
  },
  {
    tipo: 'contratto', label: 'Contratti', rotta: 'contratto', sezioni: ['contratto'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['titolo', 'controparte', 'note'],
    select: 'titolo, controparte AS estratto',
    tabella: 'contratti',
  },
  {
    tipo: 'stakeholder', label: 'Registro Stakeholder', rotta: 'stakeholder', sezioni: ['stakeholder'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['nome', 'organizzazione', 'ruolo', 'note'],
    select: 'nome AS titolo, organizzazione AS estratto',
    tabella: 'stakeholder',
  },
  {
    tipo: 'comunicazione', label: 'Piano Comunicazioni', rotta: 'comunicazione', sezioni: ['comunicazione'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['nome', 'scopo'],
    select: 'nome AS titolo, scopo AS estratto',
    tabella: 'processi_comunicazione',
  },
  {
    tipo: 'approvazioni-drawings', label: 'Approvazioni Drawings', rotta: 'approvazioni-drawings', sezioni: ['approvazioni-drawings'],
    colonnaCommessa: 'commessa_id', colonneTesto: ['codice', 'titolo', 'note'],
    select: 'titolo, codice AS estratto',
    tabella: 'approvazioni_drawings',
  },
];

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ data: [], total: 0 });
  const like = `%${q}%`;

  // Un cliente vede solo i registri delle sezioni a cui ha accesso,
  // esattamente come le rotte dirette dei singoli registri (requireSection
  // in server/index.js) — qui va rifatto a mano perché la ricerca non
  // passa da nessuna di quelle rotte.
  const consentite = req.user.ruolo === 'cliente' ? parseSezioni(req.user.sezioni_consentite) : null;

  const risultati = [];
  REGISTRI.forEach((r) => {
    if (consentite && !r.sezioni.some((s) => consentite.includes(s))) return;

    const params = [];
    // Il codice commessa arriva da una subquery invece che da un JOIN: con
    // un JOIN su commesse, che ha anche lei colonne "nome"/"note", ogni
    // registro che seleziona un campo con lo stesso nome (es. nome AS
    // titolo in Maestranze) darebbe "ambiguous column name" in sqlite.
    let sql = `SELECT ${r.tabella}.id AS id, ${r.tabella}.commessa_id AS commessa_id, ${r.select},
               (SELECT codice FROM commesse WHERE id = ${r.tabella}.commessa_id) AS commessa_codice
               FROM ${r.tabella} WHERE 1=1`;
    sql = applicaFiltroCommessa(sql, params, req.query, `${r.tabella}.${r.colonnaCommessa}`);
    sql += ` AND (${r.colonneTesto.map((c) => `${r.tabella}.${c} LIKE ?`).join(' OR ')})`;
    sql += ` ORDER BY ${r.tabella}.updated_at DESC LIMIT 15`;
    r.colonneTesto.forEach(() => params.push(like));

    const rows = db.prepare(sql).all(...params);
    rows.forEach((row) => risultati.push({
      tipo: r.tipo, label: r.label, rotta: r.rotta,
      id: row.id, commessa_id: row.commessa_id, commessa_codice: row.commessa_codice,
      titolo: row.titolo, estratto: row.estratto,
    }));
  });

  res.json({ data: risultati, total: risultati.length });
});

module.exports = router;
