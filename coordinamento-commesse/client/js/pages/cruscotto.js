import { api } from '../api.js';
import { state, currentCommessa } from '../state.js';
import { el } from '../components/ui.js';

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
      tile('Urgenti scadute', dash.criticita.viola_scadute, dash.criticita.viola_scadute > 0 ? 'alert' : ''),
      tile('Dovute da controparte', dash.criticita.verde_aperte),
    ]),
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
}
