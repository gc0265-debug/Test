// Modale "Storico": elenco delle modifiche registrate per una singola
// criticità/decisione/allert, usata dal pulsante "Storico" nelle rispettive
// tabelle. Non è un registro a sé: legge /api/audit filtrato su quella riga.

import { api } from '../api.js';
import { el, openModal, formatDateTime } from './ui.js';

const AZIONE_LABEL = {
  creata: 'Creata', modificata: 'Modificata', chiusa: 'Chiusa',
  riaperta: 'Riaperta', eliminata: 'Eliminata', rilancio: 'Rilanciata',
};

export async function openStorico(entityType, entityId, label) {
  const res = await api.get(`/audit?entity_type=${entityType}&entity_id=${entityId}`);
  const body = res.data.length
    ? el('div', { class: 'storico-list' }, res.data.map((r) => el('div', { class: 'storico-item' }, [
        el('div', { class: 'storico-item__head' }, [
          el('span', { class: 'storico-item__azione' }, AZIONE_LABEL[r.azione] || r.azione),
          el('span', { class: 'storico-item__data' }, formatDateTime(r.created_at)),
        ]),
        r.dettaglio ? el('div', { class: 'storico-item__dettaglio' }, r.dettaglio) : null,
        el('div', { class: 'storico-item__utente' }, `— ${r.utente || 'utente non registrato'}`),
      ])))
    : el('p', { class: 'muted' }, 'Nessuna attività registrata.');
  openModal(`Storico — ${label}`, body);
}
