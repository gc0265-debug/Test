// Sezioni disponibili per i Report configurabili: ogni sezione sa come
// pescare i propri dati dal database, applicando i filtri comuni (Work
// Package, periodo) dove la tabella li supporta. Usato sia per la stampa
// PDF sia per gli export Word/Excel: un'unica fonte di dati per i tre
// formati, così restano sempre coerenti fra loro.

const db = require('../db/database');

function humanize(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Aggiunge "AND wp_id = ?" / "AND <colonnaData> BETWEEN ? AND ?" solo se
// la sezione li supporta e il filtro è stato impostato — vedi SEZIONI.
function condizioni(base, params, { wpId, periodoDa, periodoA }, { colonnaWp, colonnaData }) {
  let sql = base;
  if (wpId && colonnaWp) { sql += ` AND ${colonnaWp} = ?`; params.push(wpId); }
  if (colonnaData) {
    if (periodoDa) { sql += ` AND ${colonnaData} >= ?`; params.push(periodoDa); }
    if (periodoA) { sql += ` AND ${colonnaData} <= ?`; params.push(periodoA); }
  }
  return sql;
}

const SEZIONI = [
  {
    key: 'criticita', label: 'Registro Criticità', colonnaWp: 'wp_id', colonnaData: 'data_apertura',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT c.*, w.codice AS wp_codice FROM criticita c LEFT JOIN work_packages w ON c.wp_id = w.id
        WHERE c.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY c.data_apertura DESC`).all(...params);
      return {
        heading: 'Registro Criticità',
        columns: ['Tema', 'WP', 'Urgenza', 'Stato', 'Scadenza'],
        rows: rows.map((r) => [r.tema, r.wp_codice || '—', humanize(r.urgenza), humanize(r.stato), r.entro_quando || '—']),
      };
    },
  },
  {
    key: 'decisioni', label: 'Registro Decisioni', colonnaWp: 'wp_id', colonnaData: 'data_prima_richiesta',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT d.*, w.codice AS wp_codice FROM decisioni d LEFT JOIN work_packages w ON d.wp_id = w.id
        WHERE d.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY d.data_prima_richiesta DESC`).all(...params);
      return {
        heading: 'Registro Decisioni',
        columns: ['Tema', 'WP', 'A chi', 'Prima richiesta', 'Stato'],
        rows: rows.map((r) => [r.tema, r.wp_codice || '—', r.a_chi || '—', r.data_prima_richiesta, humanize(r.stato)]),
      };
    },
  },
  {
    key: 'allert', label: 'Registro Allert', colonnaWp: 'wp_id', colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT a.*, w.codice AS wp_codice FROM allert a LEFT JOIN work_packages w ON a.wp_id = w.id
        WHERE a.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY a.data DESC`).all(...params);
      return {
        heading: 'Registro Allert',
        columns: ['Data', 'Descrizione', 'Perimetro', 'Classificazione', 'Stato'],
        rows: rows.map((r) => [r.data, r.descrizione, humanize(r.perimetro), humanize(r.classificazione), humanize(r.stato)]),
      };
    },
  },
  {
    key: 'lavorazioni', label: 'Lavorazioni', colonnaWp: 'wp_id', colonnaData: null,
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT l.*, w.codice AS wp_codice FROM lavorazioni l LEFT JOIN work_packages w ON l.wp_id = w.id
        WHERE l.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY l.titolo ASC`).all(...params);
      return {
        heading: 'Lavorazioni',
        columns: ['Titolo', 'WP', 'Stato', 'Priorità', 'Impresa'],
        rows: rows.map((r) => [r.titolo, r.wp_codice || '—', humanize(r.stato), humanize(r.priorita), r.impresa || '—']),
      };
    },
  },
  {
    key: 'sal', label: 'SAL — Stato Avanzamento Lavori', colonnaWp: null, colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni('SELECT * FROM sal WHERE commessa_id = ?', params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY sal.numero DESC`).all(...params);
      return {
        heading: 'SAL — Stato Avanzamento Lavori',
        columns: ['N.', 'Data', 'Avanzamento totale', 'Note'],
        rows: rows.map((r) => {
          let avanzamento = '—';
          try { avanzamento = `${JSON.parse(r.dati_json)?.totale?.pct ?? '—'}%`; } catch { /* snapshot non leggibile */ }
          return [r.numero, r.data, avanzamento, r.note || '—'];
        }),
      };
    },
  },
  {
    key: 'timeline', label: 'Timeline Montaggi (Milestone)', colonnaWp: 'wp_id', colonnaData: 'data_inizio',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT m.*, w.codice AS wp_codice FROM milestone m LEFT JOIN work_packages w ON m.wp_id = w.id
        WHERE m.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY m.data_inizio ASC`).all(...params);
      return {
        heading: 'Timeline Montaggi',
        columns: ['Titolo', 'Piano', 'WP', 'Inizio', 'Fine', 'Stato'],
        rows: rows.map((r) => [r.titolo, r.piano || '—', r.wp_codice || '—', r.data_inizio, r.data_fine, humanize(r.stato)]),
      };
    },
  },
  {
    key: 'approvazioni_drawings', label: 'Approvazioni Drawings', colonnaWp: 'wp_id', colonnaData: 'data_invio',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT a.*, w.codice AS wp_codice FROM approvazioni_drawings a LEFT JOIN work_packages w ON a.wp_id = w.id
        WHERE a.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY a.codice ASC`).all(...params);
      return {
        heading: 'Approvazioni Drawings',
        columns: ['Codice', 'Titolo', 'Revisione', 'Emissione', 'Stato', 'Cut-off'],
        rows: rows.map((r) => [r.codice, r.titolo, r.revisione || '—', r.emissione || 'IFA', humanize(r.stato), r.data_limite_approvazione || '—']),
      };
    },
  },
  {
    key: 'response_matrix', label: 'Response Matrix', colonnaWp: null, colonnaData: null,
    raccogli(commessaId) {
      const rows = db.prepare(`
        SELECT dc.*, a.codice AS elaborato_codice, a.titolo AS elaborato_titolo
        FROM drawing_commenti dc JOIN approvazioni_drawings a ON dc.elaborato_id = a.id
        WHERE a.commessa_id = ? ORDER BY a.codice ASC, dc.created_at ASC
      `).all(commessaId);
      return {
        heading: 'Response Matrix',
        columns: ['Elaborato', 'Autore', 'Richiesta', 'Change Order', 'Stato'],
        rows: rows.map((r) => [`${r.elaborato_codice} — ${r.elaborato_titolo}`, r.autore || '—', r.richiesta, r.change_order ? 'Sì' : 'No', humanize(r.stato)]),
      };
    },
  },
  {
    key: 'requisiti', label: 'Requisiti', colonnaWp: 'wp_id', colonnaData: null,
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT r.*, w.codice AS wp_codice FROM requisiti r LEFT JOIN work_packages w ON r.wp_id = w.id
        WHERE r.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY r.codice_wbs ASC`).all(...params);
      return {
        heading: 'Requisiti',
        columns: ['WBS', 'Titolo', 'WP', 'Fase', 'Stato'],
        rows: rows.map((r) => [r.codice_wbs, r.titolo, r.wp_codice || '—', humanize(r.fase), humanize(r.stato)]),
      };
    },
  },
  {
    key: 'contratti', label: 'Contratti', colonnaWp: null, colonnaData: 'data_stipula',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni('SELECT * FROM contratti WHERE commessa_id = ?', params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY contratti.data_stipula DESC`).all(...params);
      return {
        heading: 'Contratti',
        columns: ['Titolo', 'Controparte', 'Valore', 'Stato', 'Stipula'],
        rows: rows.map((r) => [r.titolo, r.controparte || '—', r.valore ? `€ ${Number(r.valore).toLocaleString('it-IT')}` : '—', humanize(r.stato), r.data_stipula || '—']),
      };
    },
  },
  {
    key: 'stakeholder', label: 'Registro Stakeholder', colonnaWp: null, colonnaData: null,
    raccogli(commessaId) {
      const rows = db.prepare("SELECT * FROM stakeholder WHERE commessa_id = ? AND stato = 'attivo' ORDER BY nome ASC").all(commessaId);
      return {
        heading: 'Registro Stakeholder',
        columns: ['Nome', 'Ruolo', 'Categoria', 'Interesse', 'Influenza'],
        rows: rows.map((r) => [r.nome, r.ruolo || '—', humanize(r.categoria), humanize(r.interesse), humanize(r.influenza)]),
      };
    },
  },
  {
    key: 'lezioni_apprese', label: 'Lezioni Apprese', colonnaWp: 'wp_id', colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT l.*, w.codice AS wp_codice FROM lezioni_apprese l LEFT JOIN work_packages w ON l.wp_id = w.id
        WHERE l.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY l.data DESC`).all(...params);
      return {
        heading: 'Lezioni Apprese',
        columns: ['Data', 'Titolo', 'WP', 'Categoria'],
        rows: rows.map((r) => [r.data, r.titolo, r.wp_codice || '—', humanize(r.categoria)]),
      };
    },
  },
  {
    key: 'documenti', label: 'Documenti', colonnaWp: null, colonnaData: null,
    raccogli(commessaId) {
      const rows = db.prepare('SELECT * FROM documenti WHERE commessa_id = ? ORDER BY titolo ASC').all(commessaId);
      return {
        heading: 'Documenti',
        columns: ['Titolo', 'Tipo', 'Link', 'File', 'Note'],
        rows: rows.map((r) => [r.titolo, humanize(r.tipo), r.url || '—', r.file_nome || '—', r.note || '—']),
      };
    },
  },
  {
    key: 'note_coordinamento', label: 'Note di Coordinamento', colonnaWp: null, colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni('SELECT * FROM note_coordinamento WHERE commessa_id = ?', params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY note_coordinamento.data DESC`).all(...params);
      return {
        heading: 'Note di Coordinamento',
        columns: ['Data', 'Oggetto', 'Destinatari', 'Punti', 'Stato'],
        rows: rows.map((r) => {
          let nPunti = 0;
          try { nPunti = JSON.parse(r.punti_json || '[]').length; } catch { /* json non leggibile */ }
          return [r.data, r.oggetto, r.destinatari || '—', nPunti, humanize(r.stato)];
        }),
      };
    },
  },
  {
    key: 'diario', label: 'Diario di Cantiere', colonnaWp: null, colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni('SELECT * FROM diario WHERE commessa_id = ?', params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY diario.data DESC`).all(...params);
      return {
        heading: 'Diario di Cantiere',
        columns: ['Data', 'Squadre', 'Attività', 'Eventi'],
        rows: rows.map((r) => [r.data, r.squadre || '—', r.attivita || '—', r.eventi || '—']),
      };
    },
  },
  {
    key: 'capitolato', label: 'Capitolato Requisiti', colonnaWp: null, colonnaData: 'data',
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni('SELECT * FROM capitolato_voci WHERE commessa_id = ?', params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY capitolato_voci.codice_wbs ASC`).all(...params);
      return {
        heading: 'Capitolato Requisiti',
        columns: ['WBS', 'Titolo', 'Data', 'Note'],
        rows: rows.map((r) => [r.codice_wbs, r.titolo, r.data || '—', r.note || '—']),
      };
    },
  },
  {
    key: 'maestranze', label: 'Maestranze', colonnaWp: 'wp_id', colonnaData: null,
    raccogli(commessaId, filtri) {
      const params = [commessaId];
      const sql = condizioni(`
        SELECT m.*, w.codice AS wp_codice,
          (SELECT GROUP_CONCAT(s.nome, ', ') FROM maestranze_fornitori mf JOIN stakeholder s ON mf.stakeholder_id = s.id WHERE mf.maestranza_id = m.id) AS fornitori_nomi
        FROM maestranze m LEFT JOIN work_packages w ON m.wp_id = w.id
        WHERE m.commessa_id = ?`, params, filtri, this);
      const rows = db.prepare(`${sql} ORDER BY m.nome ASC`).all(...params);
      return {
        heading: 'Maestranze',
        columns: ['Nome', 'Ruolo', 'Fornitori', 'WP', 'Stato'],
        rows: rows.map((r) => [r.nome, r.ruolo || '—', r.fornitori_nomi || r.azienda || '—', r.wp_codice || '—', humanize(r.stato)]),
      };
    },
  },
  {
    key: 'comunicazione', label: 'Piano Comunicazioni', colonnaWp: null, colonnaData: null,
    raccogli(commessaId) {
      const rows = db.prepare('SELECT * FROM processi_comunicazione WHERE commessa_id = ? ORDER BY nome ASC').all(commessaId);
      return {
        heading: 'Piano Comunicazioni',
        columns: ['Processo', 'Frequenza', 'Canale', 'Responsabile'],
        rows: rows.map((r) => [r.nome, humanize(r.frequenza), r.canale || '—', r.ruolo_responsabile || '—']),
      };
    },
  },
];

const SEZIONI_MAP = Object.fromEntries(SEZIONI.map((s) => [s.key, s]));

function elencoSezioni() {
  return SEZIONI.map(({ key, label }) => ({ key, label }));
}

// Raccoglie i dati di tutte le sezioni richieste, nell'ordine in cui
// sono state salvate nella configurazione (non l'ordine fisso di SEZIONI),
// ignorando chiavi non più valide (es. una sezione rimossa in futuro).
function raccogliDati(commessaId, chiaviSezioni, filtri) {
  return chiaviSezioni
    .map((k) => SEZIONI_MAP[k])
    .filter(Boolean)
    .map((s) => s.raccogli(commessaId, filtri));
}

module.exports = { SEZIONI, elencoSezioni, raccogliDati };
