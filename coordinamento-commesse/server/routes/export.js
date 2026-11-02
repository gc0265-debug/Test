// Esportazione in Excel dei registri — stesso formato con cui vengono
// oggi condivisi con SAC/GILI/Jacob's (Registro Criticità, Registro
// Decisioni) più il Registro Allert.

const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { daysBetween, todayStr, addDays } = require('../utils/dates');

const router = express.Router();

async function sendWorkbook(res, filename, buildSheet) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Field Project SAS — Coordinamento Commesse';
  wb.created = new Date();
  buildSheet(wb);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

function styleHeader(sheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  sheet.columns.forEach((c) => { c.width = Math.max(c.width || 10, 16); });
}

router.get('/criticita/:commessaId', async (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, w.codice AS wp_codice, w.nome AS wp_nome FROM criticita c
    LEFT JOIN work_packages w ON c.wp_id = w.id WHERE c.commessa_id = ?
    ORDER BY (c.urgenza = 'viola') DESC, c.entro_quando ASC
  `).all(req.params.commessaId);
  const oggi = todayStr();
  await sendWorkbook(res, 'registro-criticita.xlsx', (wb) => {
    const sheet = wb.addWorksheet('Registro Criticità');
    sheet.columns = [
      { header: 'WP', key: 'wp' },
      { header: 'Tema', key: 'tema' },
      { header: 'Cosa serve', key: 'cosa_serve' },
      { header: 'Destinatario', key: 'destinatario' },
      { header: 'Urgenza', key: 'urgenza' },
      { header: 'Entro quando', key: 'entro_quando' },
      { header: 'Giorni rimanenti', key: 'giorni_rimanenti' },
      { header: 'Stato', key: 'stato' },
      { header: 'Aperta il', key: 'data_apertura' },
      { header: 'Chiusa il', key: 'data_chiusura' },
      { header: 'Note', key: 'note' },
    ];
    rows.forEach((r) => {
      const giorni = (r.urgenza === 'viola' && r.entro_quando && r.stato !== 'chiusa') ? daysBetween(oggi, r.entro_quando) : '';
      sheet.addRow({
        wp: r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '',
        tema: r.tema, cosa_serve: r.cosa_serve, destinatario: r.destinatario,
        urgenza: r.urgenza, entro_quando: r.entro_quando, giorni_rimanenti: giorni,
        stato: r.stato, data_apertura: r.data_apertura, data_chiusura: r.data_chiusura, note: r.note,
      });
    });
    styleHeader(sheet);
  });
});

router.get('/decisioni/:commessaId', async (req, res) => {
  const rows = db.prepare(`
    SELECT d.*, w.codice AS wp_codice, w.nome AS wp_nome FROM decisioni d
    LEFT JOIN work_packages w ON d.wp_id = w.id WHERE d.commessa_id = ?
    ORDER BY (d.stato != 'decisa') DESC, d.data_prima_richiesta ASC
  `).all(req.params.commessaId);
  const oggi = todayStr();
  await sendWorkbook(res, 'registro-decisioni.xlsx', (wb) => {
    const sheet = wb.addWorksheet('Registro Decisioni');
    sheet.columns = [
      { header: 'WP', key: 'wp' },
      { header: 'Tema', key: 'tema' },
      { header: 'Domanda (SI/NO)', key: 'domanda' },
      { header: 'A chi', key: 'a_chi' },
      { header: 'Prima richiesta', key: 'data_prima_richiesta' },
      { header: 'Anzianità (gg)', key: 'anzianita' },
      { header: 'Stato', key: 'stato' },
      { header: 'Decisa il', key: 'data_decisione' },
      { header: 'Confermata per iscritto', key: 'conferma' },
      { header: 'Riferimento', key: 'rif_conferma' },
      { header: 'Riproposte', key: 'n_riproposte' },
      { header: 'Note', key: 'note' },
    ];
    rows.forEach((r) => {
      const fine = r.stato === 'decisa' && r.data_decisione ? r.data_decisione : oggi;
      sheet.addRow({
        wp: r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '',
        tema: r.tema, domanda: r.domanda_chiusa, a_chi: r.a_chi,
        data_prima_richiesta: r.data_prima_richiesta, anzianita: daysBetween(r.data_prima_richiesta, fine),
        stato: r.stato, data_decisione: r.data_decisione,
        conferma: r.conferma_scritta ? 'Sì' : 'No', rif_conferma: r.rif_conferma,
        n_riproposte: r.n_riproposte, note: r.note,
      });
    });
    styleHeader(sheet);
  });
});

router.get('/allert/:commessaId', async (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, w.codice AS wp_codice, w.nome AS wp_nome FROM allert a
    LEFT JOIN work_packages w ON a.wp_id = w.id WHERE a.commessa_id = ?
    ORDER BY a.data DESC
  `).all(req.params.commessaId);
  await sendWorkbook(res, 'registro-allert.xlsx', (wb) => {
    const sheet = wb.addWorksheet('Registro Allert');
    sheet.columns = [
      { header: 'Data', key: 'data' },
      { header: 'WP', key: 'wp' },
      { header: 'Perimetro', key: 'perimetro' },
      { header: 'Classificazione', key: 'classificazione' },
      { header: 'Descrizione', key: 'descrizione' },
      { header: 'Azione di tutela', key: 'azione_tutela' },
      { header: 'Riferimento', key: 'rif_documento' },
      { header: 'Stato', key: 'stato' },
      { header: 'Note', key: 'note' },
    ];
    rows.forEach((r) => sheet.addRow({
      data: r.data, wp: r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '',
      perimetro: r.perimetro, classificazione: r.classificazione, descrizione: r.descrizione,
      azione_tutela: r.azione_tutela, rif_documento: r.rif_documento, stato: r.stato, note: r.note,
    }));
    styleHeader(sheet);
  });
});

router.get('/lavorazioni/:commessaId', async (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, w.codice AS wp_codice, w.nome AS wp_nome, lp.titolo AS parent_titolo
    FROM lavorazioni l
    LEFT JOIN work_packages w ON l.wp_id = w.id
    LEFT JOIN lavorazioni lp ON l.parent_id = lp.id
    WHERE l.commessa_id = ?
    ORDER BY l.piano IS NULL, l.piano, l.data_inizio
  `).all(req.params.commessaId);
  await sendWorkbook(res, 'lavorazioni.xlsx', (wb) => {
    const sheet = wb.addWorksheet('Lavorazioni');
    sheet.columns = [
      { header: 'WP', key: 'wp' },
      { header: 'Piano', key: 'piano' },
      { header: 'Zona', key: 'zona' },
      { header: 'Titolo', key: 'titolo' },
      { header: 'Sotto-attività di', key: 'parent' },
      { header: 'Stato', key: 'stato' },
      { header: 'Priorità', key: 'priorita' },
      { header: 'Inizio', key: 'data_inizio' },
      { header: 'Fine', key: 'data_fine' },
      { header: 'Impresa', key: 'impresa' },
      { header: 'Descrizione', key: 'descrizione' },
    ];
    rows.forEach((r) => sheet.addRow({
      wp: r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '',
      piano: r.piano, zona: r.zona, titolo: r.titolo, parent: r.parent_titolo || '',
      stato: r.stato, priorita: r.priorita, data_inizio: r.data_inizio, data_fine: r.data_fine,
      impresa: r.impresa, descrizione: r.descrizione,
    }));
    styleHeader(sheet);
  });
});

// Stessi colori di default usati dal Gantt a video (vedi GANTT_COLORI_STATO
// in client/js/pages/timeline.js): qui fissi, perché l'export non ha
// accesso alle preferenze colore salvate nel browser di chi lo scarica.
const COLORE_LAVORAZIONE = { 'da-fare': 'FF8A8A8A', 'in-corso': 'FF2E6FA8', completata: 'FF2E7D5B', bloccata: 'FFC0332B' };
const COLORE_MILESTONE = { pianificata: 'FF8A8A8A', 'in-corso': 'FF2E6FA8', completata: 'FF1A1A1A' };

// Lunedì della settimana che contiene dateStr.
function lunediSettimana(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const giorno = d.getUTCDay() || 7; // domenica=0 -> 7
  return addDays(dateStr, 1 - giorno);
}

router.get('/timeline/:commessaId', async (req, res) => {
  const milestoneRows = db.prepare(`
    SELECT m.*, w.codice AS wp_codice FROM milestone m
    LEFT JOIN work_packages w ON m.wp_id = w.id
    WHERE m.commessa_id = ? AND m.data_inizio IS NOT NULL AND m.data_fine IS NOT NULL
  `).all(req.params.commessaId);
  const lavorazioniRows = db.prepare(`
    SELECT l.*, w.codice AS wp_codice FROM lavorazioni l
    LEFT JOIN work_packages w ON l.wp_id = w.id
    WHERE l.commessa_id = ? AND l.data_inizio IS NOT NULL AND l.data_fine IS NOT NULL
  `).all(req.params.commessaId);

  const items = [
    ...milestoneRows.map((r) => ({
      tipo: 'Milestone', wp: r.wp_codice || '', piano: r.piano || '—', titolo: r.titolo,
      inizio: r.data_inizio, fine: r.data_fine, stato: r.stato,
      colore: COLORE_MILESTONE[r.stato] || COLORE_MILESTONE.pianificata,
    })),
    ...lavorazioniRows.map((r) => ({
      tipo: 'Lavorazione', wp: r.wp_codice || '', piano: r.piano || '—', titolo: r.titolo,
      inizio: r.data_inizio, fine: r.data_fine, stato: r.stato,
      colore: COLORE_LAVORAZIONE[r.stato] || COLORE_LAVORAZIONE['da-fare'],
    })),
  ].sort((a, b) => (a.piano === b.piano ? a.inizio.localeCompare(b.inizio) : a.piano.localeCompare(b.piano)));

  await sendWorkbook(res, 'timeline-gantt.xlsx', (wb) => {
    const datiSheet = wb.addWorksheet('Dati');
    datiSheet.columns = [
      { header: 'Tipo', key: 'tipo' }, { header: 'WP', key: 'wp' }, { header: 'Piano', key: 'piano' },
      { header: 'Attività', key: 'titolo' }, { header: 'Stato', key: 'stato' },
      { header: 'Inizio', key: 'inizio' }, { header: 'Fine', key: 'fine' },
    ];
    items.forEach((it) => datiSheet.addRow(it));
    styleHeader(datiSheet);

    const ganttSheet = wb.addWorksheet('Gantt');
    if (!items.length) {
      ganttSheet.addRow(['Nessuna milestone o lavorazione con date valide da rappresentare.']);
      return;
    }

    const dataMin = items.reduce((m, it) => (it.inizio < m ? it.inizio : m), items[0].inizio);
    const dataMax = items.reduce((m, it) => (it.fine > m ? it.fine : m), items[0].fine);
    const settimane = [];
    for (let s = lunediSettimana(dataMin); s <= dataMax; s = addDays(s, 7)) settimane.push(s);

    ganttSheet.columns = [
      { header: 'Piano', key: 'piano', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 11 },
      { header: 'Attività', key: 'titolo', width: 34 },
      { header: 'Inizio', key: 'inizio', width: 11 },
      { header: 'Fine', key: 'fine', width: 11 },
      ...settimane.map((s, i) => ({ header: s.slice(5), key: `s${i}`, width: 3.5 })),
    ];
    items.forEach((it) => {
      const row = ganttSheet.addRow({ piano: it.piano, tipo: it.tipo, titolo: it.titolo, inizio: it.inizio, fine: it.fine });
      settimane.forEach((s, i) => {
        const fineSettimana = addDays(s, 6);
        if (it.inizio <= fineSettimana && it.fine >= s) {
          row.getCell(`s${i}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: it.colore } };
        }
      });
    });
    // Non si usa styleHeader qui: forzerebbe anche le colonne-settimana a
    // una larghezza minima di 16, vanificando la vista compatta del Gantt.
    ganttSheet.getRow(1).font = { bold: true };
    ganttSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    ganttSheet.getRow(1).alignment = { textRotation: 60, vertical: 'bottom' };
    ganttSheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 1 }];
  });
});

module.exports = router;
