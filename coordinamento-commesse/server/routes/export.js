// Esportazione in Excel dei registri — stesso formato con cui vengono
// oggi condivisi con SAC/GILI/Jacob's (Registro Criticità, Registro
// Decisioni) più il Registro Allert.

const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db/database');
const { daysBetween, todayStr } = require('../utils/dates');

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

module.exports = router;
