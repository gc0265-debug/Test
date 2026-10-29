// mergeLabels è il cuore delle "etichette di stato personalizzabili":
// deve sostituire solo il testo mostrato, senza mai toccare il valore
// né gli altri elementi della mappa (es. il colore del grafico). Una
// versione precedente troncava a 2 elementi qualunque array più lungo,
// perdendo il colore nei grafici di Lavorazioni — questo test blocca
// una regressione dello stesso tipo.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeLabels } from '../../client/js/components/categorie.js';

test('mergeLabels: senza override restituisce la mappa fissa invariata', () => {
  const fixed = { bozza: ['Bozza', 'outline'], approvato: ['Approvato', 'verde'] };
  assert.deepEqual(mergeLabels(fixed, []), fixed);
});

test('mergeLabels: sostituisce solo l\'etichetta, preservando valore e colore', () => {
  const fixed = { 'da-fare': ['Da fare', 'outline', 'var(--ink-3)'] };
  const overrides = [{ valore: 'da-fare', etichetta: 'Da avviare' }];
  const merged = mergeLabels(fixed, overrides);
  assert.deepEqual(merged['da-fare'], ['Da avviare', 'outline', 'var(--ink-3)']);
});

test('mergeLabels: preserva tutti gli elementi oltre al secondo (non solo i primi due)', () => {
  const fixed = { bloccata: ['Bloccata', 'rosso', 'var(--red)', 'extra'] };
  const overrides = [{ valore: 'bloccata', etichetta: 'In stallo' }];
  const merged = mergeLabels(fixed, overrides);
  assert.deepEqual(merged.bloccata, ['In stallo', 'rosso', 'var(--red)', 'extra']);
});

test('mergeLabels: funziona anche su mappe valore→stringa (non array)', () => {
  const fixed = { attivo: 'Attivo', chiuso: 'Chiuso' };
  const overrides = [{ valore: 'chiuso', etichetta: 'Concluso' }];
  const merged = mergeLabels(fixed, overrides);
  assert.equal(merged.attivo, 'Attivo');
  assert.equal(merged.chiuso, 'Concluso');
});

test('mergeLabels: una chiave senza override resta quella fissa', () => {
  const fixed = { a: ['A', 'x'], b: ['B', 'y'] };
  const overrides = [{ valore: 'a', etichetta: 'A rinominata' }];
  const merged = mergeLabels(fixed, overrides);
  assert.deepEqual(merged.a, ['A rinominata', 'x']);
  assert.deepEqual(merged.b, ['B', 'y']);
});
