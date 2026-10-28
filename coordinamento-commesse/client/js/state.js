import { api } from './api.js';

// Stato minimo condiviso fra le pagine: commessa selezionata e la sua
// lista di work package (usata ovunque per i filtri a tendina).
const listeners = new Set();

export const state = {
  commesse: [],
  commessaId: null,
  workPackages: [],
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

export async function loadCommesse() {
  const res = await api.get('/commesse');
  state.commesse = res.data;
  const saved = localStorage.getItem('cc.commessaId');
  const stillExists = state.commesse.some((c) => String(c.id) === saved);
  state.commessaId = stillExists ? Number(saved) : (state.commesse[0]?.id ?? null);
  await loadWorkPackages();
  notify();
}

export async function setCommessa(id) {
  state.commessaId = Number(id);
  localStorage.setItem('cc.commessaId', String(state.commessaId));
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

export function wpLabel(wpId) {
  const wp = state.workPackages.find((w) => w.id === wpId);
  return wp ? `${wp.codice} ${wp.nome}` : '—';
}
