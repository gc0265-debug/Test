// Timeline Montaggi — tabella Gantt per settimane/mesi su milestone e
// lavorazioni insieme. Le colonne Attività/Inizio/Fine restano ferme
// (sticky a sinistra della finestra di scroll); solo la parte con le
// barre scorre in orizzontale. Ogni milestone congela una baseline alla
// creazione: se le date correnti si spostano, la barra originale resta
// visibile in trasparenza accanto a quella attuale, a mostrare lo
// scostamento. Le lavorazioni (con data inizio/fine valorizzate) appaiono
// come righe più sottili nello stesso grafico, senza baseline: per
// modificarle si passa dalla scheda Lavorazioni.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = { pianificata: ['Pianificata', 'outline'], 'in-corso': ['In corso', 'ambra'], completata: ['Completata', 'verde'] };
const STATO_LAVORAZIONE_CLS = { 'da-fare': 'pianificata', 'in-corso': 'in-corso', completata: 'completata', bloccata: 'ritardo' };
const STATO_LAVORAZIONE_LABEL_FIXED = { 'da-fare': 'Da fare', 'in-corso': 'In corso', completata: 'Completata', bloccata: 'Bloccata' };
const PRIORITA_FIXED = { alta: 'Alta', media: 'Media', bassa: 'Bassa' };
let STATO = STATO_FIXED;
let STATO_LAVORAZIONE_LABEL = STATO_LAVORAZIONE_LABEL_FIXED;
let PRIORITA = PRIORITA_FIXED;

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
// Larghezza della colonna Attività adattata al testo più lungo (titolo +
// tag Milestone/Lavorazione), così i nomi lunghi non vengono tagliati né
// lasciano troppo spazio vuoto quando sono corti.
let measureCanvas;
function textWidth(text, font) {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}
function computeNomeWidth(items) {
  const titleFont = '600 12px Montserrat, sans-serif';
  const tagFont = '600 8.5px Montserrat, sans-serif';
  let max = textWidth('Attività', titleFont);
  items.forEach((it) => {
    const tagText = (it.type === 'lavorazione' ? 'LAVORAZIONE' : 'MILESTONE');
    const w = textWidth(it.titolo, titleFont) + 6 + textWidth(tagText, tagFont);
    if (w > max) max = w;
  });
  return Math.min(420, Math.max(160, Math.ceil(max) + 24));
}

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// px/giorno per granularità: scelto perché ogni colonna (settimana ~90px,
// mese ~150px) resti leggibile anche su commesse che coprono molti mesi —
// il grafico cresce in larghezza (scroll orizzontale) invece di schiacciare
// le colonne. zoom è un moltiplicatore continuo (slider) sopra questa base.
function pxPerDay(granularity, zoom) {
  return (granularity === 'week' ? 90 / 7 : 150 / 30.44) * zoom;
}

function buildAxis(rangeStart, rangeEnd, granularity, zoom) {
  const ppd = pxPerDay(granularity, zoom);
  const segments = [];
  if (granularity === 'week') {
    let cursor = mondayOnOrBefore(rangeStart);
    while (cursor < rangeEnd) {
      const segEnd = addDays(cursor, 7);
      const startOffset = Math.max(0, daysBetween(rangeStart, cursor));
      const endOffset = daysBetween(rangeStart, segEnd);
      segments.push({
        label: `Sett. ${isoWeek(cursor)}`,
        sub: `${formatShort(cursor)}–${formatShort(addDays(cursor, 6))}`,
        leftPx: startOffset * ppd,
        widthPx: Math.max(0, endOffset - startOffset) * ppd,
      });
      cursor = segEnd;
    }
  } else {
    let cursor = firstOfMonth(rangeStart);
    while (cursor < rangeEnd) {
      const segEnd = firstOfNextMonth(cursor);
      const startOffset = Math.max(0, daysBetween(rangeStart, cursor));
      const endOffset = daysBetween(rangeStart, segEnd);
      segments.push({
        label: monthLabel(cursor),
        sub: '',
        leftPx: startOffset * ppd,
        widthPx: Math.max(0, endOffset - startOffset) * ppd,
      });
      cursor = segEnd;
    }
  }
  return segments;
}

async function openForm(existing, onSaved) {
  const isLavorazione = existing ? existing.type === 'lavorazione' : false;
  // In vista aggregata di gruppo la riga può appartenere a una commessa
  // diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const wpRes = await api.get(`/commesse/${commessaIdForm}/wp`);
  const form = el('form', {});
  const wpOptions = [['', '—'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  const tipoCheckbox = el('input', { type: 'checkbox', checked: isLavorazione, disabled: !!existing });
  form.appendChild(el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12.5px;margin-bottom:6px;cursor:pointer' }, [
    tipoCheckbox, 'È una Lavorazione (lascia vuoto per una Milestone)',
  ]));
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:0 0 16px' },
    existing ? 'Il tipo non si può cambiare dopo la creazione.' : 'Scegli il tipo di riga prima di compilare i campi sotto.'));

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

  const extraHost = el('div');
  form.appendChild(extraHost);

  function drawExtra() {
    extraHost.innerHTML = '';
    if (tipoCheckbox.checked) {
      extraHost.appendChild(field('Stato', select('stato', Object.entries(STATO_LAVORAZIONE_LABEL).map(([k, v]) => [k, v]), existing?.statoReale ?? 'da-fare')));
      extraHost.appendChild(field('Priorità', select('priorita', Object.entries(PRIORITA), existing?.priorita ?? 'media')));
      extraHost.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
    } else {
      extraHost.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'pianificata')));
      if (existing?.ha_scostamento) {
        extraHost.appendChild(el('label', { style: 'display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:var(--ink-2);margin:-6px 0 14px' }, [
          el('input', { type: 'checkbox', name: 'reimposta_baseline', style: 'margin-top:2px' }),
          el('span', {}, [
            'Reimposta la baseline su queste date',
            el('div', { class: 'field__hint', style: 'margin-top:2px' },
              `Baseline attuale: ${formatDate(existing.baseline_data_inizio)} → ${formatDate(existing.baseline_data_fine)}. Spunta per far coincidere la barra di riferimento con le nuove date.`),
          ]),
        ]));
      }
      extraHost.appendChild(field('Note', textarea('note', existing?.note ?? '')));
    }
  }
  drawExtra();
  tipoCheckbox.addEventListener('change', drawExtra);

  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = state.commessaId;
    const lavorazione = tipoCheckbox.checked;
    try {
      if (lavorazione) {
        if (existing) await api.put(`/lavorazioni/${existing.id}`, data);
        else await api.post('/lavorazioni', data);
      } else {
        data.reimposta_baseline = data.reimposta_baseline === '1';
        if (existing) await api.put(`/milestone/${existing.id}`, data);
        else await api.post('/milestone', data);
      }
      closeModal();
      toast(existing ? 'Modifica salvata.' : (lavorazione ? 'Lavorazione creata.' : 'Milestone registrata.'));
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? (isLavorazione ? 'Modifica lavorazione' : 'Modifica milestone') : 'Nuova riga', form);
}

function stampaVistaGantt() {
  document.body.classList.add('printing-gantt');
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-gantt'), { once: true });
  window.print();
}

function openStampaModal(items, commessa) {
  const form = el('form', {});
  form.appendChild(el('p', { class: 'muted', style: 'margin-top:0' }, 'Lascia vuoto per stampare l\'elenco completo, oppure indica un periodo per stampare solo le attività che vi ricadono.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Da', dateInput('da', '')),
    field('A', dateInput('a', '')),
  ]));
  const ganttCheckbox = el('input', { type: 'checkbox' });
  form.appendChild(el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12.5px;margin:-6px 0 16px;cursor:pointer' }, [
    ganttCheckbox, 'Includi anche la vista Gantt (grafico)',
  ]));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Stampa'),
  ]));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = formData(form);
    const filtered = (data.da || data.a)
      ? items.filter((it) => (!data.da || it.data_fine >= data.da) && (!data.a || it.data_inizio <= data.a))
      : items;
    const includeGantt = ganttCheckbox.checked;
    closeModal();
    printReport('Elenco Timeline', commessa, [{
      heading: 'Milestone e lavorazioni',
      columns: ['Tipo', 'Titolo', 'Piano', 'Zona', 'WP', 'Inizio', 'Fine', 'Stato', 'Scostamento da baseline'],
      rows: filtered.map((it) => [
        it.type === 'milestone' ? 'Milestone' : 'Lavorazione',
        it.titolo, it.piano || '—', it.zona || '—', it.wp_codice || '—',
        formatDate(it.data_inizio), formatDate(it.data_fine),
        it.in_ritardo ? 'In ritardo' : it.statoLabel,
        it.ha_scostamento ? `era ${formatDate(it.baseline_data_inizio)} → ${formatDate(it.baseline_data_fine)}` : '—',
      ]),
    }]);
    if (includeGantt) stampaVistaGantt();
  });
  openModal('Stampa Timeline', form);
}

export async function renderTimeline(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  let granularity = 'week';
  let zoom = 1;
  let items = [];
  const clienteSoloLettura = state.currentUser?.ruolo === 'cliente';
  const soloLettura = clienteSoloLettura || inVistaGruppo();
  if (inVistaGruppo() && !clienteSoloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una barra o una riga per modificarla. Per creare una nuova riga, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  const zoomSlider = el('input', {
    type: 'range', min: '0.4', max: '3', step: '0.1', value: '1', class: 'gantt__zoom',
    title: 'Zoom timeline', oninput: (e) => { zoom = Number(e.target.value); draw(); },
  });

  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:10px;align-items:center' }),
    el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
      el('span', { class: 'muted', style: 'font-size:11px' }, 'Zoom'),
      zoomSlider,
      el('button', { class: 'btn btn--sm', onclick: () => openStampaModal(items, inVistaGruppo() ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find((c) => c.id === state.commessaId)) }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova riga'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  function drawGranularityButtons() {
    const host = toolbar.firstChild;
    host.innerHTML = '';
    [['week', 'Settimane'], ['month', 'Mesi']].forEach(([value, label]) => {
      host.appendChild(el('button', {
        class: 'btn btn--sm' + (granularity === value ? ' btn--primary' : ''),
        onclick: () => { granularity = value; drawGranularityButtons(); draw(); },
      }, label));
    });
  }
  drawGranularityButtons();

  const ganttHost = el('div', { class: 'gantt-print-area' });
  container.appendChild(ganttHost);

  async function refresh() {
    const [milestoneRes, lavorazioniRes, milestoneStatoList, lavorazioniStatoList, lavorazioniPrioritaList] = await Promise.all([
      api.get(`/milestone?${queryScopeCommessa()}`),
      api.get(`/lavorazioni?${queryScopeCommessa()}`),
      getCategoria('milestone_stato'),
      getCategoria('lavorazioni_stato'),
      getCategoria('lavorazioni_priorita'),
    ]);
    STATO = mergeLabels(STATO_FIXED, milestoneStatoList);
    STATO_LAVORAZIONE_LABEL = mergeLabels(STATO_LAVORAZIONE_LABEL_FIXED, lavorazioniStatoList);
    PRIORITA = mergeLabels(PRIORITA_FIXED, lavorazioniPrioritaList);
    const oggi = todayISO();
    const milestoneItems = milestoneRes.data.map((m) => ({
      ...m, type: 'milestone', statoLabel: STATO[m.stato][0],
    }));
    const lavorazioneItems = lavorazioniRes.data
      .filter((l) => l.data_inizio && l.data_fine)
      .map((l) => ({
        ...l, type: 'lavorazione',
        statoReale: l.stato,
        stato: STATO_LAVORAZIONE_CLS[l.stato] || 'pianificata',
        statoLabel: STATO_LAVORAZIONE_LABEL[l.stato] || l.stato,
        in_ritardo: l.stato !== 'completata' && l.data_fine < oggi,
        ha_scostamento: false,
        impresa_label: l.contratto_controparte || l.impresa || null,
      }));
    items = [...milestoneItems, ...lavorazioneItems].sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1));
    draw();
  }

  function draw() {
    if (!items.length) {
      ganttHost.innerHTML = '';
      ganttHost.appendChild(el('p', { class: 'muted' }, 'Nessuna milestone o lavorazione con date registrata. Aggiungine una per vedere la timeline.'));
      return;
    }

    const minStart = items.reduce((m, r) => (r.data_inizio < m ? r.data_inizio : m), items[0].data_inizio);
    const maxEnd = items.reduce((m, r) => (r.data_fine > m ? r.data_fine : m), items[0].data_fine);
    const paddedStart = addDays(minStart, -3);
    const rangeStart = granularity === 'week' ? mondayOnOrBefore(paddedStart) : firstOfMonth(paddedStart);
    const rangeEnd = addDays(maxEnd, 7);
    const ppd = pxPerDay(granularity, zoom);
    const totalWidthPx = Math.max(1, daysBetween(rangeStart, rangeEnd)) * ppd;
    const oggi = todayISO();
    const todayOffsetPx = Math.max(0, daysBetween(rangeStart, oggi)) * ppd;

    const axis = buildAxis(rangeStart, rangeEnd, granularity, zoom);
    const nomeWidth = computeNomeWidth(items);

    const labelCols = (nome, meta, inizio, fine, onEdit) => el('div', {
      class: 'gantt__label' + (onEdit ? ' gantt__label--clickable' : ''),
      onclick: onEdit || null,
    }, [
      el('div', { class: 'gantt__label-col gantt__label-col--nome' }, [
        el('div', { class: 'gantt__label-titolo' }, nome),
        meta ? el('div', { class: 'gantt__label-meta' }, meta) : null,
      ]),
      el('div', { class: 'gantt__label-col gantt__label-col--data' }, inizio),
      el('div', { class: 'gantt__label-col gantt__label-col--data' }, fine),
    ]);

    const headerRow = el('div', { class: 'gantt__row gantt__row--head' }, [
      labelCols('Attività', null, 'Inizio', 'Fine'),
      el('div', { class: 'gantt__axis', style: `width:${totalWidthPx}px` }, axis.map((s) => el('div', {
        class: 'gantt__col', style: `left:${s.leftPx}px;width:${s.widthPx}px`,
      }, [
        el('div', { class: 'gantt__col-label' }, s.label),
        s.sub ? el('div', { class: 'gantt__col-sub' }, s.sub) : null,
      ]))),
    ]);

    function bar(dataInizio, dataFine, extraClass, titleText, clickable) {
      const startOffset = Math.max(0, daysBetween(rangeStart, dataInizio));
      const endOffset = daysBetween(rangeStart, dataFine) + 1;
      const leftPx = startOffset * ppd;
      const widthPx = Math.max(6, (endOffset - startOffset) * ppd);
      return el('div', {
        class: extraClass,
        style: `left:${leftPx}px;width:${widthPx}px`,
        title: titleText,
        onclick: clickable || null,
      });
    }

    const rows = items.map((it) => {
      const isLavorazione = it.type === 'lavorazione';
      const cls = it.in_ritardo ? 'ritardo' : it.stato;
      const track = el('div', { class: 'gantt__track', style: `width:${totalWidthPx}px` });
      if (it.ha_scostamento) {
        track.appendChild(bar(
          it.baseline_data_inizio, it.baseline_data_fine, 'gantt__bar-baseline',
          `Baseline: ${formatDate(it.baseline_data_inizio)} → ${formatDate(it.baseline_data_fine)}`
        ));
      }
      const onEdit = clienteSoloLettura ? null : (() => openForm(it, refresh));
      track.appendChild(bar(
        it.data_inizio, it.data_fine, `gantt__bar gantt__bar--${cls}${isLavorazione ? ' gantt__bar--thin' : ''}`,
        `${it.titolo} · ${formatDate(it.data_inizio)} → ${formatDate(it.data_fine)}${it.in_ritardo ? ' · IN RITARDO' : ''}${it.ha_scostamento ? ' · scostamento dalla baseline' : ''}`,
        onEdit
      ));

      const metaParts = (isLavorazione
        ? [it.piano, it.zona, it.wp_codice, it.impresa_label]
        : [it.piano, it.zona, it.wp_codice]
      ).concat(inVistaGruppo() ? [it.commessa_codice] : []).filter(Boolean);

      return el('div', { class: 'gantt__row' + (it.ha_scostamento ? ' gantt__row--scostamento' : '') + (isLavorazione ? ' gantt__row--lavorazione' : '') }, [
        labelCols(
          [it.titolo, el('span', { class: 'gantt__type-tag' }, isLavorazione ? 'Lavorazione' : 'Milestone'),
            it.ha_scostamento ? el('span', { class: 'gantt__scostamento-dot', title: 'Scostamento dalla baseline' }) : null],
          metaParts.join(' · ') || '—',
          formatDate(it.data_inizio), formatDate(it.data_fine),
          onEdit
        ),
        track,
      ]);
    });

    const chart = el('div', { class: 'gantt__chart' }, [
      headerRow,
      ...rows,
      el('div', { class: 'gantt__today-line', style: `left: calc(var(--gantt-label-w) + ${todayOffsetPx}px)` }),
    ]);

    ganttHost.innerHTML = '';
    ganttHost.appendChild(el('div', { class: 'gantt', style: `--gantt-nome-w:${nomeWidth}px;--gantt-label-w:${nomeWidth + 170}px` }, chart));
    ganttHost.appendChild(el('div', { class: 'gantt__legend' }, [
      legendItem('pianificata', 'Pianificata'), legendItem('in-corso', 'In corso'),
      legendItem('completata', 'Completata'), legendItem('ritardo', 'In ritardo'),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-dot gantt__legend-dot--baseline' }), 'Baseline (scostamento)']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__type-tag' }, 'Lavorazione'), 'riga più sottile = lavorazione, non milestone']),
    ]));
  }

  function legendItem(cls, label) {
    return el('div', { class: 'gantt__legend-item' }, [el('span', { class: `gantt__legend-dot gantt__legend-dot--${cls}` }), label]);
  }

  await refresh();
}
