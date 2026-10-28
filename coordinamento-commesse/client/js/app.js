import { state, loadCommesse, setCommessa, subscribe } from './state.js';
import { route, startRouter, navigate } from './router.js';
import { getCurrentUser, logout } from './auth.js';
import { renderLogin } from './pages/login.js';
import { el } from './components/ui.js';
import { renderCruscotto } from './pages/cruscotto.js';
import { renderCriticita } from './pages/criticita.js';
import { renderDecisioni } from './pages/decisioni.js';
import { renderAllert } from './pages/allert.js';
import { renderTimeline } from './pages/timeline.js';
import { renderLezioniApprese } from './pages/lezioniApprese.js';
import { renderRequisiti } from './pages/requisiti.js';
import { renderCapitolato } from './pages/capitolato.js';
import { renderContratto } from './pages/contratto.js';
import { renderStakeholder } from './pages/stakeholder.js';
import { renderComunicazione } from './pages/comunicazione.js';
import { renderNote } from './pages/note.js';
import { renderDiario } from './pages/diario.js';
import { renderLavorazioni } from './pages/lavorazioni.js';
import { renderMaestranze } from './pages/maestranze.js';
import { renderDocumenti } from './pages/documenti.js';
import { renderCommesse } from './pages/commesse.js';
import { renderUtenti } from './pages/utenti.js';

route('cruscotto', { title: 'Cruscotto', render: renderCruscotto });
route('criticita', { title: 'Registro Criticità', render: renderCriticita });
route('decisioni', { title: 'Registro Decisioni', render: renderDecisioni });
route('allert', { title: 'Registro Allert', render: renderAllert });
route('timeline', { title: 'Timeline Montaggi', render: renderTimeline });
route('lezioni', { title: 'Lezioni Apprese', render: renderLezioniApprese });
route('requisiti', { title: 'Requisiti', render: renderRequisiti });
route('capitolato', { title: 'Capitolato', render: renderCapitolato });
route('contratto', { title: 'Contratto', render: renderContratto });
route('stakeholder', { title: 'Registro Stakeholder', render: renderStakeholder });
route('comunicazione', { title: 'Piano Comunicazioni', render: renderComunicazione });
route('note', { title: 'Note di Coordinamento', render: renderNote });
route('diario', { title: 'Diario di Cantiere', render: renderDiario });
route('lavorazioni', { title: 'Lavorazioni', render: renderLavorazioni });
route('maestranze', { title: 'Maestranze', render: renderMaestranze });
route('documenti', { title: 'Documenti', render: renderDocumenti });
route('commesse', { title: 'Commesse', render: renderCommesse });
route('utenti', { title: 'Utenti', render: renderUtenti });

function renderCommessaSelect() {
  const select = document.getElementById('commessaSelect');
  select.innerHTML = '';
  state.commesse.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.codice} — ${c.nome}`;
    if (c.id === state.commessaId) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = async (e) => {
    await setCommessa(e.target.value);
    navigate();
  };
}

function renderUserBadge(user) {
  const host = document.getElementById('sideUser');
  host.innerHTML = '';
  host.appendChild(el('div', { class: 'side-user' }, [
    el('div', {}, [
      el('div', { class: 'side-user__nome' }, user.nome),
      el('div', { class: 'side-user__ruolo' }, user.ruolo === 'admin' ? 'Amministratore' : 'Operatore'),
    ]),
    el('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: async () => { await logout(); window.location.reload(); },
    }, 'Esci'),
  ]));
}

async function main() {
  const user = await getCurrentUser();
  if (!user) { renderLogin(); return; }

  renderUserBadge(user);
  document.querySelectorAll('[data-admin-only]').forEach((n) => { n.style.display = user.ruolo === 'admin' ? '' : 'none'; });

  await loadCommesse();
  renderCommessaSelect();
  subscribe(renderCommessaSelect);
  startRouter();
}

main().catch((err) => {
  document.getElementById('content').textContent = `Errore di avvio: ${err.message}. Verifica che il server sia in esecuzione.`;
  console.error(err);
});
