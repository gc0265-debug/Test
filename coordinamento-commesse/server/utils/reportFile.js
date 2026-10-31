// Genera il file di un Report configurato (vedi reportSezioni.js per i
// dati) nei tre formati richiesti: PDF (pdfkit, per la stampa e per
// l'allegato email), Word (docx) ed Excel (ExcelJS, già usato altrove
// nell'app per import/export). Le sezioni {heading, columns, rows} sono
// le stesse per tutti e tre i formati: un'unica fonte di dati.

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
let docx;
try { docx = require('docx'); } catch { docx = require('/opt/node-tools/node_modules/docx'); }
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
} = docx;

const NAVY = '1F3A4D';
const RED = 'C0332B';
const GRAY = '666666';

function descrizioneFiltri({ wpLabel, periodoDa, periodoA }) {
  const parti = [];
  parti.push(wpLabel ? `Work Package: ${wpLabel}` : 'Tutti i Work Package');
  if (periodoDa || periodoA) parti.push(`Periodo: ${periodoDa || '…'} → ${periodoA || '…'}`);
  return parti.join(' · ');
}

// ---------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------

function disegnaTabellaPdf(doc, sezione, startX, maxWidth) {
  const { columns, rows } = sezione;
  const colWidth = maxWidth / columns.length;
  const padding = 4;

  function servePageBreak(altezza) {
    if (doc.y + altezza > doc.page.height - doc.page.margins.bottom) doc.addPage();
  }

  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY);
  const altezzaHeader = Math.max(...columns.map((c) => doc.heightOfString(c, { width: colWidth - padding * 2 }))) + padding * 2;
  servePageBreak(altezzaHeader);
  const yHeader = doc.y;
  columns.forEach((c, i) => doc.text(c.toUpperCase(), startX + i * colWidth + padding, yHeader, { width: colWidth - padding * 2 }));
  doc.moveTo(startX, yHeader + altezzaHeader - 2).lineTo(startX + maxWidth, yHeader + altezzaHeader - 2).strokeColor('#1A1A1A').lineWidth(1).stroke();
  doc.y = yHeader + altezzaHeader;

  doc.font('Helvetica').fontSize(8.5).fillColor('#262626');
  if (!rows.length) {
    servePageBreak(16);
    doc.text('Nessun elemento.', startX, doc.y + 4, { width: maxWidth });
    doc.moveDown(0.6);
    return;
  }
  rows.forEach((row) => {
    const altezzeCelle = row.map((v) => doc.heightOfString(String(v ?? '—'), { width: colWidth - padding * 2 }));
    const altezzaRiga = Math.max(...altezzeCelle) + padding * 2;
    servePageBreak(altezzaRiga);
    const yRiga = doc.y;
    row.forEach((v, i) => doc.text(String(v ?? '—'), startX + i * colWidth + padding, yRiga + padding / 2, { width: colWidth - padding * 2 }));
    doc.moveTo(startX, yRiga + altezzaRiga).lineTo(startX + maxWidth, yRiga + altezzaRiga).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
    doc.y = yRiga + altezzaRiga;
  });
  doc.moveDown(0.8);
}

function generaPdfBuffer({ nome, commessa, sezioniDati, filtri }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 44, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const startX = doc.page.margins.left;
    const maxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(17).fillColor(NAVY).text(nome, startX, doc.y);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text(`${commessa.codice} — ${commessa.nome} · ${new Date().toLocaleDateString('it-IT')}`);
    doc.fontSize(8.5).fillColor(GRAY).text(descrizioneFiltri(filtri));
    doc.moveDown(0.8);

    sezioniDati.forEach((sezione) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(RED).text(sezione.heading, startX);
      doc.moveDown(0.3);
      disegnaTabellaPdf(doc, sezione, startX, maxWidth);
    });

    doc.end();
  });
}

// ---------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------

const CONTENT_WIDTH_DXA = 9500;

function tabellaDocx(sezione) {
  const nCol = sezione.columns.length;
  const colWidth = Math.floor(CONTENT_WIDTH_DXA / nCol);
  const cell = (text, isHeader) => new TableCell({
    width: { size: colWidth, type: WidthType.DXA },
    shading: isHeader ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), bold: isHeader, color: isHeader ? 'FFFFFF' : '262626', size: 17 })] })],
  });
  const righe = [new TableRow({ children: sezione.columns.map((c) => cell(c, true)) })];
  if (!sezione.rows.length) {
    righe.push(new TableRow({ children: [new TableCell({
      columnSpan: nCol, children: [new Paragraph({ children: [new TextRun({ text: 'Nessun elemento.', italics: true, color: '666666', size: 17 })] })],
    })] }));
  } else {
    sezione.rows.forEach((row) => righe.push(new TableRow({ children: row.map((v) => cell(v, false)) })));
  }
  return new Table({ width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: sezione.columns.map(() => colWidth), rows: righe });
}

async function generaDocxBuffer({ nome, commessa, sezioniDati, filtri }) {
  const children = [
    new Paragraph({ children: [new TextRun({ text: nome, bold: true, color: NAVY, size: 32 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `${commessa.codice} — ${commessa.nome} · ${new Date().toLocaleDateString('it-IT')}`, color: '666666', size: 19 })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: descrizioneFiltri(filtri), color: '666666', size: 17, italics: true })], spacing: { after: 240 } }),
  ];
  sezioniDati.forEach((sezione) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, children: [new TextRun({ text: sezione.heading, bold: true, color: RED, size: 23 })] }));
    children.push(tabellaDocx(sezione));
  });

  const doc = new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------

function nomeFoglioValido(heading, usati) {
  let base = heading.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31).trim() || 'Foglio';
  let nome = base;
  let n = 2;
  while (usati.has(nome)) { nome = `${base.slice(0, 28)} (${n})`; n += 1; }
  usati.add(nome);
  return nome;
}

async function generaXlsxBuffer({ nome, commessa, sezioniDati, filtri }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Coordinamento Commesse — Field Project SAS';
  wb.created = new Date();
  const usati = new Set();

  sezioniDati.forEach((sezione) => {
    const ws = wb.addWorksheet(nomeFoglioValido(sezione.heading, usati));
    ws.addRow([nome]).font = { bold: true, size: 13 };
    ws.addRow([`${commessa.codice} — ${commessa.nome}`, descrizioneFiltri(filtri)]);
    ws.addRow([]);
    const headerRow = ws.addRow(sezione.columns);
    headerRow.font = { bold: true };
    headerRow.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A4D' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
    sezione.rows.forEach((row) => ws.addRow(row.map((v) => (v === null || v === undefined ? '—' : v))));
    ws.columns.forEach((col) => { col.width = 24; });
  });

  return wb.xlsx.writeBuffer();
}

module.exports = { generaPdfBuffer, generaDocxBuffer, generaXlsxBuffer };
