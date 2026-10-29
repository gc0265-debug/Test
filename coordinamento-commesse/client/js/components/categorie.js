// Liste configurabili dalla pagina Impostazioni (stakeholder_categoria,
// allert_perimetro, comunicazione_frequenza, requisiti_fase). Cache in
// memoria per sessione di navigazione: invalidata quando si salva da
// Impostazioni, così le altre pagine già aperte vedono le modifiche al
// prossimo refresh senza bisogno di un reload completo.

import { api } from '../api.js';

const cache = {};

export async function getCategoria(lista) {
  if (!cache[lista]) cache[lista] = await api.get(`/categorie?lista=${lista}`).then((r) => r.data);
  return cache[lista];
}

export function invalidateCategorie(lista) {
  if (lista) delete cache[lista];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}

export function toMap(list) {
  const m = {};
  list.forEach((i) => { m[i.valore] = i.etichetta; });
  return m;
}

export function toOptions(list) {
  return list.map((i) => [i.valore, i.etichetta]);
}

// Applica le etichette personalizzate (da Impostazioni) a una mappa fissa
// { valore: 'Etichetta' } o { valore: ['Etichetta', variantePillola] }, senza
// toccare il valore né il colore — usata per gli "stato" e campi simili che
// restano vincolati nel codice ma la cui etichetta visualizzata può essere
// rinominata dall'amministratore.
export function mergeLabels(fixedMap, overrideList) {
  const overrides = toMap(overrideList || []);
  const merged = {};
  Object.entries(fixedMap).forEach(([k, v]) => {
    merged[k] = Array.isArray(v) ? [overrides[k] || v[0], ...v.slice(1)] : (overrides[k] || v);
  });
  return merged;
}
