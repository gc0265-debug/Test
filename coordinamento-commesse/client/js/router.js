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
  const raw = (location.hash || '#/cruscotto').slice(2).split('?')[0]; // rimuove "#/" e l'eventuale query string
  return raw || 'cruscotto';
}

function parseFocusId() {
  const match = location.hash.match(/[?&]focus=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Apre automaticamente la riga indicata da ?focus=ID nell'hash (usato
// dai link dell'Attività recente del Cruscotto e dalla ricerca globale):
// cerca una riga di tabella con quell'id (vedi data-focus-id in
// renderTable), la mette in vista e simula il click che la apre — sulla
// cella cliccabile se la tabella usa onRowClick, sul pulsante "Modifica"
// altrimenti. Se la riga non c'è più (es. elemento eliminato) non fa nulla.
function apriRigaDaFocus() {
  const id = parseFocusId();
  if (!id) return;
  const tr = document.querySelector(`#content tr[data-focus-id="${CSS.escape(id)}"]`);
  if (tr) {
    tr.scrollIntoView({ block: 'center' });
    const clickable = tr.querySelector('.tw-clickable')
      || Array.from(tr.querySelectorAll('button')).find((b) => /modifica/i.test(b.textContent));
    clickable?.click();
  }
  history.replaceState(null, '', location.hash.replace(/[?&]focus=[^&]+/, ''));
}

// Rende cliccabile il titolo di pagina per tornare indietro: sfrutta la
// cronologia del browser, già alimentata correttamente dai normali link
// di navigazione (ogni cambio di hash vi aggiunge una voce) — nessuno
// stack separato da mantenere.
function setupPageTitleBack() {
  const h1 = document.getElementById('pageTitle');
  if (!h1 || h1.dataset.backWired) return;
  h1.dataset.backWired = '1';
  h1.classList.add('topbar__title--clickable');
  h1.setAttribute('role', 'button');
  h1.setAttribute('tabindex', '0');
  h1.title = 'Torna alla pagina precedente';
  const back = () => history.back();
  h1.addEventListener('click', back);
  h1.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back(); }
  });
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
  content.style.removeProperty('--sticky-head-h');

  if (state.currentUser?.ruolo === 'cliente') {
    const consentite = new Set(state.currentUser.sezioni_consentite || []);
    if (!ROTTE_SEMPRE_ACCESSIBILI_CLIENTE.has(current) && !consentite.has(current)) {
      content.appendChild(renderAccessoNegato());
      return;
    }
  }

  try {
    await r.render(content);
    apriRigaDaFocus();
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
  setupPageTitleBack();
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function currentRoute() {
  return current;
}
