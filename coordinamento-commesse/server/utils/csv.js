// Parser CSV minimale, senza dipendenze esterne: supporta campi fra
// virgolette (con separatori, a-capo e virgolette raddoppiate al loro
// interno) e rileva da solo il separatore — virgola o punto e virgola,
// perché Excel in italiano esporta CSV con il punto e virgola (la virgola
// è il separatore decimale).
function rilevaSeparatore(primaRiga) {
  const virgole = (primaRiga.match(/,/g) || []).length;
  const puntiEVirgola = (primaRiga.match(/;/g) || []).length;
  return puntiEVirgola > virgole ? ';' : ',';
}

function parseCsv(testo) {
  const senzaBom = String(testo).replace(/^﻿/, '');
  const primaRigaFine = senzaBom.search(/\r\n|\r|\n/);
  const primaRiga = primaRigaFine === -1 ? senzaBom : senzaBom.slice(0, primaRigaFine);
  const separatore = rilevaSeparatore(primaRiga);

  const righe = [];
  let riga = [];
  let campo = '';
  let dentroVirgolette = false;
  let i = 0;
  const n = senzaBom.length;
  while (i < n) {
    const c = senzaBom[i];
    if (dentroVirgolette) {
      if (c === '"') {
        if (senzaBom[i + 1] === '"') { campo += '"'; i += 2; continue; }
        dentroVirgolette = false; i++; continue;
      }
      campo += c; i++; continue;
    }
    if (c === '"') { dentroVirgolette = true; i++; continue; }
    if (c === separatore) { riga.push(campo); campo = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; i++; continue; }
    campo += c; i++;
  }
  if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga); }
  return righe.filter((r) => r.some((c) => c.trim() !== ''));
}

// Helper condivisi dai vari import CSV (Lavorazioni, Allert, Stakeholder,
// Requisiti, Maestranze...): normalizzazione testo/intestazioni, mappatura
// colonna→indice tramite alias, e data in formato italiano o ISO.
function normalizzaTestoCsv(v) {
  return String(v || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // toglie gli accenti
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

// aliasColonne: { campo: [alias, alias, ...] }, già normalizzati o testo
// semplice — vengono normalizzati anche loro per il confronto.
function mappaColonne(rigaIntestazione, aliasColonne) {
  const intestazione = rigaIntestazione.map(normalizzaTestoCsv);
  const colIndex = {};
  for (const [campo, alias] of Object.entries(aliasColonne)) {
    const aliasNorm = alias.map(normalizzaTestoCsv);
    const idx = intestazione.findIndex((h) => aliasNorm.includes(h));
    if (idx !== -1) colIndex[campo] = idx;
  }
  return colIndex;
}

function parseDataCsv(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const eu = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  return null;
}

module.exports = { parseCsv, normalizzaTestoCsv, mappaColonne, parseDataCsv };
