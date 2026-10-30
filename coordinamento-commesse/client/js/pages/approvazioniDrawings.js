// Approvazioni Drawings — elenco elaborati sottoposti a DL/GC per
// approvazione, compilabile a mano o importando un elenco deliverable da
// Excel. Ogni riga può agganciarsi a un Requisito del Capitolato
// Requisiti, restando così collegata agli altri registri di
// Coordinamento e Contratti.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, settingsGear,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = {
  'in-attesa': ['In attesa', 'outline'],
  approvato: ['Approvato', 'verde'],
  'approvato-con-riserve': ['Approvato con riserve', 'ambra'],
  rigettato: ['Rigettato', 'rosso'],
};
let STATO = STATO_FIXED;

async function openForm(existing, onSaved) {
  const requisitiRes = await api.get(`/requisiti?commessa_id=${state.commessaId}`);
  const requisitoOptions = [['', '— nessuno'], ...requisitiRes.data.map((r) => [r.id, `${r.codice_wbs} — ${r.titolo}`])];
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  const form = el('form', {});
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Codice', textInput('codice', existing?.codice ?? '', { required: true, placeholder: 'es. AD-WP2-014' })),
    field('Revisione', textInput('revisione', existing?.revisione ?? '', { placeholder: 'es. Rev. 02' })),
  ]));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data invio', dateInput('data_invio', existing?.data_invio ?? '')),
    field('Data approvazione', dateInput('data_approvazione', existing?.data_approvazione ?? '')),
  ]));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'in-attesa')));
  form.appendChild(field('Requisito collegato', select('rif_requisito_id', requisitoOptions, existing?.rif_requisito_id ?? ''),
    'Collega questo elaborato a un requisito del Capitolato Requisiti, se pertinente.'));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/approvazioni-drawings/${existing.id}`, data);
      else await api.post('/approvazioni-drawings', data);
      closeModal();
      toast(existing ? 'Elaborato aggiornato.' : 'Elaborato creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica elaborato' : 'Nuovo elaborato', form);
}

export async function renderApprovazioniDrawings(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Elenco degli elaborati (drawing) sottoposti ad approvazione, compilabile a mano o importando un elenco deliverable in Excel.'));

  let lastRows = [];
  let selectedId = null;
  const soloLettura = state.currentUser?.ruolo === 'cliente';

  const fileInput = el('input', { type: 'file', accept: '.xlsx,.xls', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('commessa_id', state.commessaId);
    try {
      const res = await api.postForm('/approvazioni-drawings/import', fd);
      toast(`Importati ${res.imported} elaborati${res.righeSezione ? ` (${res.righeSezione} righe di intestazione/sezione ignorate)` : ''}.`);
      await refresh();
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      fileInput.value = '';
    }
  });

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Approvazioni Drawings', state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Elaborati',
          columns: ['Codice', 'Titolo', 'Rev.', 'WP', 'Invio', 'Approvazione', 'Stato', 'Requisito'],
          rows: rows.map((r) => [
            r.codice, r.titolo, r.revisione || '—', r.wp_codice || '—',
            formatDate(r.data_invio), formatDate(r.data_approvazione), STATO[r.stato][0],
            r.requisito_wbs || '—',
          ]),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--sm', onclick: () => fileInput.click() }, 'Importa da Excel'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo elaborato'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  container.appendChild(fileInput);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, statoList] = await Promise.all([
      api.get(`/approvazioni-drawings?commessa_id=${state.commessaId}`),
      getCategoria('approvazioni_stato'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;
    renderTable(tableHost, [
      { key: 'codice', label: 'Codice' },
      { key: 'titolo', label: 'Titolo' },
      { key: 'revisione', label: 'Rev.', render: (r) => r.revisione || '—' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'date', label: 'Invio → Approvazione', render: (r) => `${formatDate(r.data_invio)} → ${formatDate(r.data_approvazione)}` },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'requisito', label: 'Requisito collegato', render: (r) => r.requisito_wbs || '—' },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('approvazioni_drawings', row.id, `${row.codice} — ${row.titolo}`) }, 'Storico'),
          soloLettura ? null : el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          soloLettura ? null : el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo elaborato?')) return;
              await api.del(`/approvazioni-drawings/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, {
      emptyLabel: 'Nessun elaborato registrato. Aggiungilo a mano o importa un elenco da Excel.',
      onRowClick: soloLettura ? null : (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
