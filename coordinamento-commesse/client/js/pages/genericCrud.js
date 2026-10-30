// Pagina CRUD generica: ad oggi usata da Diario (le altre pagine con una
// meccanica simile sono diventate custom via via che hanno accumulato
// logica propria). Gestisce anche la vista aggregata di gruppo: in sola
// lettura, con una colonna Commessa aggiunta in testa.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import { el, field, textInput, dateInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, settingsGear } from '../components/ui.js';
import { printReport } from '../components/report.js';

function buildFieldNode(f, value) {
  if (f.type === 'select') {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    return select(f.name, options, value ?? f.default ?? '', { required: f.required || false });
  }
  if (f.type === 'textarea') return textarea(f.name, value, { required: f.required || false });
  if (f.type === 'date') return dateInput(f.name, value || '', { required: f.required || false });
  return textInput(f.name, value ?? '', { required: f.required || false, placeholder: f.placeholder || '' });
}

export function createCrudPage({ apiPath, titleSingular, fields, columns, emptyLabel, scopedByCommessa = true, printColumns }) {
  async function fetchRows() {
    const query = scopedByCommessa ? `?${queryScopeCommessa()}` : '';
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
    if (!state.commessaId && !state.gruppoAttivo) {
      container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
      return;
    }
    const soloLettura = scopedByCommessa && inVistaGruppo();
    if (soloLettura) {
      container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
        `Vista aggregata di gruppo: sola lettura. Seleziona una singola commessa dal menu a sinistra per modificare.`));
    }

    let lastRows = [];
    let selectedId = null;
    const toolbar = el('div', { class: 'section__head' }, [
      el('div'),
      el('div', { style: 'display:flex;gap:8px' }, [
        printColumns ? el('button', {
          class: 'btn btn--sm',
          onclick: () => {
            const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
            printReport(titleSingular + 'i', state.commesse.find((c) => c.id === state.commessaId), [{
              heading: titleSingular + 'i',
              columns: printColumns.map((p) => p.label),
              rows: rows.map((row) => printColumns.map((p) => p.get(row))),
            }]);
          },
        }, 'Stampa') : null,
        soloLettura ? null : el('button', {
          class: 'btn btn--primary',
          onclick: () => openForm(null, refresh),
        }, `+ Nuovo`),
        settingsGear(),
      ]),
    ]);
    container.appendChild(toolbar);

    const tableHost = el('div');
    container.appendChild(tableHost);

    async function refresh() {
      const rows = await fetchRows();
      lastRows = rows;
      const cols = [
        ...(soloLettura ? [{ key: 'commessa_codice', label: 'Commessa', render: (row) => row.commessa_codice || '—' }] : []),
        ...columns,
        ...(soloLettura ? [] : [{
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
        }]),
      ];
      renderTable(tableHost, cols, rows, {
        emptyLabel,
        onRowClick: soloLettura ? null : (row) => openForm(row, refresh),
        selection: printColumns ? { selectedId, onSelect: (id) => { selectedId = id; refresh(); } } : null,
      });
    }

    await refresh();
  };
}
