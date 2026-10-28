// Timeline Montaggi — Gantt per settimane/mesi sulle milestone (date di
// inizio/fine montaggio per commessa, work package, piano e zona). Vista
// costruita a barre percentuali su un intervallo di date comune: niente
// libreria esterna, solo CSS. "Stampa elenco" genera invece una versione
// tabellare (le barre non sono pensate per la stampa).

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, formatDate, todayISO,
} from '../components/ui.js';
import { printReport } from '../components/report.js';

const STATO = { pianificata: ['Pianificata', 'outline'], 'in-corso': ['In corso', 'ambra'], completata: ['Completata', 'verde'] };

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOnOrBefore(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const diff = (d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1);
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
function firstOfMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
function firstOfNextMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
function monthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
}
function formatShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}
function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildAxis(rangeStart, rangeEnd, granularity) {
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));
  const segments = [];
  if (granularity === 'week') {
    let cursor = mondayOnOrBefore(rangeStart);
    while (cursor < rangeEnd) {
      const segEnd = addDays(cursor, 7);
      const startOffset = Math.max(0, daysBetween(rangeStart, cursor));
      const endOffset = Math.min(totalDays, daysBetween(rangeStart, segEnd));
      segments.push({
        label: `Sett. ${isoWeek(cursor)}`,
        sub: `${formatShort(cursor)}–${formatShort(addDays(cursor, 6))}`,
        startPct: startOffset / totalDays * 100,
        widthPct: Math.max(0, endOffset - startOffset) / totalDays * 100,
      });
      cursor = segEnd;
    }
  } else {
    let cursor = firstOfMonth(rangeStart);
    while (cursor < rangeEnd) {
      const segEnd = firstOfNextMonth(cursor);
      const startOffset = Math.max(0, daysBetween(rangeStart, cursor));
      const endOffset = Math.min(totalDays, daysBetween(rangeStart, segEnd));
      segments.push({
        label: monthLabel(cursor),
        sub: '',
        startPct: startOffset / totalDays * 100,
        widthPct: Math.max(0, endOffset - startOffset) / totalDays * 100,
      });
      cursor = segEnd;
    }
  }
  return segments;
}

function openForm(existing, onSaved) {
  const form = el('form', {});
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true, placeholder: 'es. Montaggio boiserie corridoio' })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Piano', textInput('piano', existing?.piano ?? '', { placeholder: 'es. Piano 3' })),
    field('Zona', textInput('zona', existing?.zona ?? '', { placeholder: 'es. Ala nord' })),
  ]));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data inizio', dateInput('data_inizio', existing?.data_inizio || todayISO(), { required: true })),
    field('Data fine', dateInput('data_fine', existing?.data_fine || todayISO(), { required: true })),
  ]));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'pianificata')));
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
      if (existing) await api.put(`/milestone/${existing.id}`, data);
      else await api.post('/milestone', data);
      closeModal();
      toast(existing ? 'Milestone aggiornata.' : 'Milestone registrata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica milestone' : 'Nuova milestone', form);
}

export async function renderTimeline(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  let granularity = 'week';
  let lastRows = [];

  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:6px' }),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => stampaElenco() }, 'Stampa elenco'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova milestone'),
    ]),
  ]);
  container.appendChild(toolbar);

  function drawGranularityButtons() {
    const host = toolbar.firstChild;
    host.innerHTML = '';
    [['week', 'Settimane'], ['month', 'Mesi']].forEach(([value, label]) => {
      host.appendChild(el('button', {
        class: 'btn btn--sm' + (granularity === value ? ' btn--primary' : ''),
        onclick: () => { granularity = value; refresh(); },
      }, label));
    });
  }

  function stampaElenco() {
    const commessa = state.commesse.find((c) => c.id === state.commessaId);
    printReport('Elenco milestone', commessa, [{
      heading: 'Milestone / montaggi',
      columns: ['Titolo', 'Piano', 'Zona', 'WP', 'Inizio', 'Fine', 'Stato'],
      rows: lastRows.map((m) => [
        m.titolo, m.piano || '—', m.zona || '—', m.wp_codice || '—',
        formatDate(m.data_inizio), formatDate(m.data_fine),
        m.in_ritardo ? 'In ritardo' : STATO[m.stato][0],
      ]),
    }]);
  }

  const ganttHost = el('div');
  container.appendChild(ganttHost);

  async function refresh() {
    drawGranularityButtons();
    const res = await api.get(`/milestone?commessa_id=${state.commessaId}`);
    lastRows = res.data;
    ganttHost.innerHTML = '';

    if (!res.data.length) {
      ganttHost.appendChild(el('p', { class: 'muted' }, 'Nessuna milestone registrata. Aggiungine una per vedere la timeline.'));
      return;
    }

    const minStart = res.data.reduce((m, r) => (r.data_inizio < m ? r.data_inizio : m), res.data[0].data_inizio);
    const maxEnd = res.data.reduce((m, r) => (r.data_fine > m ? r.data_fine : m), res.data[0].data_fine);
    const paddedStart = addDays(minStart, -3);
    const rangeStart = granularity === 'week' ? mondayOnOrBefore(paddedStart) : firstOfMonth(paddedStart);
    const rangeEnd = addDays(maxEnd, 7);
    const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));
    const oggi = todayISO();
    const todayFrac = Math.min(1, Math.max(0, daysBetween(rangeStart, oggi) / totalDays));

    const axis = buildAxis(rangeStart, rangeEnd, granularity);

    const headerRow = el('div', { class: 'gantt__row gantt__row--head' }, [
      el('div', { class: 'gantt__label gantt__label--head' }, 'Milestone'),
      el('div', { class: 'gantt__axis' }, axis.map((s) => el('div', {
        class: 'gantt__col', style: `left:${s.startPct}%;width:${s.widthPct}%`,
      }, [
        el('div', { class: 'gantt__col-label' }, s.label),
        s.sub ? el('div', { class: 'gantt__col-sub' }, s.sub) : null,
      ]))),
    ]);

    const rows = res.data.map((m) => {
      const startOffset = Math.max(0, daysBetween(rangeStart, m.data_inizio));
      const endOffset = Math.min(totalDays, daysBetween(rangeStart, m.data_fine) + 1);
      const leftPct = startOffset / totalDays * 100;
      const widthPct = Math.max(1, (endOffset - startOffset) / totalDays * 100);
      const cls = m.in_ritardo ? 'ritardo' : m.stato;

      return el('div', { class: 'gantt__row' }, [
        el('div', { class: 'gantt__label' }, [
          el('div', { class: 'gantt__label-titolo' }, m.titolo),
          el('div', { class: 'gantt__label-meta' }, [m.piano, m.zona, m.wp_codice].filter(Boolean).join(' · ') || '—'),
        ]),
        el('div', { class: 'gantt__track' }, [
          el('div', {
            class: `gantt__bar gantt__bar--${cls}`,
            style: `left:${leftPct}%;width:${widthPct}%`,
            title: `${m.titolo} · ${formatDate(m.data_inizio)} → ${formatDate(m.data_fine)}${m.in_ritardo ? ' · IN RITARDO' : ''}`,
            onclick: () => openForm(m, refresh),
          }, m.in_ritardo ? '⚠' : ''),
        ]),
      ]);
    });

    const chart = el('div', { class: 'gantt__chart' }, [
      headerRow,
      ...rows,
      el('div', { class: 'gantt__today-line', style: `left: calc(220px + (100% - 220px) * ${todayFrac})` }),
    ]);

    ganttHost.appendChild(el('div', { class: 'gantt' }, chart));
    ganttHost.appendChild(el('div', { class: 'gantt__legend' }, [
      legendItem('pianificata', 'Pianificata'), legendItem('in-corso', 'In corso'),
      legendItem('completata', 'Completata'), legendItem('ritardo', 'In ritardo'),
    ]));
  }

  function legendItem(cls, label) {
    return el('div', { class: 'gantt__legend-item' }, [el('span', { class: `gantt__legend-dot gantt__legend-dot--${cls}` }), label]);
  }

  await refresh();
}
