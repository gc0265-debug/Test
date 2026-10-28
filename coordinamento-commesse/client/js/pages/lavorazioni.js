// Lavorazioni — pagina autonoma (non genericCrud) per ospitare i due
// grafici in alto: barre con % e torta con i valori, entrambi per stato.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { barChart, pieChart } from '../components/charts.js';

const STATO = { 'da-fare': ['Da fare', 'outline', 'var(--ink-3)'], 'in-corso': ['In corso', 'ambra', 'var(--ambra)'], completata: ['Completata', 'verde', 'var(--verde)'], bloccata: ['Bloccata', 'rosso', 'var(--red)'] };
const PRIORITA = { alta: ['Alta', 'rosso'], media: ['Media', 'ambra'], bassa: ['Bassa', 'outline'] };

function openForm(existing, onSaved) {
  const form = el('form', {});
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'da-fare')));
  form.appendChild(field('Priorità', select('priorita', Object.entries(PRIORITA).map(([k, v]) => [k, v[0]]), existing?.priorita ?? 'media')));
  form.appendChild(field('Scadenza', dateInput('scadenza', existing?.scadenza ?? '')));
  form.appendChild(field('Impresa / squadra', textInput('impresa', existing?.impresa ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/lavorazioni/${existing.id}`, data);
      else await api.post('/lavorazioni', data);
      closeModal();
      toast(existing ? 'Modifica salvata.' : 'Lavorazione creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica lavorazione' : 'Nuova lavorazione', form);
}

function renderCharts(rows) {
  const counts = { 'da-fare': 0, 'in-corso': 0, completata: 0, bloccata: 0 };
  rows.forEach((r) => { counts[r.stato] = (counts[r.stato] || 0) + 1; });
  const items = Object.entries(STATO).map(([k, v]) => ({ label: v[0], value: counts[k], color: v[2] }));

  return el('div', { class: 'charts-row' }, [
    el('div', { class: 'chart-box' }, [
      el('div', { class: 'chart-box__title' }, 'Lavorazioni per stato (%)'),
      barChart(items, { width: 320 }),
    ]),
    el('div', { class: 'chart-box' }, [
      el('div', { class: 'chart-box__title' }, 'Lavorazioni per stato (valori)'),
      el('div', { class: 'chart-pie-wrap' }, [
        pieChart(items, { size: 130 }),
        el('div', { class: 'chart-legend' }, items.map((it) => el('div', { class: 'chart-legend-item' }, [
          el('span', { class: 'chart-legend-dot', style: `background:${it.color}` }),
          `${it.label}: ${it.value}`,
        ]))),
      ]),
    ]),
  ]);
}

export async function renderLavorazioni(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  const chartsHost = el('div');
  container.appendChild(chartsHost);

  let lastRows = [];
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => printReport('Lavorazioni', state.commesse.find(c => c.id === state.commessaId), [{
        heading: 'Lavorazioni',
        columns: ['Titolo', 'WP', 'Stato', 'Priorità', 'Scadenza', 'Impresa'],
        rows: lastRows.map((r) => [r.titolo, r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—', STATO[r.stato][0], PRIORITA[r.priorita][0], formatDate(r.scadenza), r.impresa || '—']),
      }]) }, 'Stampa'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova lavorazione'),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const res = await api.get(`/lavorazioni?commessa_id=${state.commessaId}`);
    lastRows = res.data;
    chartsHost.innerHTML = '';
    chartsHost.appendChild(renderCharts(res.data));

    renderTable(tableHost, [
      { key: 'titolo', label: 'Titolo' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'priorita', label: 'Priorità', render: (r) => pill(PRIORITA[r.priorita][0], PRIORITA[r.priorita][1]) },
      { key: 'scadenza', label: 'Scadenza', render: (r) => formatDate(r.scadenza) },
      { key: 'impresa', label: 'Impresa' },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare definitivamente questa lavorazione?')) return;
              await api.del(`/lavorazioni/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessuna lavorazione registrata per questa commessa.' });
  }

  await refresh();
}
