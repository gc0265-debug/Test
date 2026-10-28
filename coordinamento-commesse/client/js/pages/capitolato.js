// Capitolato — scrittura in stile tabella con codici WBS, a monte dei
// Requisiti di progetto (collegabili da lì a una voce qui).

import { api } from '../api.js';
import { state } from '../state.js';
import { el, field, textInput, textarea, openModal, closeModal, toast, confirmDialog, renderTable, pill } from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';

function openForm(existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field('Codice WBS', textInput('codice_wbs', existing?.codice_wbs ?? '', { required: true, placeholder: `es. ${state.commesse.find(c => c.id === state.commessaId)?.codice || '2514RW'}.WP1.03` })));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v === '' ? null : v; });
    data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/capitolato/${existing.id}`, data);
      else await api.post('/capitolato', data);
      closeModal();
      toast(existing ? 'Voce aggiornata.' : 'Voce creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica voce di capitolato' : 'Nuova voce di capitolato', form);
}

export async function renderCapitolato(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Il capitolato scritto in forma tabellare, con codice WBS: ogni voce può collegarsi a uno o più Requisiti di progetto.'));

  let lastRows = [];
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => printReport('Capitolato', state.commesse.find(c => c.id === state.commessaId), [{
        heading: 'Voci di capitolato',
        columns: ['WBS', 'Titolo', 'Descrizione', 'Requisiti collegati'],
        rows: lastRows.map((r) => [r.codice_wbs, r.titolo, r.descrizione || '—', r.n_requisiti]),
      }]) }, 'Stampa'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova voce'),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const res = await api.get(`/capitolato?commessa_id=${state.commessaId}`);
    lastRows = res.data;
    renderTable(tableHost, [
      { key: 'codice_wbs', label: 'WBS' },
      { key: 'titolo', label: 'Titolo' },
      { key: 'descrizione', label: 'Descrizione' },
      { key: 'n_requisiti', label: 'Requisiti collegati', render: (r) => pill(String(r.n_requisiti), r.n_requisiti > 0 ? 'verde' : 'outline') },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('capitolato_voci', row.id, `${row.codice_wbs} — ${row.titolo}`) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(row.n_requisiti > 0
                ? `Eliminare questa voce? ${row.n_requisiti} requisiti collegati perderanno il riferimento (restano come requisiti autonomi).`
                : 'Eliminare questa voce di capitolato?')) return;
              await api.del(`/capitolato/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessuna voce di capitolato registrata per questa commessa.' });
  }

  await refresh();
}
