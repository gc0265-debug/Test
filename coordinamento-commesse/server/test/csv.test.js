// Verifica il parser CSV minimale usato dall'import del cronoprogramma in
// Lavorazioni: deve riconoscere da solo il separatore (virgola o punto e
// virgola, come nei CSV esportati da Excel in italiano) e gestire i campi
// fra virgolette con separatori/a-capo al loro interno.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv } = require('../utils/csv');

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
