// Pagina CRUD generica: ad oggi usata da Diario (le altre pagine con una
// meccanica simile sono diventate custom via via che hanno accumulato
// logica propria). Gestisce anche la vista aggregata di gruppo: in sola
// lettura, con una colonna Commessa aggiunta in testa.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo, consumaFocusRiga } from '../state.js';
import { el, field, textInput, dateInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, settingsGear, fasciaFissa, formatDate, todayISO } from '../components/ui.js';
import { printReport } from '../components/report.js';
import { openWordEditor } from '../components/wordEditor.js';

function buildFieldNode(f, value) {
  if (f.type === 'select') {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    return select(f.name, options, value ?? f.default ?? '', { required: f.required || false });
  }
  if (f.type === 'textarea') return textarea(f.name, value, { required: f.required || false });
  if (f.type === 'date') return dateInput(f.name, value || '', { required: f.required || false });
  return textInput(f.name, value ?? '', { required: f.required || false, placeholder: f.placeholder || '' });
}

export function createCrudPage({ apiPath, titleSingular, fields, columns, emptyLabel, scopedByCommessa = true, printColumns, tipoRicerca, wordEditor }) {
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
    // blocco ottimistico sulle modifiche concorrenti: riporta indietro la
    // versione caricata, così il server può accorgersi se qualcun altro ha
    // già salvato questa stessa riga nel frattempo (vedi server/utils/concorrenza.js)
    if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
    form.appendChild(el('div', { class: 'modal__actions' }, [
      el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
      el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
    ]));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(form);
      if (!existing) data.commessa_id = state.commessaId;
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
    const sticky = fasciaFissa(container, []);
    if (soloLettura) {
      sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
        `Vista aggregata di gruppo: clicca una riga per modificarla. Per crearne una nuova, seleziona prima una singola commessa dal menu a sinistra.`));
    }

    let lastRows = [];
    let selectedId = null;
    let cartelle = [];
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
        (wordEditor && !soloLettura) ? el('button', {
          class: 'btn', onclick: () => openWordEditor({
            cartelle, titoloDefault: `${wordEditor.titoloPrefix} — ${formatDate(todayISO())}`, onSaved: () => {},
          }),
        }, '+ Scrivi documento Word') : null,
        soloLettura ? null : el('button', {
          class: 'btn btn--primary',
          onclick: () => openForm(null, refresh),
        }, `+ Nuovo`),
        settingsGear(),
      ]),
    ]);
    sticky.appendChild(toolbar);

    const tableHost = el('div');
    container.appendChild(tableHost);

    async function refresh() {
      const rows = await fetchRows();
      lastRows = rows;
      if (wordEditor && !soloLettura) {
        const cartelleRes = await api.get(`/cartelle-documenti?${queryScopeCommessa()}`);
        cartelle = cartelleRes.data;
      }
      const cols = [
        ...(soloLettura ? [{ key: 'commessa_codice', label: 'Commessa', render: (row) => row.commessa_codice || '—' }] : []),
        ...columns,
        {
          key: 'actions', label: '', className: 'actions',
          render: (row) => el('div', {}, [
            el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
            soloLettura ? null : el('button', {
              class: 'btn btn--sm btn--ghost btn--danger', onclick: async () => {
                if (!confirmDialog(`Eliminare definitivamente questo elemento?`)) return;
                await api.del(`${apiPath}/${row.id}`);
                toast('Eliminato.');
                refresh();
              },
            }, 'Elimina'),
          ].filter(Boolean)),
        },
      ];
      renderTable(tableHost, cols, rows, {
        emptyLabel,
        onRowClick: (row) => openForm(row, refresh),
        selection: printColumns ? { selectedId, onSelect: (id) => { selectedId = id; refresh(); } } : null,
      });
    }

    await refresh();

    // Apre la riga arrivata dalla ricerca cross-registro, se questa pagina
    // è la sua destinazione e se la riga esiste ancora nella commessa
    // corrente (vedi server/routes/ricerca.js e components/ricercaGlobale.js).
    if (tipoRicerca) {
      const focusId = consumaFocusRiga(tipoRicerca);
      if (focusId) {
        const riga = lastRows.find((r) => String(r.id) === String(focusId));
        if (riga) openForm(riga, refresh);
      }
    }
  };
}
