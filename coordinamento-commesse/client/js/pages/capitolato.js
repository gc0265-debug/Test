// Capitolato — scrittura in stile tabella con codici WBS, a monte dei
// Requisiti di progetto. Ogni voce è legata (facoltativamente) a un
// contratto: la pagina raggruppa le voci per contratto, come fossero
// documenti con sottorighe, invece di un'unica tabella piatta.

import { api } from '../api.js';
import { state } from '../state.js';
import { el, field, textInput, dateInput, textarea, select, openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, settingsGear } from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';

async function openForm(existing, onSaved) {
  const contrattiRes = await api.get(`/contratti?commessa_id=${state.commessaId}`);
  const contrattoOptions = [['', '— nessuno'], ...contrattiRes.data.map((c) => [c.id, c.controparte || c.titolo])];

  const form = el('form', {});
  form.appendChild(field('Codice WBS', textInput('codice_wbs', existing?.codice_wbs ?? '', { required: true, placeholder: `es. ${state.commesse.find(c => c.id === state.commessaId)?.codice || '2514RW'}.WP1.03` })));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data', dateInput('data', existing?.data ?? '')),
    field('Contratto', select('contratto_id', contrattoOptions, existing?.contratto_id ?? '')),
  ]));
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

function voceColumns(refresh) {
  return [
    { key: 'codice_wbs', label: 'WBS' },
    { key: 'titolo', label: 'Titolo' },
    { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
    { key: 'n_requisiti', label: 'Requisiti', render: (r) => pill(String(r.n_requisiti), r.n_requisiti > 0 ? 'verde' : 'outline') },
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
  ];
}

export async function renderCapitolato(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Il capitolato scritto in forma tabellare, con codice WBS, raggruppato per contratto: ogni voce può collegarsi a uno o più Requisiti di progetto.'));

  let lastRows = [];
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Capitolato', state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Voci di capitolato',
          columns: ['WBS', 'Titolo', 'Data', 'Contratto', 'Descrizione', 'Requisiti collegati'],
          rows: rows.map((r) => [r.codice_wbs, r.titolo, formatDate(r.data), r.contratto_controparte || r.contratto_titolo || '—', r.descrizione || '—', r.n_requisiti]),
        }]);
      } }, 'Stampa'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova voce'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const groupsHost = el('div');
  container.appendChild(groupsHost);

  async function refresh() {
    const res = await api.get(`/capitolato?commessa_id=${state.commessaId}`);
    lastRows = res.data;
    groupsHost.innerHTML = '';

    if (!res.data.length) {
      groupsHost.appendChild(el('p', { class: 'muted' }, 'Nessuna voce di capitolato registrata per questa commessa.'));
      return;
    }

    const contratti = new Map();
    const senzaContratto = [];
    res.data.forEach((v) => {
      if (v.contratto_id) {
        if (!contratti.has(v.contratto_id)) contratti.set(v.contratto_id, { titolo: v.contratto_controparte || v.contratto_titolo, voci: [] });
        contratti.get(v.contratto_id).voci.push(v);
      } else {
        senzaContratto.push(v);
      }
    });

    contratti.forEach(({ titolo, voci }) => {
      const tableHost = el('div');
      groupsHost.appendChild(el('div', { class: 'section card card--compact' }, [
        el('div', { class: 'eyebrow' }, 'Contratto'),
        el('h2', { style: 'margin:0 0 10px' }, titolo),
        tableHost,
      ]));
      renderTable(tableHost, voceColumns(refresh), voci, {
        emptyLabel: 'Nessuna voce.',
        onRowClick: (row) => openForm(row, refresh),
        selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
      });
    });

    if (senzaContratto.length) {
      const tableHost = el('div');
      groupsHost.appendChild(el('div', { class: 'section card card--compact' }, [
        el('h2', { style: 'margin:0 0 10px' }, 'Senza contratto collegato'),
        tableHost,
      ]));
      renderTable(tableHost, voceColumns(refresh), senzaContratto, {
        emptyLabel: 'Nessuna voce.',
        onRowClick: (row) => openForm(row, refresh),
        selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
      });
    }
  }

  await refresh();
}
