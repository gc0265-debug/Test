// Dashboard Finanziaria — unica vista multi-commessa dell'app: valore
// contratti + atti aggiuntivi aggregati su TUTTE le commesse, non solo
// quella selezionata nel menu a sinistra. Accesso admin-only (vedi
// server/routes/finanziaria.js), coerente con la sensibilità dei dati.

import { api } from '../api.js';
import { el, renderTable } from '../components/ui.js';
import { printReport } from '../components/report.js';
import { setCommessa } from '../state.js';

function formatValore(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
}

function tile(label, value, cls) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile__label' }, label),
    el('div', { class: 'tile__value' + (cls ? ' ' + cls : '') }, String(value)),
  ]);
}

export async function renderFinanziaria(container) {
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Riepilogo del valore contrattuale e degli atti aggiuntivi su tutte le commesse — non filtrato dalla commessa selezionata nel menu.'));

  const { commesse, totali, contratti } = await api.get('/finanziaria');

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => printReport('Dashboard Finanziaria', null, [{
        heading: 'Commesse',
        columns: ['Commessa', 'Stato', 'N. contratti', 'Valore contratti', 'N. atti aggiuntivi', 'Valore atti', 'Totale'],
        rows: commesse.map((c) => [`${c.codice} — ${c.nome}`, c.stato, c.n_contratti, formatValore(c.valore_contratti), c.n_atti, formatValore(c.valore_atti), formatValore(c.valore_totale)]),
      }, {
        heading: 'Contratti fornitori',
        columns: ['Commessa', 'Fornitore', 'Contratto', 'Stato', 'Stipula', 'Valore', 'Atti aggiuntivi', 'Totale'],
        rows: contratti.map((c) => [c.commessa_codice || '—', c.controparte || '—', c.titolo, c.stato,
          c.data_stipula ? new Date(c.data_stipula).toLocaleDateString('it-IT') : '—',
          formatValore(c.valore_contratto), c.n_atti ? `${c.n_atti} (${formatValore(c.valore_atti)})` : '—', formatValore(c.valore_totale)]),
      }]) }, 'Stampa'),
    ]),
  ]);
  container.appendChild(toolbar);

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-title' }, 'Totale complessivo'),
    el('div', { class: 'tiles' }, [
      tile('Commesse', totali.n_commesse),
      tile('Contratti', totali.n_contratti),
      tile('Valore contratti', formatValore(totali.valore_contratti)),
      tile('Atti aggiuntivi', totali.n_atti),
      tile('Valore atti aggiuntivi', formatValore(totali.valore_atti)),
      tile('Valore totale', formatValore(totali.valore_totale)),
    ]),
  ]));

  const tableHost = el('div');
  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-title' }, 'Dettaglio per commessa'),
    tableHost,
  ]));

  renderTable(tableHost, [
    { key: 'commessa', label: 'Commessa', render: (r) => `${r.codice} — ${r.nome}` },
    { key: 'stato', label: 'Stato' },
    { key: 'n_contratti', label: 'N. contratti', numeric: true },
    { key: 'valore_contratti', label: 'Valore contratti', numeric: true, render: (r) => formatValore(r.valore_contratti) },
    { key: 'n_atti', label: 'N. atti aggiuntivi', numeric: true },
    { key: 'valore_atti', label: 'Valore atti aggiuntivi', numeric: true, render: (r) => formatValore(r.valore_atti) },
    { key: 'valore_totale', label: 'Totale', numeric: true, render: (r) => el('b', {}, formatValore(r.valore_totale)) },
  ], commesse, {
    emptyLabel: 'Nessuna commessa registrata.',
    onRowClick: async (row) => { await setCommessa(row.commessa_id); location.hash = '#/contratto'; },
  });

  const contrattiHost = el('div');
  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-title' }, 'Contratti fornitori'),
    el('p', { class: 'muted', style: 'margin:-4px 0 12px' },
      'Ogni contratto registrato nel Registro Contratti, con i relativi atti aggiuntivi già sommati, su tutte le commesse.'),
    contrattiHost,
  ]));

  renderTable(contrattiHost, [
    { key: 'commessa', label: 'Commessa', render: (r) => r.commessa_codice || '—' },
    { key: 'controparte', label: 'Fornitore', render: (r) => r.controparte || '—' },
    { key: 'titolo', label: 'Contratto' },
    { key: 'stato', label: 'Stato' },
    { key: 'data_stipula', label: 'Stipula', render: (r) => r.data_stipula ? new Date(r.data_stipula).toLocaleDateString('it-IT') : '—' },
    { key: 'valore_contratto', label: 'Valore', numeric: true, render: (r) => formatValore(r.valore_contratto) },
    { key: 'atti', label: 'Atti aggiuntivi', numeric: true, render: (r) => r.n_atti ? `${r.n_atti} · ${formatValore(r.valore_atti)}` : '—' },
    { key: 'valore_totale', label: 'Totale', numeric: true, render: (r) => el('b', {}, formatValore(r.valore_totale)) },
  ], contratti, {
    emptyLabel: 'Nessun contratto registrato in nessuna commessa.',
    onRowClick: async (row) => { await setCommessa(row.commessa_id); location.hash = '#/contratto'; },
  });
}
