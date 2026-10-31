import { state } from './state.js';

const routes = {};
let current = null;

// Nessuna rotta è raggiungibile da un cliente per difetto: solo quelle
// elencate nelle sue sezioni_consentite (stesso principio "chiuso per
// difetto" applicato lato server in requireSection).
const ROTTE_SEMPRE_ACCESSIBILI_CLIENTE = new Set([]);

export function route(name, { title, render, help }) {
  routes[name] = { title, render, help };
}

function parseHash() {
  const raw = (location.hash || '#/cruscotto').slice(2); // rimuove "#/"
  return raw || 'cruscotto';
}

// Guida in linea: un pulsante "?" a fianco del titolo di pagina, pilotato
// da qui invece che da ogni singola pagina — il testo arriva dal campo
// help passato a route() in app.js. Il balloon si chiude ad ogni cambio
// di pagina e cliccando fuori da sé.
function setPageHelp(help) {
  const wrap = document.getElementById('pageHelp');
  const bubble = document.getElementById('pageHelpBubble');
  if (!wrap || !bubble) return;
  bubble.hidden = true;
  if (help) {
    wrap.hidden = false;
    bubble.textContent = help;
  } else {
    wrap.hidden = true;
    bubble.textContent = '';
  }
}

function setupPageHelpToggle() {
  const btn = document.getElementById('pageHelpBtn');
  const bubble = document.getElementById('pageHelpBubble');
  if (!btn || !bubble) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    bubble.hidden = !bubble.hidden;
  });
  bubble.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { bubble.hidden = true; });
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
  setPageHelp(r.help);

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
  setupPageHelpToggle();
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function currentRoute() {
  return current;
}
