// Cruscotto — home page della commessa. In cima una barra a tutta
// larghezza con le scadenze della settimana già visibili (niente click
// per aprirle); al centro una griglia compatta di box per sezione, con
// titolo cliccabile che apre il dettaglio in una finestra modale; in
// fondo una barra a tutta larghezza con la cronologia delle ultime
// modifiche, scorrevole come un elenco.

import { api } from '../api.js';
import { state, currentCommessa } from '../state.js';
import { el, formatDate, formatDateTime, openModal, textInput, dateInput, toast, confirmDialog, todayISO } from '../components/ui.js';
import { printReport } from '../components/report.js';

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

const AZIONE_LABEL = {
  creata: 'Creata', modificata: 'Modificata', chiusa: 'Chiusa',
  riaperta: 'Riaperta', eliminata: 'Eliminata', rilancio: 'Rilanciata',
};
const ENTITY_LABEL = {
  criticita: 'Criticità', decisioni: 'Decisione', allert: 'Allert', milestone: 'Milestone', lezioni_apprese: 'Lezione appresa',
  requisiti: 'Requisito', contratti: 'Contratto', stakeholder: 'Stakeholder', processi_comunicazione: 'Processo comunicazione',
  capitolato_voci: 'Voce di capitolato', sal: 'SAL',
};

function tile(label, value, cls, sub) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile__label' }, label),
    el('div', { class: 'tile__value' + (cls ? ' ' + cls : '') }, String(value)),
    sub ? el('div', { class: 'tile__sub' }, sub) : null,
  ]);
}

function reminderList(items, emptyLabel) {
  return items.length
    ? el('div', { class: 'reminder-list' }, items)
    : el('p', { class: 'muted' }, emptyLabel);
}

// Un box della griglia centrale: titolo cliccabile (apre la lista
// completa in modale, se buildModal è passato), i tile con i numeri, e
// un link per aprire la scheda completa.
function box(title, tiles, { buildModal, openHref, openLabel } = {}) {
  const titleEl = buildModal
    ? el('button', { type: 'button', class: 'cruscotto-box__title', onclick: () => openModal(title, buildModal()) }, title)
    : el('div', { class: 'cruscotto-box__title cruscotto-box__title--static' }, title);
  return el('div', { class: 'cruscotto-box card card--compact' }, [
    titleEl,
    el('div', { class: 'tiles' }, tiles),
    openHref ? el('a', { href: openHref, class: 'btn btn--sm', style: 'margin-top:8px' }, openLabel || 'Apri →') : null,
  ]);
}

// Barra orizzontale in cima: le scadenze della settimana già visibili
// come fila di schede scorrevole, niente click per vederle.
const TIPO_SCADENZA = {
  milestone: { icona: '◈', href: '#/timeline', label: 'Milestone' },
  criticita: { icona: '▲', href: '#/criticita', label: 'Criticità' },
  todo: { icona: '✓', href: '#/cruscotto', label: 'To-do' },
};

function scadenzeBar(dash, commessa) {
  const scadute = dash.scadenze_settimana.filter((s) => s.giorni < 0).length;
  const chips = dash.scadenze_settimana.map((s) => {
    const info = TIPO_SCADENZA[s.tipo] || TIPO_SCADENZA.criticita;
    return el('a', {
      href: info.href,
      class: 'scadenza-chip' + (s.giorni < 0 ? ' alert' : (s.giorni <= 3 ? ' warn' : '')),
    }, [
      el('div', { class: 'scadenza-chip__titolo' }, `${info.icona} ${s.titolo}`),
      el('div', { class: 'scadenza-chip__meta' }, [
        el('span', {}, formatDate(s.data)),
        el('span', { class: 'scadenza-chip__gg' }, s.giorni < 0 ? `scaduta da ${Math.abs(s.giorni)} gg` : `tra ${s.giorni} gg`),
      ]),
    ]);
  });

  return el('div', { class: 'cruscotto-scadenze' }, [
    el('div', { class: 'cruscotto-scadenze__head' }, [
      el('div', { class: 'cruscotto-scadenze__titolo' }, [
        'Scadenze della settimana',
        el('span', { class: 'pill' + (scadute > 0 ? ' pill--rosso' : ' pill--outline') },
          `${dash.scadenze_settimana.length} nei prossimi 7 giorni${scadute ? ` · ${scadute} scadute` : ''}`),
      ]),
      el('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => printReport('Scadenze della settimana', commessa, [{
        heading: 'Prossimi 7 giorni',
        columns: ['Tipo', 'Voce', 'Data', 'Giorni'],
        rows: dash.scadenze_settimana.map((s) => [
          (TIPO_SCADENZA[s.tipo] || TIPO_SCADENZA.criticita).label, s.titolo, formatDate(s.data),
          s.giorni < 0 ? `scaduta da ${Math.abs(s.giorni)} gg` : `${s.giorni} gg`,
        ]),
      }]) }, 'Stampa'),
    ]),
    chips.length
      ? el('div', { class: 'cruscotto-scadenze__row' }, chips)
      : el('p', { class: 'muted', style: 'margin:4px 0 0' }, 'Nessuna scadenza nei prossimi 7 giorni.'),
  ]);
}

// Barra orizzontale in fondo: cronologia delle ultime modifiche, in
// righe scorrevoli come un elenco, senza bisogno di aprirla in modale.
// Collassabile (stato ricordato tra una visita e l'altra del Cruscotto):
// utile perché può diventare lunga e non è la prima cosa da guardare ogni
// volta che si apre la home page.
const CHIAVE_COLLASSATA = 'cc.cruscottoAttivitaCollassata';

function attivitaBar(attivita) {
  let collassata = false;
  try { collassata = localStorage.getItem(CHIAVE_COLLASSATA) === '1'; } catch (_) { /* privacy mode: parte sempre aperta */ }

  const chevron = el('span', { class: 'gantt__chevron' + (collassata ? ' gantt__chevron--collapsed' : '') }, '▾');
  const scrollHost = el('div', { class: 'cruscotto-attivita__scroll' }, [
    el('div', { class: 'activity-list' }, attivita.map((a) => el('div', { class: 'activity-item' }, [
      el('span', { class: 'activity-item__tipo' }, ENTITY_LABEL[a.entity_type] || a.entity_type),
      el('span', {}, `${AZIONE_LABEL[a.azione] || a.azione}${a.dettaglio ? ' — ' + a.dettaglio : ''}`),
      el('span', { class: 'activity-item__meta' }, `${a.utente || '—'} · ${formatDateTime(a.created_at)}`),
    ]))),
  ]);
  scrollHost.hidden = collassata;

  const head = el('div', { class: 'cruscotto-attivita__head', onclick: () => {
    collassata = !collassata;
    scrollHost.hidden = collassata;
    chevron.classList.toggle('gantt__chevron--collapsed', collassata);
    try { localStorage.setItem(CHIAVE_COLLASSATA, collassata ? '1' : '0'); } catch (_) { /* vedi sopra */ }
  } }, [
    el('div', { class: 'cruscotto-attivita__titolo' }, [chevron, 'Attività recente']),
    el('span', { class: 'muted', style: 'font-size:11px' }, `${attivita.length} ultime registrate`),
  ]);

  return el('div', { class: 'cruscotto-attivita' }, [head, scrollHost]);
}

// Box "To-do e note veloci": appunti rapidi con scadenza facoltativa
// impostata a mano da chi la scrive. Chi ha una scadenza vicina o scaduta
// compare anche tra le "Scadenze della settimana" in cima (vedi
// server/routes/dashboard.js), sullo stesso meccanismo già in uso per
// criticità urgenti e milestone.
async function todoBox(onCambiamento) {
  let righe = [];
  let mostraCompletati = false;

  const listHost = el('div', { class: 'cruscotto-todo__lista' });
  const testoInput = textInput('todo_testo', '', { placeholder: 'Nuovo promemoria o nota veloce…' });
  const scadenzaInput = dateInput('todo_scadenza', '');
  const toggleCompletati = el('button', { type: 'button', class: 'btn btn--sm btn--ghost' });

  async function refresh() {
    const res = await api.get(`/todo?commessa_id=${state.commessaId}`);
    righe = res.data;
    disegna();
  }

  async function aggiungi() {
    const testo = testoInput.value.trim();
    if (!testo) return;
    try {
      await api.post('/todo', { commessa_id: state.commessaId, testo, scadenza: scadenzaInput.value || null });
      testoInput.value = '';
      scadenzaInput.value = '';
      await refresh();
      await onCambiamento?.();
    } catch (err) {
      toast(err.message, { error: true });
    }
  }
  testoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') aggiungi(); });

  async function toggleFatto(riga) {
    try {
      await api.put(`/todo/${riga.id}`, { fatto: riga.fatto ? 0 : 1, _versione: riga.updated_at });
      await refresh();
      await onCambiamento?.();
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  async function elimina(riga) {
    if (!confirmDialog('Eliminare questo promemoria?')) return;
    try {
      await api.del(`/todo/${riga.id}`);
      await refresh();
      await onCambiamento?.();
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  function rigaTodo(riga) {
    const oggi = todayISO();
    const giorni = riga.scadenza ? daysBetween(oggi, riga.scadenza) : null;
    const urgenza = riga.fatto || giorni === null ? '' : (giorni < 0 ? ' cruscotto-todo__item--alert' : (giorni <= 3 ? ' cruscotto-todo__item--warn' : ''));
    return el('div', { class: 'cruscotto-todo__item' + (riga.fatto ? ' cruscotto-todo__item--fatto' : '') + urgenza }, [
      el('input', { type: 'checkbox', checked: !!riga.fatto, onchange: () => toggleFatto(riga) }),
      el('span', { class: 'cruscotto-todo__testo' }, riga.testo),
      riga.scadenza ? el('span', { class: 'cruscotto-todo__scadenza' },
        riga.fatto ? formatDate(riga.scadenza) : (giorni < 0 ? `scaduta da ${Math.abs(giorni)} gg` : (giorni === 0 ? 'scade oggi' : `tra ${giorni} gg`))) : null,
      el('button', { type: 'button', class: 'btn btn--sm btn--ghost btn--danger', title: 'Elimina', onclick: () => elimina(riga) }, '×'),
    ]);
  }

  function disegna() {
    const aperti = righe.filter((r) => !r.fatto);
    const completati = righe.filter((r) => r.fatto);
    toggleCompletati.textContent = mostraCompletati ? 'Nascondi completati' : `Mostra completati (${completati.length})`;
    toggleCompletati.hidden = completati.length === 0;

    listHost.innerHTML = '';
    if (!aperti.length && !mostraCompletati) {
      listHost.appendChild(el('p', { class: 'muted', style: 'margin:4px 0 0' }, 'Nessun promemoria aperto.'));
    } else {
      aperti.forEach((r) => listHost.appendChild(rigaTodo(r)));
      if (mostraCompletati) completati.forEach((r) => listHost.appendChild(rigaTodo(r)));
    }
  }
  toggleCompletati.onclick = () => { mostraCompletati = !mostraCompletati; disegna(); };

  await refresh();

  return el('div', { class: 'cruscotto-todo' }, [
    el('div', { class: 'cruscotto-todo__head' }, [
      el('div', { class: 'cruscotto-attivita__titolo' }, 'To-do e note veloci'),
      toggleCompletati,
    ]),
    el('div', { class: 'cruscotto-todo__form' }, [
      testoInput,
      scadenzaInput,
      el('button', { type: 'button', class: 'btn btn--sm btn--primary', onclick: aggiungi }, '+ Aggiungi'),
    ]),
    listHost,
  ]);
}

export async function renderCruscotto(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' },
      state.gruppoAttivo
        ? 'Il Cruscotto mostra sempre una singola commessa: seleziona una commessa specifica dal menu a sinistra (invece della vista di gruppo) per vederlo.'
        : 'Nessuna commessa disponibile: creane una dalla sezione Commesse.'));
    return;
  }
  const commessa = currentCommessa();
  const dash = await api.get(`/dashboard/${state.commessaId}`);

  container.appendChild(el('div', { class: 'cruscotto-head' }, [
    el('div', {}, [
      el('div', { class: 'eyebrow' }, commessa.codice),
      el('h2', {}, commessa.nome),
    ]),
    el('p', { class: 'muted', style: 'margin:0' }, [commessa.cliente, commessa.gc && `GC ${commessa.gc}`, commessa.dl && `DL ${commessa.dl}`].filter(Boolean).join(' · ')),
  ]));

  const scadenzeHost = el('div');
  container.appendChild(scadenzeHost);
  scadenzeHost.appendChild(scadenzeBar(dash, commessa));

  // Aggiungere/completare/eliminare un to-do può far entrare o uscire una
  // voce dalle "Scadenze della settimana" in cima: si ricarica solo quella
  // barra, non tutta la pagina.
  async function refreshScadenze() {
    const freshDash = await api.get(`/dashboard/${state.commessaId}`);
    scadenzeHost.innerHTML = '';
    scadenzeHost.appendChild(scadenzeBar(freshDash, commessa));
  }

  container.appendChild(await todoBox(refreshScadenze));

  const grid = el('div', { class: 'cruscotto-grid' });
  container.appendChild(grid);

  grid.appendChild(box('Registro Criticità', [
    tile('Aperte', dash.criticita.aperte),
    tile('Urgenti (viola)', dash.criticita.viola_aperte, dash.criticita.viola_aperte > 0 ? 'warn' : ''),
    tile('In scadenza (≤3gg)', dash.criticita.in_scadenza_3gg, dash.criticita.in_scadenza_3gg > 0 ? 'warn' : ''),
    tile('Urgenti scadute', dash.criticita.viola_scadute, dash.criticita.viola_scadute > 0 ? 'alert' : ''),
    tile('Dovute da controparte', dash.criticita.verde_aperte),
  ], {
    buildModal: () => reminderList(dash.criticita.prossime_scadenze.map((s) => el('a', {
      href: '#/criticita',
      class: 'reminder-item' + (s.giorni_rimanenti < 0 ? ' alert' : ''),
    }, [
      el('span', {}, s.tema),
      el('span', { class: 'reminder-item__gg' }, s.giorni_rimanenti < 0 ? `scaduta da ${Math.abs(s.giorni_rimanenti)} gg` : `${s.giorni_rimanenti} gg`),
    ])), 'Nessuna scadenza imminente.'),
    openHref: '#/criticita', openLabel: 'Apri il registro →',
  }));

  grid.appendChild(box('Milestone / Montaggi', [
    tile('Aperte', dash.milestone.aperte),
    tile('In scadenza (≤7gg)', dash.milestone.in_scadenza_7gg, dash.milestone.in_scadenza_7gg > 0 ? 'warn' : ''),
    tile('In ritardo', dash.milestone.in_ritardo, dash.milestone.in_ritardo > 0 ? 'alert' : ''),
  ], { openHref: '#/timeline', openLabel: 'Apri la timeline →' }));

  grid.appendChild(box('Registro Decisioni', [
    tile('Pendenze aperte', dash.decisioni.pendenze_aperte),
    tile('Oltre 21 giorni', dash.decisioni.oltre_21gg, dash.decisioni.oltre_21gg > 0 ? 'alert' : ''),
    tile('Tasso di resa', `${dash.decisioni.tasso_resa_pct}%`),
    tile('Anzianità media', `${dash.decisioni.anzianita_media_gg} gg`, dash.decisioni.anzianita_media_gg > 21 ? 'warn' : ''),
    tile('Confermate per iscritto', `${dash.decisioni.confermate_iscritto_pct}%`),
  ], { openHref: '#/decisioni', openLabel: 'Apri il registro →' }));

  grid.appendChild(box('Lavorazioni', [
    tile('Da fare', dash.lavorazioni['da-fare']),
    tile('In corso', dash.lavorazioni['in-corso']),
    tile('Completate', dash.lavorazioni.completata),
    tile('Bloccate', dash.lavorazioni.bloccata, dash.lavorazioni.bloccata > 0 ? 'alert' : ''),
  ], { openHref: '#/lavorazioni', openLabel: 'Apri le lavorazioni →' }));

  grid.appendChild(box('Requisiti & Contratti', [
    tile('Requisiti totali', dash.requisiti.totali),
    tile('Approvati', dash.requisiti.approvati),
    tile('In revisione', dash.requisiti.in_revisione, dash.requisiti.in_revisione > 0 ? 'warn' : ''),
    tile('Variazioni da gestire', dash.contratto.variazioni_da_gestire, dash.contratto.variazioni_da_gestire > 0 ? 'alert' : ''),
  ], { openHref: '#/requisiti', openLabel: 'Apri i requisiti →' }));

  grid.appendChild(box('Response Matrix', [
    tile('Commenti aperti', dash.response_matrix.aperti, dash.response_matrix.aperti > 0 ? 'warn' : ''),
    tile('Change Order aperti', dash.response_matrix.change_order_aperti, dash.response_matrix.change_order_aperti > 0 ? 'alert' : ''),
    tile('Commenti totali', dash.response_matrix.totali),
  ], { openHref: '#/approvazioni-drawings', openLabel: 'Apri Approvazioni Drawings →' }));

  grid.appendChild(box('Stakeholder', [
    tile('Attivi', dash.stakeholder.totali),
    tile('Interesse e influenza alti', dash.stakeholder.chiave, dash.stakeholder.chiave > 0 ? 'warn' : ''),
  ], { openHref: '#/stakeholder', openLabel: 'Apri il registro →' }));

  grid.appendChild(box('Registro Allert — presidio GC', [
    tile('Aperti', dash.allert.aperti),
    tile('Critici aperti', dash.allert.critici_aperti, dash.allert.critici_aperti > 0 ? 'alert' : ''),
    tile('Totali', dash.allert.totali),
  ], { openHref: '#/allert', openLabel: 'Apri il registro →' }));

  if (dash.attivita_recente && dash.attivita_recente.length) {
    container.appendChild(attivitaBar(dash.attivita_recente));
  }
}
