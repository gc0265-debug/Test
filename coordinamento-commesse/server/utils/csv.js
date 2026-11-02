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

module.exports = { parseCsv };
