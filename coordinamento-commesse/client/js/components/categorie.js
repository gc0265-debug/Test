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
