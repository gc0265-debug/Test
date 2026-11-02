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
  el, field, textInput, dateInput, textarea, select, formData, pill,
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

// Colori delle barre del Gantt personalizzabili a piacere: salvati solo
// nel browser (non è un dato di commessa, è una preferenza visiva di chi
// guarda), applicati come variabili CSS sopra i colori di tema di default
// — lasciando un colore non impostato, resta quello di tema (anche in
// dark mode) invece di forzare un esadecimale fisso.
const CHIAVE_COLORI_GANTT = 'cc.ganttColori';
const GANTT_COLORI_STATO = [
  { key: 'pianificata', label: 'Pianificata / Da fare', default: '#8A8A8A' },
  { key: 'in-corso', label: 'In corso', default: '#2E6FA8' },
  { key: 'completata', label: 'Completata', default: '#2E7D5B' },
  { key: 'ritardo', label: 'In ritardo / Bloccata', default: '#C0332B' },
  { key: 'baseline', label: 'Baseline (scostamento)', default: '#A8761E' },
  { key: 'riepilogo', label: 'Lavorazione madre (riepilogo)', default: '#1A1A1A' },
];
function leggiColoriGantt() {
  try {
    const raw = localStorage.getItem(CHIAVE_COLORI_GANTT);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function applicaColoriGantt(host, colori) {
  GANTT_COLORI_STATO.forEach(({ key }) => {
    if (colori[key]) host.style.setProperty(`--gantt-color-${key}`, colori[key]);
    else host.style.removeProperty(`--gantt-color-${key}`);
  });
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
function firstOfQuarter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3, 1);
  return d.toISOString().slice(0, 10);
}
function firstOfNextQuarter(dateStr) {
  const d = new Date(firstOfQuarter(dateStr) + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}
function quarterLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return `T${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}
function firstOfSemester(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() < 6 ? 0 : 6, 1);
  return d.toISOString().slice(0, 10);
}
function firstOfNextSemester(dateStr) {
  const d = new Date(firstOfSemester(dateStr) + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 6);
  return d.toISOString().slice(0, 10);
}
function semesterLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return `${d.getUTCMonth() < 6 ? '1°' : '2°'} sem. ${d.getUTCFullYear()}`;
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
// mese ~150px, trimestre ~220px, semestre ~280px) resti leggibile anche su
// commesse che coprono molti mesi — il grafico cresce in larghezza (scroll
// orizzontale) invece di schiacciare le colonne. zoom è un moltiplicatore
// continuo (slider) sopra questa base.
const PX_PER_DAY_BASE = { week: 90 / 7, month: 150 / 30.44, quarter: 220 / 91.3, semester: 280 / 182.6 };
function pxPerDay(granularity, zoom) {
  return (PX_PER_DAY_BASE[granularity] || PX_PER_DAY_BASE.week) * zoom;
}

// Un'unica tabella con l'inizio del periodo che contiene una data, il
// periodo successivo e l'etichetta, invece di un ramo if/else per ogni
// granularità: aggiungere una nuova vista (qui Trimestri/Semestri, oltre
// a Settimane/Mesi già presenti) significa solo aggiungere una riga.
const GRANULARITA = {
  week: { inizioPeriodo: mondayOnOrBefore, periodoSuccessivo: (c) => addDays(c, 7), etichetta: (c) => `S${isoWeek(c)}`, sottotitolo: (c) => `${formatShort(c)}–${formatShort(addDays(c, 6))}` },
  month: { inizioPeriodo: firstOfMonth, periodoSuccessivo: firstOfNextMonth, etichetta: monthLabel, sottotitolo: () => '' },
  quarter: { inizioPeriodo: firstOfQuarter, periodoSuccessivo: firstOfNextQuarter, etichetta: quarterLabel, sottotitolo: () => '' },
  semester: { inizioPeriodo: firstOfSemester, periodoSuccessivo: firstOfNextSemester, etichetta: semesterLabel, sottotitolo: () => '' },
};

function buildAxis(rangeStart, rangeEnd, granularity, zoom) {
  const ppd = pxPerDay(granularity, zoom);
  const g = GRANULARITA[granularity] || GRANULARITA.week;
  const segments = [];
  let cursor = g.inizioPeriodo(rangeStart);
  while (cursor < rangeEnd) {
    const segEnd = g.periodoSuccessivo(cursor);
    const startOffset = Math.max(0, daysBetween(rangeStart, cursor));
    const endOffset = daysBetween(rangeStart, segEnd);
    segments.push({
      label: g.etichetta(cursor),
      sub: g.sottotitolo(cursor),
      leftPx: startOffset * ppd,
      widthPx: Math.max(0, endOffset - startOffset) * ppd,
    });
    cursor = segEnd;
  }
  return segments;
}

// Apre un piccolo modulo per collegare un predecessore all'attività
// `item` (sempre Fine-Inizio, con un ritardo/anticipo opzionale in
// giorni). Chiude questo modulo e riapre quello dell'attività, così la
// lista dei predecessori si aggiorna — stesso schema già usato per
// aggiungere un Work Package da dentro la scheda Commesse.
async function openAggiungiPredecessore(item, commessaId, onCollegato) {
  const [milestoniRes, lavorazioniRes, depRes] = await Promise.all([
    api.get(`/milestone?commessa_id=${commessaId}`),
    api.get(`/lavorazioni?commessa_id=${commessaId}`),
    api.get(`/timeline-dipendenze?commessa_id=${commessaId}`),
  ]);
  const giaCollegati = new Set(depRes.data
    .filter((d) => d.succ_tipo === item.type && String(d.succ_id) === String(item.id))
    .map((d) => `${d.pred_tipo}:${d.pred_id}`));
  const opzioni = [
    ...milestoniRes.data.map((m) => [`milestone:${m.id}`, `[Milestone] ${m.titolo}`]),
    ...lavorazioniRes.data.map((l) => [`lavorazione:${l.id}`, `[Lavorazione] ${l.titolo}`]),
  ].filter(([key]) => key !== `${item.type}:${item.id}` && !giaCollegati.has(key));

  if (!opzioni.length) {
    toast('Nessun\'altra attività disponibile da collegare come predecessore.', { error: true });
    return;
  }

  const form = el('form', {});
  form.appendChild(field('Predecessore', select('predecessore', opzioni, opzioni[0][0]),
    'L\'attività che deve finire (più l\'eventuale ritardo sotto) prima che questa possa iniziare.'));
  form.appendChild(field('Ritardo (giorni)', textInput('ritardo_giorni', '0', { type: 'number' }),
    'Giorni di attesa dopo la fine del predecessore. Negativo per un anticipo/sovrapposizione consentita.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Collega'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const [predTipo, predId] = form.predecessore.value.split(':');
    try {
      await api.post('/timeline-dipendenze', {
        commessa_id: commessaId, pred_tipo: predTipo, pred_id: Number(predId),
        succ_tipo: item.type, succ_id: item.id,
        ritardo_giorni: Number(form.ritardo_giorni.value) || 0,
      });
      toast('Predecessore collegato.');
      await onCollegato();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal('Aggiungi predecessore', form);
}

async function openForm(existing, onSaved, presets = {}) {
  const isLavorazione = existing ? existing.type === 'lavorazione' : presets.type === 'lavorazione';
  // In vista aggregata di gruppo la riga può appartenere a una commessa
  // diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? presets.commessa_id ?? state.commessaId;
  const [wpRes, lavorazioniRes] = await Promise.all([
    api.get(`/commesse/${commessaIdForm}/wp`),
    api.get(`/lavorazioni?commessa_id=${commessaIdForm}`),
  ]);
  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  const wpOptions = [['', 'Tutti i WP'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  // Solo lavorazioni di primo livello (senza a loro volta una madre) e
  // diverse da questa: la gerarchia resta a 2 soli livelli.
  const parentOptions = [['', '— nessuna (lavorazione autonoma)'],
    ...lavorazioniRes.data.filter((l) => !l.parent_id && l.id !== existing?.id).map((l) => [l.id, l.titolo])];

  const tipoCheckbox = el('input', { type: 'checkbox', checked: isLavorazione, disabled: !!existing || !!presets.parent_id });
  form.appendChild(el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12.5px;margin-bottom:6px;cursor:pointer' }, [
    tipoCheckbox, 'È una Lavorazione (lascia vuoto per una Milestone)',
  ]));
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:0 0 16px' },
    existing ? 'Il tipo non si può cambiare dopo la creazione.'
      : (presets.parent_id ? `Sotto-attività di "${presets.parent_titolo}".` : 'Scegli il tipo di riga prima di compilare i campi sotto.')));

  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true, placeholder: 'es. Montaggio boiserie corridoio' }),
    'Il nome mostrato nella colonna Attività del Gantt.'));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'A quale WP appartiene questa riga.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Piano', textInput('piano', existing?.piano ?? presets.piano ?? '', { placeholder: 'es. Piano 3' }),
      'Determina il gruppo "Piano" in cui la riga compare nella Timeline, in stile MPP.'),
    field('Zona', textInput('zona', existing?.zona ?? '', { placeholder: 'es. Ala nord' }),
      'Dettaglio della posizione all\'interno del piano.'),
  ]));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data inizio', dateInput('data_inizio', existing?.data_inizio || todayISO(), { required: true }),
      'Determina dove inizia la barra nel Gantt.'),
    field('Data fine', dateInput('data_fine', existing?.data_fine || todayISO(), { required: true }),
      'Una milestone con data inizio = data fine appare come un punto, non come una barra.'),
  ]));

  const extraHost = el('div');
  form.appendChild(extraHost);

  function drawExtra() {
    extraHost.innerHTML = '';
    if (tipoCheckbox.checked) {
      extraHost.appendChild(field('Stato', select('stato', Object.entries(STATO_LAVORAZIONE_LABEL).map(([k, v]) => [k, v]), existing?.statoReale ?? 'da-fare'),
        'Determina il colore della barra nel Gantt; "Bloccata" la mostra in rosso come se fosse in ritardo.'));
      extraHost.appendChild(field('Priorità', select('priorita', Object.entries(PRIORITA), existing?.priorita ?? 'media'),
        'Solo informativa: non influisce sul calcolo delle date o sull\'ordine in tabella.'));
      extraHost.appendChild(field('Lavorazione madre', select('parent_id', parentOptions, existing?.parent_id ?? presets.parent_id ?? '', { disabled: !!presets.parent_id }),
        'Scegli una lavorazione madre per renderla una sotto-attività, mostrata rientrata sotto di essa nella Timeline.'));
      if (presets.parent_id) extraHost.appendChild(el('input', { type: 'hidden', name: 'parent_id', value: presets.parent_id }));
      extraHost.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? ''),
        'Dettagli aggiuntivi, non mostrati nel Gantt ma visibili aprendo la lavorazione.'));
    } else {
      extraHost.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'pianificata'),
        'Determina il colore della barra nel Gantt.'));
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
      extraHost.appendChild(field('Note', textarea('note', existing?.note ?? ''),
        'Annotazioni libere, visibili solo qui.'));
    }
  }
  drawExtra();
  tipoCheckbox.addEventListener('change', drawExtra);

  // Predecessori: solo su un'attività già salvata (serve il suo id). Un
  // collegamento in conflitto con le date attuali è segnalato in rosso,
  // ma non viene mai corretto da solo — resta una scelta manuale.
  if (existing) {
    form.appendChild(el('div', { class: 'eyebrow', style: 'margin-top:18px' }, 'Predecessori (dipendenze)'));
    const depHost = el('div');
    form.appendChild(depHost);

    async function drawDeps() {
      const res = await api.get(`/timeline-dipendenze?commessa_id=${commessaIdForm}`);
      const mieDipendenze = res.data.filter((d) => d.succ_tipo === existing.type && String(d.succ_id) === String(existing.id));
      depHost.innerHTML = '';
      if (!mieDipendenze.length) {
        depHost.appendChild(el('p', { class: 'muted', style: 'margin:4px 0' }, 'Nessun predecessore collegato: questa attività può iniziare liberamente.'));
        return;
      }
      depHost.appendChild(el('div', { style: 'border:1px solid var(--rule);margin:6px 0 4px' }, mieDipendenze.map((d) => el('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;font-size:12.5px;border-bottom:1px solid var(--rule-2)',
      }, [
        el('span', {}, [
          d.pred_titolo, ' ',
          pill(d.violazione ? `in conflitto · ${d.giorni_scostamento}gg` : (d.ritardo_giorni ? `+${d.ritardo_giorni}gg` : 'fine-inizio'), d.violazione ? 'rosso' : 'outline'),
        ]),
        el('button', {
          type: 'button', class: 'btn btn--sm btn--ghost btn--danger',
          onclick: async () => {
            if (!confirmDialog('Rimuovere questo predecessore?')) return;
            await api.del(`/timeline-dipendenze/${d.id}`);
            await drawDeps();
          },
        }, 'Rimuovi'),
      ]))));
    }
    await drawDeps();
    form.appendChild(el('button', {
      type: 'button', class: 'btn btn--sm', style: 'margin:4px 0 4px',
      onclick: () => openAggiungiPredecessore(existing, commessaIdForm, async () => { closeModal(); await openForm(existing, onSaved); }),
    }, '+ Aggiungi predecessore'));
    form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 16px' },
      'Un predecessore deve finire (più l\'eventuale ritardo) prima che questa attività inizi. Le frecce nel Gantt mostrano questi collegamenti; quelle rosse sono sul percorso critico, quelle tratteggiate in conflitto con le date attuali.'));
  }

  const azioni = [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
  ];
  if (existing && !isLavorazione) {
    azioni.push(el('button', {
      type: 'button', class: 'btn btn--ghost btn--danger',
      onclick: async () => {
        if (!confirmDialog('Eliminare questa milestone?')) return;
        await api.del(`/milestone/${existing.id}`);
        closeModal();
        toast('Milestone eliminata.');
        onSaved();
      },
    }, 'Elimina'));
  }
  azioni.push(el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'));
  form.appendChild(el('div', { class: 'modal__actions' }, azioni));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = presets.commessa_id ?? state.commessaId;
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
    field('Da', dateInput('da', ''), 'Include le righe ancora in corso o non finite a questa data.'),
    field('A', dateInput('a', ''), 'Include le righe già iniziate entro questa data.'),
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
  // Dipendenze fra attività (sempre Fine-Inizio): ricaricate solo in
  // refresh(), non ad ogni draw() — disegnarle di nuovo con lo zoom
  // cambiato non richiede di rileggerle dal server.
  let dipendenze = [];
  // Stato di espansione dei gruppi "Piano" e delle lavorazioni madre con
  // sotto-attività — persiste tra un draw() e l'altro (zoom, refresh...)
  // ma si azzera riaprendo la pagina.
  const collapsedGroups = new Set();
  const collapsedParents = new Set();
  const clienteSoloLettura = state.currentUser?.ruolo === 'cliente';
  const soloLettura = clienteSoloLettura || inVistaGruppo();
  if (inVistaGruppo() && !clienteSoloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una barra o una riga per modificarla. Per creare una nuova riga, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  // Barra orizzontale in cima, sempre visibile: le lavorazioni
  // attualmente in corso (oggi compreso nel loro intervallo, o marcate
  // "In corso" a mano) senza dover scorrere il Gantt per trovarle.
  const settimanaHost = el('div');
  container.appendChild(settimanaHost);

  function drawSettimanaBar() {
    const oggi = todayISO();
    // Una lavorazione madre (riepilogo) entra qui quando l'intervallo
    // complessivo delle sue sotto-attività copre oggi, anche se nessuna
    // singola sotto-attività risulta attiva in questo preciso momento:
    // l'attività nel suo insieme è comunque in corso.
    const inCorso = items.filter((it) => it.type === 'lavorazione'
      && (it.statoReale === 'in-corso' || (it.data_inizio <= oggi && it.data_fine >= oggi)));

    settimanaHost.innerHTML = '';
    if (!inCorso.length) return;
    const chips = inCorso.map((it) => el(soloLettura ? 'div' : 'button', {
      type: soloLettura ? undefined : 'button',
      class: 'scadenza-chip timeline-settimana__chip' + (it.in_ritardo ? ' alert' : ''),
      onclick: soloLettura ? undefined : () => openForm(it, refresh),
    }, [
      el('div', { class: 'scadenza-chip__titolo' }, `⚙ ${it.titolo}`),
      el('div', { class: 'scadenza-chip__meta' }, [
        el('span', {}, [it.piano, it.zona].filter(Boolean).join(' · ') || (it.wp_codice || '—')),
        el('span', { class: 'scadenza-chip__gg' }, `${formatDate(it.data_inizio)} → ${formatDate(it.data_fine)}`),
      ]),
    ]));
    settimanaHost.appendChild(el('div', { class: 'cruscotto-scadenze timeline-settimana' }, [
      el('div', { class: 'cruscotto-scadenze__head' }, [
        el('div', { class: 'cruscotto-scadenze__titolo' }, [
          'Lavorazioni in corso',
          el('span', { class: 'pill pill--outline' }, `${inCorso.length} attive`),
        ]),
      ]),
      el('div', { class: 'cruscotto-scadenze__row' }, chips),
    ]));
  }

  const zoomSlider = el('input', {
    type: 'range', min: '0.4', max: '3', step: '0.1', value: '1', class: 'gantt__zoom',
    title: 'Zoom timeline', oninput: (e) => { zoom = Number(e.target.value); draw(); },
  });

  // Colori delle barre a scelta: cambiano subito in anteprima mentre si
  // sceglie, salvati nel browser (vedi leggiColoriGantt/applicaColoriGantt
  // in cima al file) — non un dato della commessa, una preferenza visiva.
  function apriColoriModal() {
    const colori = leggiColoriGantt();
    const righe = GANTT_COLORI_STATO.map(({ key, label, default: def }) => {
      const input = el('input', {
        type: 'color', value: colori[key] || def,
        oninput: (e) => {
          colori[key] = e.target.value;
          try { localStorage.setItem(CHIAVE_COLORI_GANTT, JSON.stringify(colori)); } catch (_) { /* privacy mode: preferenza non salvata, resta solo per questa sessione */ }
          const ganttEl = ganttHost.querySelector('.gantt');
          if (ganttEl) applicaColoriGantt(ganttEl, colori);
        },
      });
      return el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px' }, [
        el('span', { style: 'font-size:12.5px' }, label), input,
      ]);
    });
    openModal('Colori della Timeline', el('div', {}, [
      ...righe,
      el('div', { class: 'modal__actions' }, [
        el('button', {
          type: 'button', class: 'btn', onclick: () => {
            try { localStorage.removeItem(CHIAVE_COLORI_GANTT); } catch (_) { /* vedi sopra */ }
            closeModal();
            draw();
          },
        }, 'Ripristina predefiniti'),
        el('button', { type: 'button', class: 'btn btn--primary', onclick: () => closeModal() }, 'Fatto'),
      ]),
    ]));
  }

  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:10px;align-items:center' }),
    el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
      el('span', { class: 'muted', style: 'font-size:11px' }, 'Zoom'),
      zoomSlider,
      el('button', { class: 'btn btn--sm', onclick: apriColoriModal }, 'Colori'),
      el('button', { class: 'btn btn--sm', onclick: () => openStampaModal(items, inVistaGruppo() ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find((c) => c.id === state.commessaId)) }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova riga'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  function drawGranularityButtons() {
    const host = toolbar.firstChild;
    host.innerHTML = '';
    [['week', 'Settimane'], ['month', 'Mesi'], ['quarter', 'Trimestri'], ['semester', 'Semestri']].forEach(([value, label]) => {
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
    const [milestoneRes, lavorazioniRes, milestoneStatoList, lavorazioniStatoList, lavorazioniPrioritaList, dipendenzeRes] = await Promise.all([
      api.get(`/milestone?${queryScopeCommessa()}`),
      api.get(`/lavorazioni?${queryScopeCommessa()}`),
      getCategoria('milestone_stato'),
      getCategoria('lavorazioni_stato'),
      getCategoria('lavorazioni_priorita'),
      // Le dipendenze hanno senso solo su una singola commessa, mai nella
      // vista aggregata di gruppo (nessun collegamento fra commesse diverse).
      state.commessaId ? api.get(`/timeline-dipendenze?commessa_id=${state.commessaId}`) : Promise.resolve({ data: [] }),
    ]);
    dipendenze = dipendenzeRes.data;
    STATO = mergeLabels(STATO_FIXED, milestoneStatoList);
    STATO_LAVORAZIONE_LABEL = mergeLabels(STATO_LAVORAZIONE_LABEL_FIXED, lavorazioniStatoList);
    PRIORITA = mergeLabels(PRIORITA_FIXED, lavorazioniPrioritaList);
    const oggi = todayISO();
    const milestoneItems = milestoneRes.data.map((m) => ({
      ...m, type: 'milestone', statoLabel: STATO[m.stato][0],
    }));

    // Le sotto-attività (parent_id valorizzato) di una lavorazione madre
    // entrano in Gantt solo con le proprie date; la madre, se ha almeno
    // una sotto-attività con date, diventa una riga "riepilogo" stile MPP:
    // la sua barra copre sempre l'intervallo minimo-massimo delle
    // sotto-attività (più le proprie date, se presenti), non è trascinabile
    // a mano e le date sottostanti restano quelle vere, modificabili solo
    // aprendo la singola sotto-attività o la madre stessa.
    const tutte = lavorazioniRes.data.map((l) => ({
      ...l, type: 'lavorazione',
      statoReale: l.stato,
      stato: STATO_LAVORAZIONE_CLS[l.stato] || 'pianificata',
      statoLabel: STATO_LAVORAZIONE_LABEL[l.stato] || l.stato,
      impresa_label: l.contratto_controparte || l.impresa || null,
    }));
    const figliPerMadre = new Map();
    tutte.forEach((l) => {
      if (!l.parent_id) return;
      if (!figliPerMadre.has(l.parent_id)) figliPerMadre.set(l.parent_id, []);
      figliPerMadre.get(l.parent_id).push(l);
    });

    const lavorazioneItems = [];
    tutte.forEach((l) => {
      if (l.parent_id) {
        if (l.data_inizio && l.data_fine) {
          lavorazioneItems.push({ ...l, in_ritardo: l.stato !== 'completata' && l.data_fine < oggi, ha_scostamento: false });
        }
        return;
      }
      const figli = (figliPerMadre.get(l.id) || []).filter((f) => f.data_inizio && f.data_fine);
      const isSummary = figli.length > 0;
      let dataInizio = l.data_inizio;
      let dataFine = l.data_fine;
      if (isSummary) {
        const starts = figli.map((f) => f.data_inizio).concat(l.data_inizio ? [l.data_inizio] : []);
        const ends = figli.map((f) => f.data_fine).concat(l.data_fine ? [l.data_fine] : []);
        dataInizio = starts.reduce((m, d) => (d < m ? d : m), starts[0]);
        dataFine = ends.reduce((m, d) => (d > m ? d : m), ends[0]);
      }
      if (!dataInizio || !dataFine) return;
      lavorazioneItems.push({
        ...l, data_inizio: dataInizio, data_fine: dataFine,
        in_ritardo: !isSummary && l.stato !== 'completata' && dataFine < oggi,
        ha_scostamento: false,
        isSummary, nFigli: figli.length,
      });
    });

    items = [...milestoneItems, ...lavorazioneItems].sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1));
    drawSettimanaBar();
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
    const rangeStart = (GRANULARITA[granularity] || GRANULARITA.week).inizioPeriodo(paddedStart);
    const rangeEnd = addDays(maxEnd, 7);
    const ppd = pxPerDay(granularity, zoom);
    const totalWidthPx = Math.max(1, daysBetween(rangeStart, rangeEnd)) * ppd;
    const oggi = todayISO();
    const todayOffsetPx = Math.max(0, daysBetween(rangeStart, oggi)) * ppd;

    const axis = buildAxis(rangeStart, rangeEnd, granularity, zoom);
    // +40px: spazio per il rientro dei due livelli (sotto-attività dentro
    // una lavorazione madre, dentro un gruppo Piano) più lo chevron.
    const nomeWidth = computeNomeWidth(items) + 40;

    // Righe sottili verticali ad ogni confine di colonna dell'asse (una
    // per settimana in vista "Settimane", una per mese in vista "Mesi"):
    // aiutano a leggere a colpo d'occhio su quale periodo cade una barra,
    // come le righe di sfondo di un vero foglio MPP.
    const gridlines = axis.map((s) => el('div', {
      class: 'gantt__gridline', style: `left: calc(var(--gantt-label-w) + ${s.leftPx}px)`,
    }));

    const labelCols = (wbs, nome, meta, durata, baseInizio, baseFine, inizio, fine, pred, onEdit) => el('div', {
      class: 'gantt__label' + (onEdit ? ' gantt__label--clickable' : ''),
      onclick: onEdit || null,
    }, [
      el('div', { class: 'gantt__label-col gantt__label-col--wbs' }, wbs),
      el('div', { class: 'gantt__label-col gantt__label-col--nome' }, [
        el('div', { class: 'gantt__label-titolo' }, nome),
        meta ? el('div', { class: 'gantt__label-meta' }, meta) : null,
      ]),
      el('div', { class: 'gantt__label-col gantt__label-col--durata' }, durata),
      el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, baseInizio),
      el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, baseFine),
      el('div', { class: 'gantt__label-col gantt__label-col--data' }, inizio),
      el('div', { class: 'gantt__label-col gantt__label-col--data' }, fine),
      el('div', { class: 'gantt__label-col gantt__label-col--pred' }, pred),
    ]);

    const headerRow = el('div', { class: 'gantt__row gantt__row--head' }, [
      labelCols('#', 'Attività', null, 'Durata', 'Base. inizio', 'Base. fine', 'Inizio', 'Fine', 'Pred.'),
      el('div', { class: 'gantt__axis', style: `width:${totalWidthPx}px` }, axis.map((s) => el('div', {
        class: 'gantt__col', style: `left:${s.leftPx}px;width:${s.widthPx}px`,
      }, [
        el('div', { class: 'gantt__col-label' }, s.label),
        s.sub ? el('div', { class: 'gantt__col-sub' }, s.sub) : null,
      ]))),
    ]);

    function bar(dataInizio, dataFine, extraClass, titleText, clickable, depKey) {
      const startOffset = Math.max(0, daysBetween(rangeStart, dataInizio));
      const endOffset = daysBetween(rangeStart, dataFine) + 1;
      const leftPx = startOffset * ppd;
      const widthPx = Math.max(6, (endOffset - startOffset) * ppd);
      return el('div', {
        class: extraClass,
        style: `left:${leftPx}px;width:${widthPx}px`,
        title: titleText,
        onclick: clickable || null,
        'data-dep-key': depKey || null,
      });
    }

    // Trascinamento orizzontale di una barra per spostarla nel tempo
    // (avanti o indietro), snapping al giorno: un movimento sotto i 4px
    // resta un semplice click (apre il modulo di modifica) invece di uno
    // spostamento involontario. Mai per le righe di riepilogo: le loro
    // date sono calcolate dalle sotto-attività, non un campo salvato a sé.
    function attachDragReschedule(barEl, it, onEdit) {
      if (!onEdit) return;
      let startX = null;
      let startLeft = 0;
      let dragging = false;
      let deltaGiorni = 0;

      barEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startLeft = parseFloat(barEl.style.left) || 0;
        dragging = false;
        deltaGiorni = 0;
        barEl.setPointerCapture(e.pointerId);
      });
      barEl.addEventListener('pointermove', (e) => {
        if (startX === null) return;
        const dxPx = e.clientX - startX;
        if (!dragging && Math.abs(dxPx) < 4) return;
        dragging = true;
        barEl.classList.add('gantt__bar--dragging');
        deltaGiorni = Math.round(dxPx / ppd);
        barEl.style.left = `${startLeft + deltaGiorni * ppd}px`;
      });
      async function concludi(e) {
        if (startX === null) return;
        try { barEl.releasePointerCapture(e.pointerId); } catch (_) { /* già rilasciato */ }
        const eraTrascinamento = dragging;
        startX = null;
        dragging = false;
        barEl.classList.remove('gantt__bar--dragging');
        if (!eraTrascinamento) { onEdit(); return; }
        if (deltaGiorni === 0) { barEl.style.left = `${startLeft}px`; return; }
        const nuovaInizio = addDays(it.data_inizio, deltaGiorni);
        const nuovaFine = addDays(it.data_fine, deltaGiorni);
        try {
          const path = it.type === 'milestone' ? 'milestone' : 'lavorazioni';
          await api.put(`/${path}/${it.id}`, { data_inizio: nuovaInizio, data_fine: nuovaFine, _versione: it.updated_at });
          toast(`Spostata al ${formatDate(nuovaInizio)} → ${formatDate(nuovaFine)}.`);
          await refresh();
        } catch (err) {
          toast(err.message, { error: true });
          barEl.style.left = `${startLeft}px`;
        }
      }
      barEl.addEventListener('pointerup', concludi);
      barEl.addEventListener('pointercancel', () => {
        startX = null;
        dragging = false;
        barEl.classList.remove('gantt__bar--dragging');
      });
    }

    // Figli (sotto-attività) indicizzati per id della lavorazione madre —
    // le righe di primo livello sono tutte le milestone più le lavorazioni
    // senza madre; le sotto-attività si trovano solo annidate sotto la
    // propria madre, mai come riga di primo livello a sé stante.
    const figliPerMadre = new Map();
    items.forEach((it) => {
      if (it.type === 'lavorazione' && it.parent_id) {
        if (!figliPerMadre.has(it.parent_id)) figliPerMadre.set(it.parent_id, []);
        figliPerMadre.get(it.parent_id).push(it);
      }
    });
    const primoLivello = items.filter((it) => it.type === 'milestone' || !it.parent_id);

    // Numerazione WBS (1, 1.1, 1.2...) e codici dei predecessori (es.
    // "2.1FS+2gg", sempre Fine-Inizio come da timeline_dipendenze) in
    // stile MPP: popolata subito dopo aver calcolato i gruppi "Piano" più
    // sotto, letta da buildItemRow quando disegna le righe.
    const wbsMap = new Map();
    function durataGg(it) {
      return daysBetween(it.data_inizio, it.data_fine) + 1;
    }
    function codiciPredecessori(it) {
      const miei = dipendenze.filter((d) => d.succ_tipo === it.type && d.succ_id === it.id);
      if (!miei.length) return '—';
      return miei.map((d) => {
        const num = wbsMap.get(`${d.pred_tipo}:${d.pred_id}`) || '?';
        const ritardo = d.ritardo_giorni ? `${d.ritardo_giorni > 0 ? '+' : ''}${d.ritardo_giorni}gg` : '';
        return `${num}FS${ritardo}`;
      }).join(', ');
    }

    function buildItemRow(it, livello) {
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
      // Le righe di riepilogo non si trascinano: le loro date sono il
      // minimo/massimo calcolato delle sotto-attività, non un campo
      // salvato a sé — trascinarle scriverebbe date sbagliate sul server.
      const trascinabile = !!onEdit && !it.isSummary;
      const barEl = bar(
        it.data_inizio, it.data_fine,
        `gantt__bar gantt__bar--${cls}${isLavorazione ? ' gantt__bar--thin' : ''}${it.isSummary ? ' gantt__bar--summary' : ''}`,
        `${it.titolo} · ${formatDate(it.data_inizio)} → ${formatDate(it.data_fine)}${it.in_ritardo ? ' · IN RITARDO' : ''}${it.ha_scostamento ? ' · scostamento dalla baseline' : ''}${it.isSummary ? ' · riepilogo sotto-attività' : ''}`,
        trascinabile ? null : onEdit,
        `${it.type}:${it.id}`
      );
      if (trascinabile) attachDragReschedule(barEl, it, onEdit);
      if (isLavorazione && !it.isSummary && it.percentuale_completamento > 0) {
        barEl.appendChild(el('div', {
          class: 'gantt__bar-progress', style: `width:${Math.min(100, it.percentuale_completamento)}%`,
          title: `Avanzamento ${it.percentuale_completamento}%`,
        }));
      }
      track.appendChild(barEl);

      const figli = isLavorazione ? figliPerMadre.get(it.id) : null;
      const haFigli = !!(figli && figli.length);
      const collassata = haFigli && collapsedParents.has(it.id);

      const metaParts = (isLavorazione
        ? [it.piano, it.zona, it.wp_codice, it.impresa_label]
        : [it.piano, it.zona, it.wp_codice]
      ).concat(inVistaGruppo() ? [it.commessa_codice] : []).filter(Boolean);

      const nomeChildren = [
        haFigli ? el('span', {
          class: 'gantt__chevron' + (collassata ? ' gantt__chevron--collapsed' : ''),
          onclick: (e) => { e.stopPropagation(); if (collapsedParents.has(it.id)) collapsedParents.delete(it.id); else collapsedParents.add(it.id); draw(); },
        }, '▾') : null,
        it.titolo,
        el('span', { class: 'gantt__type-tag' }, isLavorazione ? (it.isSummary ? `LAVORAZIONE · ${it.nFigli} sotto-attività` : 'Lavorazione') : 'Milestone'),
        it.ha_scostamento ? el('span', { class: 'gantt__scostamento-dot', title: 'Scostamento dalla baseline' }) : null,
        (isLavorazione && !it.parent_id && !clienteSoloLettura) ? el('button', {
          type: 'button', class: 'gantt__add-child', title: 'Aggiungi sotto-attività',
          onclick: (e) => { e.stopPropagation(); openForm(null, refresh, { type: 'lavorazione', parent_id: it.id, parent_titolo: it.titolo, piano: it.piano, commessa_id: it.commessa_id }); },
        }, '+ sotto-attività') : null,
      ];

      const label = el('div', {
        class: 'gantt__label' + (onEdit ? ' gantt__label--clickable' : '') + (livello ? ` gantt__label--indent-${livello}` : ''),
        onclick: onEdit || null,
      }, [
        el('div', { class: 'gantt__label-col gantt__label-col--wbs' }, wbsMap.get(`${it.type}:${it.id}`) || ''),
        el('div', { class: 'gantt__label-col gantt__label-col--nome' }, [
          el('div', { class: 'gantt__label-titolo' }, nomeChildren),
          metaParts.length ? el('div', { class: 'gantt__label-meta' }, metaParts.join(' · ')) : null,
        ]),
        el('div', { class: 'gantt__label-col gantt__label-col--durata' }, `${durataGg(it)} gg`),
        el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, it.baseline_data_inizio ? formatDate(it.baseline_data_inizio) : '—'),
        el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, it.baseline_data_fine ? formatDate(it.baseline_data_fine) : '—'),
        el('div', { class: 'gantt__label-col gantt__label-col--data' }, formatDate(it.data_inizio)),
        el('div', { class: 'gantt__label-col gantt__label-col--data' }, formatDate(it.data_fine)),
        el('div', { class: 'gantt__label-col gantt__label-col--pred' }, codiciPredecessori(it)),
      ]);

      const rowEl = el('div', {
        class: 'gantt__row'
          + (it.ha_scostamento ? ' gantt__row--scostamento' : '')
          + (isLavorazione ? ' gantt__row--lavorazione' : '')
          + (it.isSummary ? ' gantt__row--summary' : '')
          + (livello ? ' gantt__row--child' : ''),
      }, [label, track]);

      const out = [rowEl];
      if (haFigli && !collassata) {
        figli
          .slice()
          .sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1))
          .forEach((f) => out.push(...buildItemRow(f, 1)));
      }
      return out;
    }

    // Raggruppamento di primo livello per Piano, in stile MPP: un gruppo
    // per ogni valore di "Piano" (le voci senza piano finiscono in un
    // gruppo unico in coda), ordinati per la data di inizio più vicina.
    const gruppiMap = new Map();
    primoLivello.forEach((it) => {
      const chiave = it.piano && it.piano.trim() ? it.piano.trim() : '';
      if (!gruppiMap.has(chiave)) gruppiMap.set(chiave, []);
      gruppiMap.get(chiave).push(it);
    });
    const gruppi = [...gruppiMap.entries()].map(([piano, arr]) => {
      arr.sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1));
      const starts = arr.map((x) => x.data_inizio);
      const ends = arr.map((x) => x.data_fine);
      return {
        piano, items: arr,
        dataInizio: starts.reduce((m, d) => (d < m ? d : m), starts[0]),
        dataFine: ends.reduce((m, d) => (d > m ? d : m), ends[0]),
      };
    }).sort((a, b) => {
      if (!a.piano) return 1;
      if (!b.piano) return -1;
      return a.dataInizio < b.dataInizio ? -1 : 1;
    });

    const mostraGruppi = gruppi.length > 1 || (gruppi.length === 1 && gruppi[0].piano);

    // Popola la numerazione WBS: 1, 2, 3... per i gruppi Piano (se mostrati),
    // 1.1/1.2 per le attività di primo livello dentro ciascun gruppo,
    // 1.1.1/1.1.2 per le sotto-attività — deve girare prima di disegnare le
    // righe, perché una riga può referenziare come predecessore una riga
    // che compare più avanti nell'elenco.
    gruppi.forEach((g, gIdx) => {
      const gNum = mostraGruppi ? String(gIdx + 1) : null;
      g.items.forEach((it, iIdx) => {
        const iNum = gNum ? `${gNum}.${iIdx + 1}` : String(iIdx + 1);
        wbsMap.set(`${it.type}:${it.id}`, iNum);
        if (it.type === 'lavorazione') {
          (figliPerMadre.get(it.id) || [])
            .slice()
            .sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1))
            .forEach((f, cIdx) => wbsMap.set(`lavorazione:${f.id}`, `${iNum}.${cIdx + 1}`));
        }
      });
    });

    const rows = [];
    gruppi.forEach((g, gIdx) => {
      if (mostraGruppi) {
        const label = g.piano || 'Senza piano';
        const chiave = g.piano || '\u0000senza-piano';
        const collassato = collapsedGroups.has(chiave);
        const nTotale = g.items.reduce((n, it) => n + 1 + (figliPerMadre.get(it.id)?.length || 0), 0);
        const track = el('div', { class: 'gantt__track', style: `width:${totalWidthPx}px` });
        track.appendChild(bar(g.dataInizio, g.dataFine, 'gantt__bar gantt__bar--group',
          `${label} · ${formatDate(g.dataInizio)} → ${formatDate(g.dataFine)} · ${nTotale} attività`, null));
        rows.push(el('div', { class: 'gantt__row gantt__row--group' }, [
          el('div', {
            class: 'gantt__label gantt__label--clickable',
            onclick: () => { if (collassato) collapsedGroups.delete(chiave); else collapsedGroups.add(chiave); draw(); },
          }, [
            el('div', { class: 'gantt__label-col gantt__label-col--wbs' }, String(gIdx + 1)),
            el('div', { class: 'gantt__label-col gantt__label-col--nome' }, [
              el('div', { class: 'gantt__label-titolo' }, [
                el('span', { class: 'gantt__chevron' + (collassato ? ' gantt__chevron--collapsed' : '') }, '▾'),
                `${label} (${nTotale})`,
              ]),
            ]),
            el('div', { class: 'gantt__label-col gantt__label-col--durata' }, `${daysBetween(g.dataInizio, g.dataFine) + 1} gg`),
            el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, '—'),
            el('div', { class: 'gantt__label-col gantt__label-col--data gantt__label-col--baseline' }, '—'),
            el('div', { class: 'gantt__label-col gantt__label-col--data' }, formatDate(g.dataInizio)),
            el('div', { class: 'gantt__label-col gantt__label-col--data' }, formatDate(g.dataFine)),
            el('div', { class: 'gantt__label-col gantt__label-col--pred' }, ''),
          ]),
          track,
        ]));
        if (collassato) return;
      }
      g.items.forEach((it) => rows.push(...buildItemRow(it, 0)));
    });

    const chart = el('div', { class: 'gantt__chart' }, [
      headerRow,
      ...gridlines,
      ...rows,
      el('div', { class: 'gantt__today-line', style: `left: calc(var(--gantt-label-w) + ${todayOffsetPx}px)` }),
    ]);

    // WBS(32) + Nome + Durata(62) + Base.Inizio(85) + Base.Fine(85) + Inizio(85) + Fine(85) + Predecessori(85)
    const labelWidthPx = nomeWidth + 32 + 62 + 85 + 85 + 85 + 85 + 85;
    ganttHost.innerHTML = '';
    const ganttEl = el('div', {
      class: 'gantt',
      style: `--gantt-nome-w:${nomeWidth}px;--gantt-wbs-w:32px;--gantt-durata-w:62px;--gantt-pred-w:85px;--gantt-label-w:${labelWidthPx}px`,
    }, chart);
    applicaColoriGantt(ganttEl, leggiColoriGantt());
    ganttHost.appendChild(ganttEl);
    disegnaDipendenze(chart);
    ganttHost.appendChild(el('div', { class: 'gantt__legend' }, [
      legendItem('pianificata', 'Pianificata'), legendItem('in-corso', 'In corso'),
      legendItem('completata', 'Completata'), legendItem('ritardo', 'In ritardo'),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-dot gantt__legend-dot--baseline' }), 'Baseline (scostamento)']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__type-tag' }, 'Lavorazione'), 'riga più sottile = lavorazione, non milestone']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-bar gantt__legend-bar--group' }), 'Gruppo Piano']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-bar gantt__legend-bar--summary' }), 'Riepilogo sotto-attività']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-dep gantt__legend-dep--critica' }), 'Dipendenza sul percorso critico']),
      el('div', { class: 'gantt__legend-item' }, [el('span', { class: 'gantt__legend-dep gantt__legend-dep--violazione' }), 'Dipendenza in conflitto con le date attuali']),
    ]));
  }

  function legendItem(cls, label) {
    return el('div', { class: 'gantt__legend-item' }, [el('span', { class: `gantt__legend-dot gantt__legend-dot--${cls}` }), label]);
  }

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v !== null && v !== undefined) node.setAttribute(k, v); });
    return node;
  }

  // Percorso "a gomito" (solo segmenti orizzontali/verticali, come in MS
  // Project) invece di una curva morbida: dalla fine del predecessore si
  // esce di un breve tratto fisso, si scende/sale in verticale fino alla
  // riga del successore, poi si entra in orizzontale. Se il successore
  // inizia prima (o troppo vicino) della fine del predecessore — niente
  // spazio per il gomito semplice — si aggira con due gomiti passando per
  // un punto a metà strada fra le due righe.
  function pathOrtogonale(x1, y1, x2, y2) {
    const offset = 14;
    if (x2 - x1 >= offset * 2) {
      const midX = x1 + offset;
      return `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
    }
    const midX1 = x1 + offset;
    const midX2 = x2 - offset;
    const midY = (y1 + y2) / 2;
    return `M${x1},${y1} L${midX1},${y1} L${midX1},${midY} L${midX2},${midY} L${midX2},${y2} L${x2},${y2}`;
  }

  // Frecce di dipendenza fra le barre, disegnate sopra il Gantt dopo che
  // è nel DOM (servono le posizioni reali, con zoom/raggruppamenti già
  // applicati — più affidabile che ricalcolarle a mano). Una dipendenza
  // verso una riga nascosta (gruppo o lavorazione madre collassati) non
  // viene disegnata, semplicemente omessa.
  function disegnaDipendenze(chart) {
    if (!dipendenze.length) return;
    const chartRect = chart.getBoundingClientRect();
    const svg = svgEl('svg', { class: 'gantt__deps', width: chart.scrollWidth, height: chart.scrollHeight });
    const defs = svgEl('defs');
    svg.appendChild(defs);
    ['normale', 'critica', 'violazione'].forEach((variante) => {
      const marker = svgEl('marker', { id: `gantt-arrow-${variante}`, markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse' });
      marker.appendChild(svgEl('path', { d: 'M0,0 L8,4 L0,8 Z', class: `gantt__dep-arrow gantt__dep-arrow--${variante}` }));
      defs.appendChild(marker);
    });

    let disegnate = 0;
    dipendenze.forEach((d) => {
      const predEl = chart.querySelector(`[data-dep-key="${d.pred_tipo}:${d.pred_id}"]`);
      const succEl = chart.querySelector(`[data-dep-key="${d.succ_tipo}:${d.succ_id}"]`);
      if (!predEl || !succEl) return;
      const predRect = predEl.getBoundingClientRect();
      const succRect = succEl.getBoundingClientRect();
      const x1 = predRect.right - chartRect.left;
      const y1 = predRect.top + predRect.height / 2 - chartRect.top;
      const x2 = succRect.left - chartRect.left;
      const y2 = succRect.top + succRect.height / 2 - chartRect.top;
      const variante = d.violazione ? 'violazione' : (d.critica ? 'critica' : 'normale');
      svg.appendChild(svgEl('path', {
        d: pathOrtogonale(x1, y1, x2, y2),
        class: `gantt__dep-line gantt__dep-line--${variante}`,
        'marker-end': `url(#gantt-arrow-${variante})`,
      }));
      disegnate += 1;
    });
    if (disegnate) chart.appendChild(svg);
  }

  await refresh();
}
