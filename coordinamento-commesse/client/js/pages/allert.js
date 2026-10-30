// Registro Allert — classificazione di perimetro e azioni di tutela
// (funzione di presidio GC), collegabile a una criticità o decisione
// già registrata. Struttura generica ispirata al Registro Allert del
// presidio GC, non una sincronizzazione automatica con quel fascicolo.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, toMap, toOptions, mergeLabels } from '../components/categorie.js';

const CLASSIFICAZIONE_FIXED = { informativo: ['Informativo', 'outline'], attenzione: ['Attenzione', 'ambra'], critico: ['Critico', 'rosso'] };
const STATO_FIXED = { aperto: ['Aperto', 'outline'], monitorato: ['Monitorato', 'ambra'], chiuso: ['Chiuso', 'verde'] };
let CLASSIFICAZIONE = CLASSIFICAZIONE_FIXED;
let STATO = STATO_FIXED;

async function openForm(existing, onSaved) {
  const [criticitaRes, decisioniRes, requisitiRes, perimetroList] = await Promise.all([
    api.get(`/criticita?commessa_id=${state.commessaId}`),
    api.get(`/decisioni?commessa_id=${state.commessaId}`),
    api.get(`/requisiti?commessa_id=${state.commessaId}`),
    getCategoria('allert_perimetro'),
  ]);
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const criticitaOptions = [['', '— nessuna'], ...criticitaRes.data.map((c) => [c.id, c.tema])];
  const decisioniOptions = [['', '— nessuna'], ...decisioniRes.data.map((d) => [d.id, d.tema])];
  const requisitiOptions = [['', '— nessuno'], ...requisitiRes.data.map((r) => [r.id, `${r.codice_wbs} — ${r.titolo}`])];

  const form = el('form', {});
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Data', dateInput('data', existing?.data || todayISO(), { required: true })));
  form.appendChild(field('Perimetro', select('perimetro', toOptions(perimetroList), existing?.perimetro ?? 'interno')));
  form.appendChild(field('Classificazione', select('classificazione', Object.entries(CLASSIFICAZIONE).map(([k, v]) => [k, v[0]]), existing?.classificazione ?? 'attenzione')));
  form.appendChild(field('Azione di tutela', textarea('azione_tutela', existing?.azione_tutela ?? ''), 'Cosa è stato fatto per tutelare la posizione: PEC, verbalizzazione, riserva scritta...'));
  form.appendChild(field('Riferimento documento', textInput('rif_documento', existing?.rif_documento ?? '', { placeholder: 'es. PEC del 12/10, verbale riunione' })));
  form.appendChild(field('Collegato a criticità', select('rif_criticita_id', criticitaOptions, existing?.rif_criticita_id ?? '')));
  form.appendChild(field('Collegato a decisione', select('rif_decisione_id', decisioniOptions, existing?.rif_decisione_id ?? '')));
  form.appendChild(field('Collegato a requisito', select('rif_requisito_id', requisitiOptions, existing?.rif_requisito_id ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'aperto')));
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
      if (existing) await api.put(`/allert/${existing.id}`, data);
      else await api.post('/allert', data);
      closeModal();
      toast(existing ? 'Allert aggiornato.' : 'Allert registrato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica allert' : 'Nuovo allert', form);
}

export async function renderAllert(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();

  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    soloLettura
      ? 'Vista aggregata di gruppo: sola lettura. Seleziona una singola commessa dal menu a sinistra per modificare.'
      : 'Classificazione di perimetro e azioni di tutela — funzione di presidio GC, distinta dal coordinamento operativo dei registri precedenti.'));

  let lastRows = [];
  let perimetroMap = {};
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Registro Allert', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Allert',
          columns: ['Data', 'Descrizione', 'Perimetro', 'Classificazione', 'Stato'],
          rows: rows.map((r) => [formatDate(r.data), r.descrizione, perimetroMap[r.perimetro] || r.perimetro, CLASSIFICAZIONE[r.classificazione][0], STATO[r.stato][0]]),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('a', { class: 'btn btn--sm', href: `/api/export/allert/${state.commessaId}` }, 'Esporta Excel'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo allert'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, perimetroList, classificazioneList, statoList] = await Promise.all([
      api.get(`/allert?${queryScopeCommessa()}`),
      getCategoria('allert_perimetro'),
      getCategoria('allert_classificazione'),
      getCategoria('allert_stato'),
    ]);
    perimetroMap = toMap(perimetroList);
    const PERIMETRO = perimetroMap;
    CLASSIFICAZIONE = mergeLabels(CLASSIFICAZIONE_FIXED, classificazioneList);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;
    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
      { key: 'descrizione', label: 'Descrizione' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'perimetro', label: 'Perimetro', render: (r) => PERIMETRO[r.perimetro] || r.perimetro },
      { key: 'classificazione', label: 'Classificazione', render: (r) => pill(CLASSIFICAZIONE[r.classificazione][0], CLASSIFICAZIONE[r.classificazione][1]) },
      { key: 'collegata', label: 'Collegato a', render: (r) => r.criticita_tema || r.decisione_tema || (r.requisito_wbs ? `${r.requisito_wbs} — ${r.requisito_titolo}` : '—') },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('allert', row.id, row.descrizione) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo allert?')) return;
              await api.del(`/allert/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      rowClass: (r) => (r.classificazione === 'critico' && r.stato !== 'chiuso') ? 'row-scaduta' : '',
      emptyLabel: 'Nessun allert registrato per questa commessa.',
      onRowClick: soloLettura ? null : (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
