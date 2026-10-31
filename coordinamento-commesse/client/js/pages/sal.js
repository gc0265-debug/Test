// SAL — Stato Avanzamento Lavori (operativo): registro periodico della
// percentuale di completamento delle Lavorazioni, per Work Package e per
// Impresa. Non è un SAL contabile ai sensi del DM 49/2018 (nessuna
// quantità né prezzo unitario, perché Lavorazioni non li traccia): è un
// avanzamento fisico, numerato progressivamente, che si può chiudere e
// confrontare con il precedente — vedi server/routes/sal.js.

import { api } from '../api.js';
import { state, currentCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, dateInput, textarea, openModal, closeModal, toast, confirmDialog,
  renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { barChartHtml, pieChartHtml } from '../components/charts.js';

const STATO_LABEL = { 'da-fare': 'Da fare', 'in-corso': 'In corso', completata: 'Completata', bloccata: 'Bloccata' };
const STATO_COLOR = { 'da-fare': '#8A8A8A', 'in-corso': '#A8761E', completata: '#2E7D5B', bloccata: '#C0332B' };

function deltaLabel(delta) {
  if (delta === undefined || delta === null) return null;
  return el('span', { class: 'sal-delta' + (delta > 0 ? ' sal-delta--up' : (delta < 0 ? ' sal-delta--down' : '')) },
    `${delta > 0 ? '+' : ''}${delta}% dal precedente`);
}

// Una riga di avanzamento (Work Package o Impresa): etichetta, barra
// percentuale, numero completate/totali, delta dal SAL precedente se noto.
function avanzamentoRow(label, g) {
  return el('div', { class: 'sal-bar-row' }, [
    el('div', { class: 'sal-bar-row__label' }, label),
    el('div', { class: 'sal-bar-row__track' }, el('div', { class: 'sal-bar-row__fill', style: `width:${g.pct}%` })),
    el('div', { class: 'sal-bar-row__pct' }, `${g.pct}%`),
    el('div', { class: 'sal-bar-row__count' }, `${g.completate}/${g.totali}`),
    deltaLabel(g.delta_pct),
  ]);
}

function avanzamentoBreakdown(dati) {
  return el('div', {}, [
    el('div', { class: 'sal-bar-row sal-bar-row--totale' }, [
      el('div', { class: 'sal-bar-row__label' }, 'Totale commessa'),
      el('div', { class: 'sal-bar-row__track' }, el('div', { class: 'sal-bar-row__fill', style: `width:${dati.totale.pct}%` })),
      el('div', { class: 'sal-bar-row__pct' }, `${dati.totale.pct}%`),
      el('div', { class: 'sal-bar-row__count' }, `${dati.totale.completate}/${dati.totale.totali}`),
      deltaLabel(dati.totale.delta_pct),
    ]),
    el('div', { class: 'eyebrow', style: 'margin:16px 0 4px' }, 'Per Work Package'),
    ...dati.per_wp.map((g) => avanzamentoRow(g.codice ? `${g.codice} ${g.nome}` : g.nome, g)),
    el('div', { class: 'eyebrow', style: 'margin:16px 0 4px' }, 'Per Impresa'),
    ...dati.per_impresa.map((g) => avanzamentoRow(g.impresa, g)),
  ]);
}

function chartsHtmlFor(dati) {
  const items = Object.keys(STATO_LABEL).map((k) => ({
    label: STATO_LABEL[k], color: STATO_COLOR[k],
    value: k === 'da-fare' ? dati.totale.da_fare : k === 'in-corso' ? dati.totale.in_corso : k === 'completata' ? dati.totale.completate : dati.totale.bloccata,
  }));
  const legend = items.map((it) => `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${it.color}"></span>${it.label}: ${it.value}</div>`).join('');
  return `
    <div class="charts-row">
      <div class="chart-box">
        <div class="chart-box__title">Lavorazioni per stato (%)</div>
        ${barChartHtml(items, { width: 320 })}
      </div>
      <div class="chart-box">
        <div class="chart-box__title">Lavorazioni per stato (valori)</div>
        <div class="chart-pie-wrap">${pieChartHtml(items, { size: 130 })}<div class="chart-legend">${legend}</div></div>
      </div>
    </div>
  `;
}

function stampaSal(commessa, dati, meta) {
  const titolo = meta ? `SAL n. ${meta.numero} — Stato Avanzamento Lavori` : 'Stato Avanzamento Lavori — anteprima';
  const introBase = meta
    ? `Stato Avanzamento Lavori n. ${meta.numero} del ${formatDate(meta.data)}: avanzamento complessivo ${dati.totale.pct}%${dati.totale.delta_pct !== undefined ? ` (${dati.totale.delta_pct >= 0 ? '+' : ''}${dati.totale.delta_pct}% rispetto al SAL precedente)` : ''}.`
    : `Anteprima dell'avanzamento attuale, non ancora chiuso come SAL: avanzamento complessivo ${dati.totale.pct}%.`;
  const intro = meta?.note ? `${introBase} ${meta.note}` : introBase;

  printReport(titolo, commessa, [
    {
      heading: 'Per Work Package',
      columns: ['Work Package', 'Completate', 'In corso', 'Bloccate', 'Da fare', 'Totale', '% avanzamento'],
      rows: dati.per_wp.map((g) => [g.codice ? `${g.codice} ${g.nome}` : g.nome, g.completate, g.in_corso, g.bloccata, g.da_fare, g.totali, `${g.pct}%`]),
    },
    {
      heading: 'Per Impresa',
      columns: ['Impresa', 'Completate', 'In corso', 'Bloccate', 'Da fare', 'Totale', '% avanzamento'],
      rows: dati.per_impresa.map((g) => [g.impresa, g.completate, g.in_corso, g.bloccata, g.da_fare, g.totali, `${g.pct}%`]),
    },
  ], { intro, chartsHtml: chartsHtmlFor(dati) });
}

function openChiudiForm(commessa, onDone) {
  const form = el('form', {});
  form.appendChild(field('Data di chiusura', dateInput('data', todayISO(), { required: true }),
    'La data con cui il SAL resta registrato nello storico.'));
  form.appendChild(field('Note (facoltative)', textarea('note', ''), 'Es. riferimenti alla riunione di cantiere, osservazioni sullo scostamento rispetto al SAL precedente.'));
  form.appendChild(el('p', { class: 'muted', style: 'font-size:11.5px' },
    'Chiudendo il SAL, l\'avanzamento attuale delle Lavorazioni viene congelato in un nuovo numero progressivo e confrontato automaticamente con l\'ultimo SAL chiuso.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Chiudi SAL'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v === '' ? null : v; });
    data.commessa_id = state.commessaId;
    try {
      const sal = await api.post('/sal/chiudi', data);
      closeModal();
      toast(`SAL n. ${sal.numero} chiuso — avanzamento ${sal.dati.totale.pct}%.`);
      onDone();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal('Chiudi nuovo SAL', form);
}

function openSalDetail(commessa, sal, onDeleted) {
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', style: 'margin-top:0' },
    `Chiuso il ${formatDate(sal.data)}${sal.creato_da ? ` da ${sal.creato_da}` : ''}.`));
  if (sal.note) body.appendChild(el('p', {}, sal.note));
  body.appendChild(avanzamentoBreakdown(sal.dati));
  body.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn btn--ghost btn--danger', onclick: async () => {
      if (!confirmDialog(`Eliminare il SAL n. ${sal.numero}? L'operazione non è reversibile.`)) return;
      await api.del(`/sal/${sal.id}`);
      closeModal();
      toast('SAL eliminato.');
      onDeleted();
    } }, 'Elimina'),
    el('button', { type: 'button', class: 'btn', onclick: () => stampaSal(commessa, sal.dati, sal) }, 'Stampa'),
    el('button', { type: 'button', class: 'btn btn--primary', onclick: () => closeModal() }, 'Chiudi'),
  ]));
  openModal(`SAL n. ${sal.numero}`, body);
}

export async function renderSal(container) {
  if (!state.commessaId || inVistaGruppo()) {
    container.appendChild(el('p', { class: 'muted' },
      inVistaGruppo()
        ? 'La scheda SAL richiede una singola commessa: seleziona una commessa specifica dal menu a sinistra (invece della vista di gruppo).'
        : 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const commessa = currentCommessa();

  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px;max-width:680px' },
    'Registro di avanzamento fisico delle Lavorazioni (percentuale di completamento), aggregato per Work Package e per Impresa. Non è un SAL contabile: non calcola quantità, prezzi unitari né acconti.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--primary', onclick: () => openChiudiForm(commessa, refresh) }, '+ Chiudi nuovo SAL'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  const correnteHost = el('div', { class: 'card card--compact', style: 'margin-bottom:20px' });
  container.appendChild(correnteHost);

  const storicoHost = el('div');
  container.appendChild(storicoHost);

  async function refresh() {
    const [corrente, storico] = await Promise.all([
      api.get(`/sal/corrente?commessa_id=${state.commessaId}`),
      api.get(`/sal?commessa_id=${state.commessaId}`),
    ]);

    correnteHost.innerHTML = '';
    correnteHost.appendChild(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' }, [
      el('h2', { style: 'margin:0' }, 'Avanzamento attuale'),
      el('button', { class: 'btn btn--sm btn--ghost', onclick: () => stampaSal(commessa, corrente, null) }, 'Stampa anteprima'),
    ]));
    correnteHost.appendChild(el('p', { class: 'muted', style: 'margin:2px 0 14px;font-size:11.5px' },
      'Calcolato in tempo reale dalle Lavorazioni correnti, non ancora chiuso come SAL.'));
    correnteHost.appendChild(avanzamentoBreakdown(corrente));

    storicoHost.innerHTML = '';
    storicoHost.appendChild(el('h2', { style: 'margin:0 0 10px' }, 'Storico SAL'));
    const tableHost = el('div');
    storicoHost.appendChild(tableHost);
    renderTable(tableHost, [
      { key: 'numero', label: 'N.', render: (r) => pill(`SAL ${r.numero}`, 'outline') },
      { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
      {
        key: 'avanzamento', label: 'Avanzamento',
        render: (r) => el('div', {}, [
          pill(`${r.dati.totale.pct}%`, r.dati.totale.pct === 100 ? 'verde' : 'outline'),
          r.dati.totale.delta_pct !== undefined ? el('span', { class: 'sal-delta' + (r.dati.totale.delta_pct > 0 ? ' sal-delta--up' : (r.dati.totale.delta_pct < 0 ? ' sal-delta--down' : '')), style: 'margin-left:6px' }, `${r.dati.totale.delta_pct >= 0 ? '+' : ''}${r.dati.totale.delta_pct}%`) : null,
        ]),
      },
      { key: 'note', label: 'Note', render: (r) => r.note || '—' },
      { key: 'creato_da', label: 'Creato da', render: (r) => r.creato_da || '—' },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openSalDetail(commessa, row, refresh) }, 'Apri'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => stampaSal(commessa, row.dati, row) }, 'Stampa'),
        ]),
      },
    ], storico.data, {
      emptyLabel: 'Nessun SAL ancora chiuso per questa commessa.',
      onRowClick: (row) => openSalDetail(commessa, row, refresh),
    });
  }

  await refresh();
}
