import { state } from './state.js';

const routes = {};
let current = null;

// Nessuna rotta è raggiungibile da un cliente per difetto: solo quelle
// elencate nelle sue sezioni_consentite (stesso principio "chiuso per
// difetto" applicato lato server in requireSection).
const ROTTE_SEMPRE_ACCESSIBILI_CLIENTE = new Set([]);

export function route(name, { title, render }) {
  routes[name] = { title, render };
}

function parseHash() {
  const raw = (location.hash || '#/cruscotto').slice(2); // rimuove "#/"
  return raw || 'cruscotto';
}

export async function navigate() {
  const name = parseHash();
  const r = routes[name] || routes.cruscotto;
  current = name in routes ? name : 'cruscotto';

  document.querySelectorAll('.side__nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === current);
  });
  document.getElementById('pageTitle').textContent = r.title;
  document.getElementById('topbarRight').innerHTML = '';

  const content = document.getElementById('content');
  content.innerHTML = '';

  if (state.currentUser?.ruolo === 'cliente') {
    const consentite = new Set(state.currentUser.sezioni_consentite || []);
    if (!ROTTE_SEMPRE_ACCESSIBILI_CLIENTE.has(current) && !consentite.has(current)) {
      content.appendChild(renderAccessoNegato());
      return;
    }
  }

  try {
    await r.render(content);
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(renderError(err));
  }
}

function renderAccessoNegato() {
  const div = document.createElement('div');
  div.className = 'muted';
  div.textContent = 'Non hai accesso a questa sezione.';
  return div;
}

function renderError(err) {
  const div = document.createElement('div');
  div.className = 'muted';
  div.textContent = `Errore nel caricamento: ${err.message || err}`;
  return div;
}

export function startRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function currentRoute() {
  return current;
}
