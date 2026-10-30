import { api } from './api.js';

// Stato minimo condiviso fra le pagine: commessa selezionata e la sua
// lista di work package (usata ovunque per i filtri a tendina).
const listeners = new Set();

export const state = {
  commesse: [],
  commessaId: null,
  // Stringa del "gruppo progetto" (es. "RSW Roma") quando è attiva la
  // vista aggregata su più commesse dallo stesso gruppo; null quando è
  // selezionata una singola commessa. I due sono mutuamente esclusivi.
  gruppoAttivo: null,
  workPackages: [],
  currentUser: null,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

// Gruppi progetto con almeno 2 commesse (sotto quella soglia non ha senso
// un'opzione "tutte": è semplicemente l'unica commessa del gruppo).
export function gruppiDisponibili() {
  const conteggio = new Map();
  state.commesse.forEach((c) => { if (c.gruppo) conteggio.set(c.gruppo, (conteggio.get(c.gruppo) || 0) + 1); });
  return [...conteggio.entries()].filter(([, n]) => n >= 2).map(([nome, n]) => ({ nome, n }));
}

export async function loadCommesse() {
  const res = await api.get('/commesse');
  state.commesse = res.data;

  const savedGruppo = localStorage.getItem('cc.gruppoAttivo');
  const gruppoValido = savedGruppo && gruppiDisponibili().some((g) => g.nome === savedGruppo);
  if (gruppoValido) {
    state.gruppoAttivo = savedGruppo;
    state.commessaId = null;
  } else {
    state.gruppoAttivo = null;
    const saved = localStorage.getItem('cc.commessaId');
    const stillExists = state.commesse.some((c) => String(c.id) === saved);
    state.commessaId = stillExists ? Number(saved) : (state.commesse[0]?.id ?? null);
  }
  await loadWorkPackages();
  notify();
}

export async function setCommessa(id) {
  state.commessaId = Number(id);
  state.gruppoAttivo = null;
  localStorage.setItem('cc.commessaId', String(state.commessaId));
  localStorage.removeItem('cc.gruppoAttivo');
  await loadWorkPackages();
  notify();
}

// Attiva la vista aggregata su tutte le commesse che condividono questo
// gruppo. state.commessaId resta null finché non si torna a una commessa
// singola: così ogni pagina non ancora aggiornata per la vista di gruppo
// mostra semplicemente "seleziona una commessa" invece di dati sbagliati.
export async function setGruppo(nome) {
  state.gruppoAttivo = nome;
  state.commessaId = null;
  localStorage.setItem('cc.gruppoAttivo', nome);
  localStorage.removeItem('cc.commessaId');
  await loadWorkPackages();
  notify();
}

export async function loadWorkPackages() {
  if (!state.commessaId) { state.workPackages = []; return; }
  const res = await api.get(`/commesse/${state.commessaId}/wp`);
  state.workPackages = res.data;
}

export function currentCommessa() {
  return state.commesse.find((c) => c.id === state.commessaId) || null;
}

// Oggetto {commessa_id} o {gruppo} coerente con la selezione corrente, da
// unire ad altri parametri con URLSearchParams({...scopeParams(), ...}).
export function scopeParams() {
  return state.gruppoAttivo ? { gruppo: state.gruppoAttivo } : { commessa_id: state.commessaId };
}

// Query string da appendere alle chiamate GET dei registri, coerente con
// la selezione corrente (singola commessa o vista di gruppo aggregata).
export function queryScopeCommessa() {
  return state.gruppoAttivo ? `gruppo=${encodeURIComponent(state.gruppoAttivo)}` : `commessa_id=${state.commessaId}`;
}

export function inVistaGruppo() {
  return !!state.gruppoAttivo;
}

export function wpLabel(wpId) {
  const wp = state.workPackages.find((w) => w.id === wpId);
  return wp ? `${wp.codice} ${wp.nome}` : '—';
}
