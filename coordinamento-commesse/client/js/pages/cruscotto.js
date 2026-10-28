import { api } from '../api.js';
import { state, currentCommessa } from '../state.js';
import { el, formatDateTime } from '../components/ui.js';

const AZIONE_LABEL = {
  creata: 'Creata', modificata: 'Modificata', chiusa: 'Chiusa',
  riaperta: 'Riaperta', eliminata: 'Eliminata', rilancio: 'Rilanciata',
};
const ENTITY_LABEL = { criticita: 'Criticità', decisioni: 'Decisione', allert: 'Allert' };

function tile(label, value, cls, sub) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile__label' }, label),
    el('div', { class: 'tile__value' + (cls ? ' ' + cls : '') }, String(value)),
    sub ? el('div', { class: 'tile__sub' }, sub) : null,
  ]);
}

export async function renderCruscotto(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Nessuna commessa disponibile: creane una dalla sezione Commesse.'));
    return;
  }
  const commessa = currentCommessa();
  const dash = await api.get(`/dashboard/${state.commessaId}`);

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, commessa.codice),
    el('h2', {}, commessa.nome),
    el('p', { class: 'muted' }, [commessa.cliente, commessa.gc && `GC ${commessa.gc}`, commessa.dl && `DL ${commessa.dl}`].filter(Boolean).join(' · ')),
  ]));

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Registro Criticità'),
    el('div', { class: 'tiles' }, [
      tile('Criticità aperte', dash.criticita.aperte),
      tile('Urgenti (viola)', dash.criticita.viola_aperte, dash.criticita.viola_aperte > 0 ? 'warn' : ''),
      tile('In scadenza (≤3gg)', dash.criticita.in_scadenza_3gg, dash.criticita.in_scadenza_3gg > 0 ? 'warn' : ''),
      tile('Urgenti scadute', dash.criticita.viola_scadute, dash.criticita.viola_scadute > 0 ? 'alert' : ''),
      tile('Dovute da controparte', dash.criticita.verde_aperte),
    ]),
    dash.criticita.prossime_scadenze.length ? el('div', { class: 'reminder-list' },
      dash.criticita.prossime_scadenze.map((s) => el('a', {
        href: '#/criticita',
        class: 'reminder-item' + (s.giorni_rimanenti < 0 ? ' alert' : ''),
      }, [
        el('span', {}, s.tema),
        el('span', { class: 'reminder-item__gg' }, s.giorni_rimanenti < 0 ? `scaduta da ${Math.abs(s.giorni_rimanenti)} gg` : `${s.giorni_rimanenti} gg`),
      ]))
    ) : null,
    el('a', { href: '#/criticita', class: 'btn btn--sm', style: 'margin-top:8px' }, 'Apri il registro →'),
  ]));

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Registro Decisioni'),
    el('div', { class: 'tiles' }, [
      tile('Pendenze aperte', dash.decisioni.pendenze_aperte),
      tile('Oltre 21 giorni', dash.decisioni.oltre_21gg, dash.decisioni.oltre_21gg > 0 ? 'alert' : ''),
      tile('Tasso di resa', `${dash.decisioni.tasso_resa_pct}%`),
      tile('Anzianità media', `${dash.decisioni.anzianita_media_gg} gg`, dash.decisioni.anzianita_media_gg > 21 ? 'warn' : ''),
      tile('Confermate per iscritto', `${dash.decisioni.confermate_iscritto_pct}%`),
    ]),
    el('a', { href: '#/decisioni', class: 'btn btn--sm', style: 'margin-top:8px' }, 'Apri il registro →'),
  ]));

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Lavorazioni'),
    el('div', { class: 'tiles' }, [
      tile('Da fare', dash.lavorazioni['da-fare']),
      tile('In corso', dash.lavorazioni['in-corso']),
      tile('Completate', dash.lavorazioni.completata),
      tile('Bloccate', dash.lavorazioni.bloccata, dash.lavorazioni.bloccata > 0 ? 'alert' : ''),
    ]),
    el('a', { href: '#/lavorazioni', class: 'btn btn--sm', style: 'margin-top:8px' }, 'Apri le lavorazioni →'),
  ]));

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Registro Allert — presidio GC'),
    el('div', { class: 'tiles' }, [
      tile('Aperti', dash.allert.aperti),
      tile('Critici aperti', dash.allert.critici_aperti, dash.allert.critici_aperti > 0 ? 'alert' : ''),
      tile('Totali', dash.allert.totali),
    ]),
    el('a', { href: '#/allert', class: 'btn btn--sm', style: 'margin-top:8px' }, 'Apri il registro →'),
  ]));

  if (dash.attivita_recente && dash.attivita_recente.length) {
    container.appendChild(el('div', { class: 'section' }, [
      el('div', { class: 'eyebrow' }, 'Attività recente'),
      el('div', { class: 'activity-list' }, dash.attivita_recente.map((a) => el('div', { class: 'activity-item' }, [
        el('span', { class: 'activity-item__tipo' }, ENTITY_LABEL[a.entity_type] || a.entity_type),
        el('span', {}, `${AZIONE_LABEL[a.azione] || a.azione}${a.dettaglio ? ' — ' + a.dettaglio : ''}`),
        el('span', { class: 'activity-item__meta' }, `${a.utente || '—'} · ${formatDateTime(a.created_at)}`),
      ]))),
    ]));
  }
}
