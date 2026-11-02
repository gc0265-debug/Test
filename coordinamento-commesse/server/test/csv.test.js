// Verifica il parser CSV minimale usato dall'import del cronoprogramma in
// Lavorazioni: deve riconoscere da solo il separatore (virgola o punto e
// virgola, come nei CSV esportati da Excel in italiano) e gestire i campi
// fra virgolette con separatori/a-capo al loro interno.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, normalizzaTestoCsv, mappaColonne, parseDataCsv } = require('../utils/csv');

test('parseCsv: separatore virgola, righe semplici', () => {
  const righe = parseCsv('Titolo,WP,Data inizio\nMontaggio A,WP1,2026-01-10\nMontaggio B,WP2,2026-02-01\n');
  assert.deepEqual(righe, [
    ['Titolo', 'WP', 'Data inizio'],
    ['Montaggio A', 'WP1', '2026-01-10'],
    ['Montaggio B', 'WP2', '2026-02-01'],
  ]);
});

test('parseCsv: rileva il punto e virgola quando è il separatore prevalente', () => {
  const righe = parseCsv('Titolo;WP;Data inizio\nMontaggio A;WP1;10/01/2026\n');
  assert.deepEqual(righe, [
    ['Titolo', 'WP', 'Data inizio'],
    ['Montaggio A', 'WP1', '10/01/2026'],
  ]);
});

test('parseCsv: campo fra virgolette con separatore e virgolette raddoppiate al suo interno', () => {
  const righe = parseCsv('Titolo,Note\n"Montaggio, fase 1","Nota con ""virgolette"""\n');
  assert.deepEqual(righe, [
    ['Titolo', 'Note'],
    ['Montaggio, fase 1', 'Nota con "virgolette"'],
  ]);
});

test('parseCsv: righe vuote vengono scartate', () => {
  const righe = parseCsv('Titolo,WP\nA,WP1\n\n\nB,WP2\n');
  assert.deepEqual(righe, [
    ['Titolo', 'WP'],
    ['A', 'WP1'],
    ['B', 'WP2'],
  ]);
});

test('parseCsv: ultima riga senza a-capo finale non viene persa', () => {
  const righe = parseCsv('Titolo,WP\nA,WP1');
  assert.deepEqual(righe, [
    ['Titolo', 'WP'],
    ['A', 'WP1'],
  ]);
});

test('parseCsv: rimuove il BOM iniziale', () => {
  const righe = parseCsv('﻿Titolo,WP\nA,WP1\n');
  assert.equal(righe[0][0], 'Titolo');
});

test('normalizzaTestoCsv: toglie accenti, spazi doppi e maiuscole', () => {
  assert.equal(normalizzaTestoCsv('  Priorità   Massima '), 'priorita massima');
});

test('mappaColonne: trova gli indici anche con intestazioni accentate o maiuscole', () => {
  const idx = mappaColonne(['Titolo', 'Work Package', 'Priorità'], {
    titolo: ['titolo'],
    wp: ['wp', 'work package'],
    priorita: ['priorita'],
    note: ['note'],
  });
  assert.deepEqual(idx, { titolo: 0, wp: 1, priorita: 2 });
});

test('parseDataCsv: riconosce sia GG/MM/AAAA sia AAAA-MM-GG', () => {
  assert.equal(parseDataCsv('05/03/2026'), '2026-03-05');
  assert.equal(parseDataCsv('2026-3-5'), '2026-03-05');
  assert.equal(parseDataCsv(''), null);
  assert.equal(parseDataCsv('non una data'), null);
});
