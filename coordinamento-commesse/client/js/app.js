import { state, loadCommesse, setCommessa, subscribe } from './state.js';
import { route, startRouter, navigate } from './router.js';
import { renderCruscotto } from './pages/cruscotto.js';
import { renderCriticita } from './pages/criticita.js';
import { renderDecisioni } from './pages/decisioni.js';
import { renderNote } from './pages/note.js';
import { renderDiario } from './pages/diario.js';
import { renderLavorazioni } from './pages/lavorazioni.js';
import { renderMaestranze } from './pages/maestranze.js';
import { renderDocumenti } from './pages/documenti.js';
import { renderCommesse } from './pages/commesse.js';

route('cruscotto', { title: 'Cruscotto', render: renderCruscotto });
route('criticita', { title: 'Registro Criticità', render: renderCriticita });
route('decisioni', { title: 'Registro Decisioni', render: renderDecisioni });
route('note', { title: 'Note di Coordinamento', render: renderNote });
route('diario', { title: 'Diario di Cantiere', render: renderDiario });
route('lavorazioni', { title: 'Lavorazioni', render: renderLavorazioni });
route('maestranze', { title: 'Maestranze', render: renderMaestranze });
route('documenti', { title: 'Documenti', render: renderDocumenti });
route('commesse', { title: 'Commesse', render: renderCommesse });

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

async function main() {
  await loadCommesse();
  renderCommessaSelect();
  subscribe(renderCommessaSelect);
  startRouter();
}

main().catch((err) => {
  document.getElementById('content').textContent = `Errore di avvio: ${err.message}. Verifica che il server sia in esecuzione.`;
  console.error(err);
});
