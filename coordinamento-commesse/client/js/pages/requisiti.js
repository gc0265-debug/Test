// Requisiti — estratti da un capitolato, con codice WBS e fase di
// esecuzione. Ogni modifica a titolo/descrizione crea una nuova
// versione (pulsante "Versioni"); "Richiedi approvazione" crea una
// decisione collegata nel Registro Decisioni, come richiesto: le
// approvazioni confluiscono lì, non in un registro separato.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, formatDateTime,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, toMap, toOptions } from '../components/categorie.js';

const STATO = { bozza: ['Bozza', 'outline'], approvato: ['Approvato', 'verde'], 'in-revisione': ['In revisione', 'ambra'], superato: ['Superato', 'rosso'] };

async function openForm(existing, onSaved) {
  const [capitolatoRes, faseList] = await Promise.all([
    api.get(`/capitolato?commessa_id=${state.commessaId}`),
    getCategoria('requisiti_fase'),
  ]);
  const capitolatoOptions = [['', '— nessuna'], ...capitolatoRes.data.map((c) => [c.id, `${c.codice_wbs} — ${c.titolo}`])];
  const faseOptions = toOptions(faseList);

  const form = el('form', {});
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Codice WBS', textInput('codice_wbs', existing?.codice_wbs ?? '', { required: true, placeholder: `es. ${state.commesse.find(c => c.id === state.commessaId)?.codice || '2514RW'}.WP1.03` })),
    field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')),
  ]));
  form.appendChild(field('Fase di esecuzione', select('fase', faseOptions, existing?.fase ?? 'progettazione')));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? ''), 'Una modifica qui (o al titolo) crea automaticamente una nuova versione.'));
  if (existing) {
    form.appendChild(field('Motivo della modifica', textInput('motivo_modifica', ''), 'Registrato solo se titolo o descrizione cambiano in questo salvataggio.'));
  }
  form.appendChild(field('Voce di capitolato', select('rif_capitolato_voce_id', capitolatoOptions, existing?.rif_capitolato_voce_id ?? ''), 'Collegamento strutturato alla tabella Capitolato, se già scritta.'));
  form.appendChild(field('Fonte nel capitolato (testo libero)', textInput('fonte_capitolato', existing?.fonte_capitolato ?? '', { placeholder: 'es. par. 4.2, pag. 18, rev. 3' })));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'bozza')));
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
      if (existing) await api.put(`/requisiti/${existing.id}`, data);
      else await api.post('/requisiti', data);
      closeModal();
      toast(existing ? 'Requisito aggiornato.' : 'Requisito registrato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica requisito' : 'Nuovo requisito', form);
}

async function openVersioni(requisito) {
  const res = await api.get(`/requisiti/${requisito.id}/versioni`);
  const body = el('div', { class: 'storico-list' }, res.data.map((v) => el('div', { class: 'storico-item' }, [
    el('div', { class: 'storico-item__head' }, [
      el('span', { class: 'storico-item__azione' }, `Versione ${v.numero_versione}`),
      el('span', { class: 'storico-item__data' }, formatDateTime(v.created_at)),
    ]),
    el('div', { class: 'storico-item__dettaglio' }, [el('b', {}, v.titolo)]),
    v.descrizione ? el('div', { class: 'storico-item__dettaglio' }, v.descrizione) : null,
    v.motivo_modifica ? el('div', { class: 'storico-item__dettaglio' }, [el('i', {}, `Motivo: ${v.motivo_modifica}`)]) : null,
    el('div', { class: 'storico-item__utente' }, `— ${v.autore || 'utente non registrato'}`),
  ])));
  openModal(`Versioni — ${requisito.codice_wbs}`, body);
}

async function richiediApprovazione(requisito, onDone) {
  try {
    await api.post('/decisioni', {
      commessa_id: state.commessaId,
      wp_id: requisito.wp_id,
      tema: requisito.titolo,
      domanda_chiusa: `Si approva il requisito ${requisito.codice_wbs} — ${requisito.titolo}? (SÌ/NO)`,
      a_chi: 'DL',
      rif_requisito_id: requisito.id,
    });
    toast('Richiesta di approvazione creata nel Registro Decisioni.');
    onDone();
  } catch (err) {
    toast(err.message, { error: true });
  }
}

export async function renderRequisiti(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Estratti dal capitolato, con codice WBS e fase di esecuzione. Le approvazioni si richiedono da qui ma confluiscono nel Registro Decisioni.'));

  let filtroFase = '';
  let lastRows = [];
  let faseMap = {};
  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => printReport('Requisiti', state.commesse.find(c => c.id === state.commessaId), [{
        heading: 'Elenco requisiti',
        columns: ['WBS', 'Titolo', 'Fase', 'Versione', 'Stato'],
        rows: lastRows.map((r) => [r.codice_wbs, r.titolo, faseMap[r.fase] || r.fase, `v${r.versione_corrente}`, STATO[r.stato][0]]),
      }]) }, 'Stampa'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo requisito'),
    ]),
  ]);
  container.appendChild(toolbar);

  function drawFilters() {
    const host = toolbar.firstChild;
    host.innerHTML = '';
    [['', 'Tutte le fasi'], ...Object.entries(faseMap)].forEach(([value, label]) => {
      host.appendChild(el('button', {
        class: 'btn btn--sm' + (filtroFase === value ? ' btn--primary' : ''),
        onclick: () => { filtroFase = value; refresh(); },
      }, label));
    });
  }

  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const query = new URLSearchParams({ commessa_id: state.commessaId });
    if (filtroFase) query.set('fase', filtroFase);
    const [res, faseList] = await Promise.all([
      api.get(`/requisiti?${query.toString()}`),
      getCategoria('requisiti_fase'),
    ]);
    faseMap = toMap(faseList);
    const FASE = faseMap;
    drawFilters();
    lastRows = res.data;
    renderTable(tableHost, [
      { key: 'codice_wbs', label: 'WBS' },
      {
        key: 'titolo', label: 'Titolo',
        render: (r) => el('div', {}, [r.titolo, r.capitolato_wbs ? el('div', { class: 'muted', style: 'font-size:10.5px' }, `da capitolato ${r.capitolato_wbs}`) : null]),
      },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'fase', label: 'Fase', render: (r) => FASE[r.fase] || r.fase },
      { key: 'versione', label: 'Versione', render: (r) => pill(`v${r.versione_corrente}`, r.versione_corrente > 1 ? 'ambra' : 'outline') },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openVersioni(row) }, 'Versioni'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => richiediApprovazione(row, refresh) }, 'Richiedi approvazione'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('requisiti', row.id, row.codice_wbs) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo requisito e tutto il suo storico versioni?')) return;
              await api.del(`/requisiti/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessun requisito registrato per questa commessa.' });
  }

  await refresh();
}
