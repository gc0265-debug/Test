// Pagina CRUD generica: usata da Lavorazioni, Maestranze, Documenti e
// Diario, che condividono la stessa meccanica (lista, crea, modifica,
// elimina) e differiscono solo nei campi del modulo e nelle colonne
// della tabella. Le pagine con logica propria (Criticità, Decisioni,
// Note di Coordinamento, Commesse, Cruscotto) non passano da qui.

import { api } from '../api.js';
import { state } from '../state.js';
import { el, field, textInput, dateInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable } from '../components/ui.js';

function buildFieldNode(f, value) {
  if (f.type === 'select') {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    return select(f.name, options, value ?? f.default ?? '', { required: f.required || false });
  }
  if (f.type === 'textarea') return textarea(f.name, value, { required: f.required || false });
  if (f.type === 'date') return dateInput(f.name, value || '', { required: f.required || false });
  return textInput(f.name, value ?? '', { required: f.required || false, placeholder: f.placeholder || '' });
}

export function createCrudPage({ apiPath, titleSingular, fields, columns, emptyLabel, scopedByCommessa = true }) {
  async function fetchRows() {
    const query = scopedByCommessa ? `?commessa_id=${state.commessaId}` : '';
    const res = await api.get(`${apiPath}${query}`);
    return res.data;
  }

  function openForm(existing, onSaved) {
    const form = el('form', {});
    fields.forEach((f) => {
      form.appendChild(field(f.label, buildFieldNode(f, existing ? existing[f.name] : f.default), f.hint));
    });
    form.appendChild(el('div', { class: 'modal__actions' }, [
      el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
      el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
    ]));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(form);
      data.commessa_id = state.commessaId;
      try {
        if (existing) await api.put(`${apiPath}/${existing.id}`, data);
        else await api.post(apiPath, data);
        closeModal();
        toast(existing ? 'Modifica salvata.' : `${titleSingular} creato.`);
        onSaved();
      } catch (err) {
        toast(err.message, { error: true });
      }
    });
    openModal(existing ? `Modifica ${titleSingular.toLowerCase()}` : `Nuovo ${titleSingular.toLowerCase()}`, form);
  }

  return async function render(container) {
    if (!state.commessaId) {
      container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
      return;
    }

    const toolbar = el('div', { class: 'section__head' }, [
      el('div'),
      el('button', {
        class: 'btn btn--primary',
        onclick: () => openForm(null, refresh),
      }, `+ Nuovo`),
    ]);
    container.appendChild(toolbar);

    const tableHost = el('div');
    container.appendChild(tableHost);

    async function refresh() {
      const rows = await fetchRows();
      const cols = [
        ...columns,
        {
          key: 'actions', label: '', className: 'actions',
          render: (row) => el('div', {}, [
            el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
            el('button', {
              class: 'btn btn--sm btn--ghost btn--danger', onclick: async () => {
                if (!confirmDialog(`Eliminare definitivamente questo elemento?`)) return;
                await api.del(`${apiPath}/${row.id}`);
                toast('Eliminato.');
                refresh();
              },
            }, 'Elimina'),
          ]),
        },
      ];
      renderTable(tableHost, cols, rows, { emptyLabel });
    }

    await refresh();
  };
}
