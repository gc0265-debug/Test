// Converte il contenuto scritto nell'editor di Documenti (formato Delta
// di Quill — https://quilljs.com, un array di {insert, attributes}) in un
// file Word .docx vero e proprio, scaricabile e apribile con Word. Non
// applica il template brandizzato di Field Project (quello resta per le
// Note di Rilascio/Guida): qui il contenuto è quello scritto dall'utente,
// fedele il più possibile a come appare nell'editor.

let docx;
try { docx = require('docx'); } catch { docx = require('/opt/node-tools/node_modules/docx'); }
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, convertInchesToTwip,
} = docx;

// Spezza la sequenza di ops in paragrafi: ogni "\n" chiude il paragrafo
// corrente; se quel carattere di a-capo porta attributi di blocco
// (header, list, blockquote) sono quelli a definire il tipo di paragrafo.
function opsInParagrafi(ops) {
  const paragrafi = [];
  let runsCorrenti = [];

  ops.forEach((op) => {
    if (typeof op.insert !== 'string') return; // embed (immagini ecc.) non supportati in v1
    const attrs = op.attributes || {};
    const parti = op.insert.split('\n');
    parti.forEach((testo, i) => {
      if (testo.length) {
        runsCorrenti.push({
          text: testo,
          bold: !!attrs.bold,
          italics: !!attrs.italic,
          underline: attrs.underline ? {} : undefined,
          strike: !!attrs.strike,
        });
      }
      if (i < parti.length - 1) {
        let blocco = { type: 'paragraph' };
        if (attrs.header) blocco = { type: 'header', level: attrs.header };
        else if (attrs.list) blocco = { type: 'list', kind: attrs.list };
        else if (attrs.blockquote) blocco = { type: 'blockquote' };
        paragrafi.push({ runs: runsCorrenti, block: blocco });
        runsCorrenti = [];
      }
    });
  });
  if (runsCorrenti.length) paragrafi.push({ runs: runsCorrenti, block: { type: 'paragraph' } });
  return paragrafi;
}

const HEADING_MAP = {
  1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
};

function paragrafoDocx(p) {
  const children = p.runs.length
    ? p.runs.map((r) => new TextRun(r))
    : [new TextRun('')];

  if (p.block.type === 'header') {
    return new Paragraph({ heading: HEADING_MAP[p.block.level] || HeadingLevel.HEADING_4, children, spacing: { before: 200, after: 100 } });
  }
  if (p.block.type === 'list') {
    return new Paragraph({
      children,
      numbering: { reference: p.block.kind === 'ordered' ? 'doc-numbered-list' : 'doc-bullet-list', level: 0 },
      spacing: { after: 60 },
    });
  }
  if (p.block.type === 'blockquote') {
    return new Paragraph({ children, indent: { left: convertInchesToTwip(0.4) }, spacing: { after: 100 }, border: { left: { color: '999999', space: 8, style: 'single', size: 12 } } });
  }
  return new Paragraph({ children, spacing: { after: 120 } });
}

function deltaToDocxBuffer(delta) {
  const ops = Array.isArray(delta?.ops) ? delta.ops : [];
  const paragrafi = opsInParagrafi(ops).map(paragrafoDocx);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'doc-bullet-list',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: 'left',
            style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) } } } }],
        },
        {
          reference: 'doc-numbered-list',
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: 'left',
            style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) } } } }],
        },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } },
      children: paragrafi.length ? paragrafi : [new Paragraph({ children: [new TextRun('')] })],
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { deltaToDocxBuffer };
