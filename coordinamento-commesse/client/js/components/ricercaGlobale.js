// Ricerca cross-registro: una casella in topbar, sempre visibile, che
// interroga GET /api/ricerca (server/routes/ricerca.js) invece di dover
// sapere in anticipo in quale registro si trova un'informazione. I
// risultati sono già filtrati dal server sulla stessa commessa/gruppo
// selezionato in sidebar (queryScopeCommessa): cliccandone uno basta
// cambiare pagina, senza bisogno di cambiare anche la commessa.
import { api } from '../api.js';
import { queryScopeCommessa, impostaFocusRiga } from '../state.js';
import { navigate } from '../router.js';

let debounceTimer = null;

function renderRisultati(host, risultati, input) {
  host.innerHTML = '';
  if (!risultati.length) {
    const vuoto = document.createElement('div');
    vuoto.className = 'ricerca-globale__vuoto';
    vuoto.textContent = 'Nessun risultato.';
    host.appendChild(vuoto);
    host.hidden = false;
    return;
  }

  const gruppi = new Map();
  risultati.forEach((r) => {
    if (!gruppi.has(r.label)) gruppi.set(r.label, []);
    gruppi.get(r.label).push(r);
  });

  gruppi.forEach((righe, label) => {
    const intestazione = document.createElement('div');
    intestazione.className = 'ricerca-globale__gruppo';
    intestazione.textContent = label;
    host.appendChild(intestazione);

    righe.forEach((r) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ricerca-globale__item';

      const titolo = document.createElement('span');
      titolo.className = 'ricerca-globale__titolo';
      titolo.textContent = r.titolo || '(senza titolo)';

      const estratto = document.createElement('span');
      estratto.className = 'ricerca-globale__estratto';
      estratto.textContent = [r.commessa_codice, r.estratto].filter(Boolean).join(' · ') || '—';

      item.appendChild(titolo);
      item.appendChild(estratto);
      item.addEventListener('click', () => {
        impostaFocusRiga(r.tipo, r.id);
        input.value = '';
        host.hidden = true;
        host.innerHTML = '';
        if (location.hash === `#/${r.rotta}`) {
          // già sulla pagina giusta: l'hashchange non scatterebbe da solo,
          // quindi richiama direttamente il router per far ricaricare la
          // pagina e consumare il focus appena impostato
          navigate();
        } else {
          location.hash = `#/${r.rotta}`;
        }
      });
      host.appendChild(item);
    });
  });
  host.hidden = false;
}

async function esegui(q, host, input) {
  const query = q.trim();
  if (query.length < 2) { host.hidden = true; host.innerHTML = ''; return; }
  let risultati = [];
  try {
    const res = await api.get(`/ricerca?q=${encodeURIComponent(query)}&${queryScopeCommessa()}`);
    risultati = res.data;
  } catch (_) {
    host.hidden = true;
    return;
  }
  renderRisultati(host, risultati, input);
}

export function initRicercaGlobale() {
  const input = document.getElementById('ricercaGlobaleInput');
  const host = document.getElementById('ricercaGlobaleRisultati');
  if (!input || !host) return;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value;
    debounceTimer = setTimeout(() => esegui(q, host, input), 300);
  });
  input.addEventListener('focus', () => {
    if (host.childElementCount) host.hidden = false;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { host.hidden = true; input.blur(); }
  });
  document.addEventListener('click', (e) => {
    if (e.target !== input && !host.contains(e.target)) host.hidden = true;
  });
}
