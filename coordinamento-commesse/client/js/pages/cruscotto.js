// Cruscotto — griglia compatta di box per sezione: ogni box mostra solo i
// numeri chiave, il titolo è cliccabile e apre una finestra modale con
// l'elenco completo di quella sezione (così la pagina resta leggibile
// senza dover scorrere righe lunghe).

import { api } from '../api.js';
import { state, currentCommessa } from '../state.js';
import { el, formatDate, formatDateTime, openModal } from '../components/ui.js';
import { printReport } from '../components/report.js';

const AZIONE_LABEL = {
  creata: 'Creata', modificata: 'Modificata', chiusa: 'Chiusa',
  riaperta: 'Riaperta', eliminata: 'Eliminata', rilancio: 'Rilanciata',
};
const ENTITY_LABEL = {
  criticita: 'Criticità', decisioni: 'Decisione', allert: 'Allert', milestone: 'Milestone', lezioni_apprese: 'Lezione appresa',
  requisiti: 'Requisito', contratti: 'Contratto', stakeholder: 'Stakeholder', processi_comunicazione: 'Processo comunicazione',
  capitolato_voci: 'Voce di capitolato',
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

// Un box della griglia: titolo cliccabile (apre la lista completa in modale,
// se buildModal è passato), i tile con i numeri, e un link per aprire la
// scheda completa.
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

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, commessa.codice),
    el('h2', {}, commessa.nome),
    el('p', { class: 'muted' }, [commessa.cliente, commessa.gc && `GC ${commessa.gc}`, commessa.dl && `DL ${commessa.dl}`].filter(Boolean).join(' · ')),
  ]));

  const grid = el('div', { class: 'cruscotto-grid' });
  container.appendChild(grid);

  grid.appendChild(box('Scadenze della settimana', [
    tile('Nei prossimi 7 giorni', dash.scadenze_settimana.length, dash.scadenze_settimana.some((s) => s.giorni < 0) ? 'alert' : ''),
  ], {
    buildModal: () => el('div', {}, [
      reminderList(dash.scadenze_settimana.map((s) => el('a', {
        href: s.tipo === 'milestone' ? '#/timeline' : '#/criticita',
        class: 'reminder-item' + (s.giorni < 0 ? ' alert' : ''),
      }, [
        el('span', {}, `${s.tipo === 'milestone' ? '◈' : '▲'} ${s.titolo}`),
        el('span', { class: 'reminder-item__gg' }, s.giorni < 0 ? `scaduta da ${Math.abs(s.giorni)} gg` : `${s.giorni} gg`),
      ])), 'Nessuna scadenza nei prossimi 7 giorni.'),
      el('div', { class: 'modal__actions' }, [
        el('button', { class: 'btn btn--sm', onclick: () => printReport('Scadenze della settimana', commessa, [{
          heading: 'Prossimi 7 giorni',
          columns: ['Tipo', 'Voce', 'Data', 'Giorni'],
          rows: dash.scadenze_settimana.map((s) => [
            s.tipo === 'milestone' ? 'Milestone' : 'Criticità', s.titolo, formatDate(s.data),
            s.giorni < 0 ? `scaduta da ${Math.abs(s.giorni)} gg` : `${s.giorni} gg`,
          ]),
        }]) }, 'Stampa report'),
      ]),
    ]),
  }));

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
    grid.appendChild(box('Attività recente', [
      tile('Ultime registrate', dash.attivita_recente.length),
    ], {
      buildModal: () => el('div', { class: 'activity-list' }, dash.attivita_recente.map((a) => el('div', { class: 'activity-item' }, [
        el('span', { class: 'activity-item__tipo' }, ENTITY_LABEL[a.entity_type] || a.entity_type),
        el('span', {}, `${AZIONE_LABEL[a.azione] || a.azione}${a.dettaglio ? ' — ' + a.dettaglio : ''}`),
        el('span', { class: 'activity-item__meta' }, `${a.utente || '—'} · ${formatDateTime(a.created_at)}`),
      ]))),
    }));
  }
}
