// Approvazioni Drawings — elenco elaborati sottoposti a DL/GC per
// approvazione, compilabile a mano o importando un elenco deliverable da
// Excel. Ogni riga può agganciarsi a un Requisito del Capitolato
// Requisiti, restando così collegata agli altri registri di
// Coordinamento e Contratti.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, settingsGear, fasciaFissa,
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

const EMISSIONE_OPTIONS = [
  ['IFA', 'IFA — emesso per approvazione (non valido per fabbricazione)'],
  ['IFC', 'IFC — emesso per costruzione/produzione'],
];
function emissionePill(r) {
  return pill(r.emissione || 'IFA', r.emissione === 'IFC' ? 'verde' : 'outline');
}
function cutoffPill(r) {
  if (!r.data_limite_approvazione) return pill('—', 'outline');
  if (r.oltre_cutoff) return pill(`${formatDate(r.data_limite_approvazione)} · +${r.giorni_ritardo_cutoff}gg`, 'rosso');
  return pill(formatDate(r.data_limite_approvazione), r.data_approvazione ? 'verde' : 'outline');
}

// Response Matrix: un commento ricevuto su una revisione (da ID, MEP,
// GC...) con la risposta data e lo stato — formato pensato per obbligare
// chi commenta a leggere le risposte punto per punto, invece di
// perderle fra email e PDF sparsi. change_order segnala un commento che
// tocca lo scope concordato (quote, essenze, ferramenta, impiantistica),
// congelato in attesa di una variante economica invece di essere
// recepito in silenzio nel disegno.
function commentoId(index) {
  return `C-${String(index + 1).padStart(2, '0')}`;
}

async function openCommentoQuickForm(elaborato, existing, refreshList) {
  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(field('Autore', textInput('autore', existing?.autore ?? '', { placeholder: 'es. Interior Designer, MEP Eng., GC' }),
    'Chi ha fatto il commento — serve a dimostrare la provenienza, non è un elenco controllato.'));
  form.appendChild(field('Richiesta ricevuta', textarea('richiesta', existing?.richiesta ?? '', { required: true }),
    'Il commento così come arrivato, per iscritto o riportato fedelmente — è la base del confronto punto per punto.'));
  form.appendChild(field('Azione intrapresa', textarea('azione', existing?.azione ?? ''),
    'Cosa è stato modificato in risposta, o perché non è stato eseguito.'));
  form.appendChild(field('Stato', select('stato', [['aperto', 'Aperto'], ['chiuso', 'Chiuso']], existing?.stato ?? 'aperto'),
    'Chiudi il commento solo una volta recepita (o rifiutata con motivazione) l\'azione richiesta.'));
  form.appendChild(el('label', { style: 'display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin:-4px 0 14px;cursor:pointer' }, [
    el('input', { type: 'checkbox', name: 'change_order', value: '1', checked: !!existing?.change_order, style: 'margin-top:2px' }),
    el('span', {}, [
      'Qualificato come Change Order (modifica di progetto)',
      el('div', { class: 'field__hint', style: 'margin-top:2px' },
        'Spunta se il commento tocca quote, essenze, ferramenta o impiantistica concordate: il dettaglio resta congelato finché non arriva una variante economica approvata, invece di essere recepito tacitamente nella revisione.'),
    ]),
  ]));
  form.appendChild(field('Note contrattuali / impatto', textarea('note', existing?.note ?? ''),
    'Es. riferimento a una variante (CO-012), impatto su tempi o fornitura — quello che serve per dimostrare la richiesta in sede di SAL o riunione.'));

  const azioni = [
    el('button', { type: 'button', class: 'btn', onclick: () => openMatriceDocument(elaborato, refreshList) }, 'Annulla'),
  ];
  if (existing) {
    azioni.push(el('button', {
      type: 'button', class: 'btn btn--ghost btn--danger',
      onclick: async () => {
        if (!confirmDialog('Eliminare questo commento?')) return;
        await api.del(`/drawing-commenti/${existing.id}`);
        toast('Commento eliminato.');
        openMatriceDocument(elaborato, refreshList);
      },
    }, 'Elimina'));
  }
  azioni.push(el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Aggiungi'));
  form.appendChild(el('div', { class: 'modal__actions' }, azioni));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.change_order = data.change_order === '1';
    data.elaborato_id = elaborato.id;
    try {
      if (existing) await api.put(`/drawing-commenti/${existing.id}`, data);
      else await api.post('/drawing-commenti', data);
      toast(existing ? 'Commento aggiornato.' : 'Commento aggiunto.');
      openMatriceDocument(elaborato, refreshList);
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica commento' : 'Nuovo commento', form);
}

async function openMatriceDocument(elaborato, refreshList) {
  const res = await api.get(`/drawing-commenti?elaborato_id=${elaborato.id}`);
  const commenti = res.data;
  const soloLetturaMatrice = state.currentUser?.ruolo === 'cliente' || inVistaGruppo();

  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', style: 'margin-top:0' },
    `${elaborato.codice}${elaborato.revisione ? ` · ${elaborato.revisione}` : ''} — ${elaborato.titolo}`));

  if (!commenti.length) {
    body.appendChild(el('p', { class: 'muted', style: 'margin:4px 0' }, 'Nessun commento registrato su questo elaborato.'));
  } else {
    body.appendChild(el('div', { style: 'border:1px solid var(--rule);margin:6px 0 4px' }, commenti.map((c, i) => el('div', {
      style: 'padding:9px 10px;font-size:12.5px;border-bottom:1px solid var(--rule-2);' + (soloLetturaMatrice ? '' : 'cursor:pointer'),
      onclick: soloLetturaMatrice ? null : () => openCommentoQuickForm(elaborato, c, refreshList),
    }, [
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' }, [
        el('div', {}, [
          el('b', {}, commentoId(i)), ' · ', el('span', { class: 'muted' }, c.autore || 'Autore non indicato'),
        ]),
        el('div', { style: 'display:flex;gap:6px' }, [
          c.change_order ? pill('Change Order', 'rosso') : null,
          pill(c.stato === 'chiuso' ? 'Chiuso' : 'Aperto', c.stato === 'chiuso' ? 'verde' : 'ambra'),
        ]),
      ]),
      el('div', { style: 'margin-top:4px' }, c.richiesta),
      c.azione ? el('div', { class: 'muted', style: 'margin-top:4px' }, `↳ ${c.azione}`) : null,
      c.note ? el('div', { class: 'muted', style: 'margin-top:4px;font-size:11px' }, c.note) : null,
    ]))));
  }
  if (!soloLetturaMatrice) {
    body.appendChild(el('button', {
      type: 'button', class: 'btn btn--sm', style: 'margin:8px 0 4px',
      onclick: () => openCommentoQuickForm(elaborato, null, refreshList),
    }, '+ Nuovo commento'));
  }

  openModal(`Response Matrix — ${elaborato.codice}`, body);
}

async function openForm(existing, onSaved) {
  // In vista aggregata di gruppo l'elaborato può appartenere a una
  // commessa diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const [requisitiRes, wpRes] = await Promise.all([
    api.get(`/requisiti?commessa_id=${commessaIdForm}`),
    api.get(`/commesse/${commessaIdForm}/wp`),
  ]);
  const requisitoOptions = [['', '— nessuno'], ...requisitiRes.data.map((r) => [r.id, `${r.codice_wbs} — ${r.titolo}`])];
  const wpOptions = [['', 'Tutti i WP'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Codice', textInput('codice', existing?.codice ?? '', { required: true, placeholder: 'es. AD-WP2-014' }),
      'Identificativo univoco dell\'elaborato, lo stesso usato nel cartiglio del disegno.'),
    field('Revisione', textInput('revisione', existing?.revisione ?? '', { placeholder: 'es. Rev. 02' }),
      'Testo libero: aggiornala manualmente ad ogni nuova emissione.'),
  ]));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true }),
    'Il nome dell\'elaborato, es. "Bancone reception — pianta e sezioni".'));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'A quale WP appartiene l\'elaborato.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data invio', dateInput('data_invio', existing?.data_invio ?? ''), 'Quando è stato trasmesso a DL/GC per l\'approvazione.'),
    field('Data approvazione', dateInput('data_approvazione', existing?.data_approvazione ?? ''), 'Quando è arrivato il visto formale, qualunque sia l\'esito.'),
  ]));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'in-attesa'),
    'Approvato con riserve richiede comunque una nuova revisione per recepire le riserve.'));
  form.appendChild(field('Emissione', select('emissione', EMISSIONE_OPTIONS, existing?.emissione ?? 'IFA'),
    'Resta IFA — non valido per fabbricazione/taglio — finché non arriva il visto formale: solo allora si passa manualmente a IFC.'));
  form.appendChild(field('Data limite approvazione (cut-off)', dateInput('data_limite_approvazione', existing?.data_limite_approvazione ?? ''),
    'Entro questa data deve arrivare l\'approvazione formale per rispettare la consegna in cantiere: oltre, i tempi di fabbricazione slittano automaticamente giorno per giorno.'));
  form.appendChild(field('Requisito collegato', select('rif_requisito_id', requisitoOptions, existing?.rif_requisito_id ?? ''),
    'Collega questo elaborato a un requisito del Capitolato Requisiti, se pertinente.'));
  form.appendChild(field('Note', textarea('note', existing?.note ?? ''),
    'Annotazioni libere, visibili solo qui — per i commenti ricevuti sulla revisione usa la Response Matrix.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = state.commessaId;
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
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const clienteSoloLettura = state.currentUser?.ruolo === 'cliente';
  const soloLettura = clienteSoloLettura || inVistaGruppo();
  const sticky = fasciaFissa(container, []);
  sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    inVistaGruppo() && !clienteSoloLettura
      ? 'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare un nuovo elaborato o importare da Excel, seleziona prima una singola commessa dal menu a sinistra.'
      : 'Elenco degli elaborati (drawing) sottoposti ad approvazione, compilabile a mano o importando un elenco deliverable in Excel.'));

  let lastRows = [];
  let selectedId = null;
  let filtroWp = '';

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

  const wpPillHost = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
  const toolbar = el('div', { class: 'section__head' }, [
    el('div', {}, [wpPillHost]),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: async () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        const sections = [{
          heading: 'Elaborati',
          columns: ['Codice', 'Titolo', 'Rev.', 'WP', 'Emissione', 'Invio', 'Approvazione', 'Cut-off', 'Stato', 'Requisito'],
          rows: rows.map((r) => [
            r.codice, r.titolo, r.revisione || '—', r.wp_codice || '—', r.emissione || 'IFA',
            formatDate(r.data_invio), formatDate(r.data_approvazione),
            r.data_limite_approvazione ? `${formatDate(r.data_limite_approvazione)}${r.oltre_cutoff ? ` (+${r.giorni_ritardo_cutoff}gg ritardo)` : ''}` : '—',
            STATO[r.stato][0], r.requisito_wbs || '—',
          ]),
        }];
        // Con un solo elaborato selezionato, la stampa include anche la
        // sua Response Matrix: è il documento da portare in riunione per
        // mostrare i ritardi altrui punto per punto.
        if (selectedId && rows.length === 1) {
          const commentiRes = await api.get(`/drawing-commenti?elaborato_id=${rows[0].id}`);
          sections.push({
            heading: 'Response Matrix',
            columns: ['ID', 'Autore', 'Richiesta', 'Azione intrapresa', 'Stato', 'Change Order', 'Note'],
            rows: commentiRes.data.map((c, i) => [
              commentoId(i), c.autore || '—', c.richiesta, c.azione || '—',
              c.stato === 'chiuso' ? 'Chiuso' : 'Aperto', c.change_order ? 'Sì' : 'No', c.note || '—',
            ]),
          });
        }
        printReport('Approvazioni Drawings', inVistaGruppo() ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), sections);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--sm', onclick: () => fileInput.click() }, 'Importa da Excel'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo elaborato'),
      settingsGear(),
    ]),
  ]);
  sticky.appendChild(toolbar);
  sticky.appendChild(fileInput);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    let query = queryScopeCommessa();
    if (filtroWp) query += `&wp_id=${encodeURIComponent(filtroWp)}`;
    const [res, statoList] = await Promise.all([
      api.get(`/approvazioni-drawings?${query}`),
      getCategoria('approvazioni_stato'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;

    wpPillHost.innerHTML = '';
    if (!soloLettura) wpPillHost.appendChild(el('button', {
      class: 'btn btn--sm' + (filtroWp === '' ? ' btn--primary' : ''),
      onclick: () => { filtroWp = ''; refresh(); },
    }, 'Tutti i WP'));
    if (!soloLettura) state.workPackages.forEach((w) => wpPillHost.appendChild(el('button', {
      class: 'btn btn--sm' + (String(filtroWp) === String(w.id) ? ' btn--primary' : ''),
      onclick: () => { filtroWp = w.id; refresh(); },
    }, w.codice)));
    renderTable(tableHost, [
      inVistaGruppo() ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'codice', label: 'Codice' },
      { key: 'titolo', label: 'Titolo' },
      { key: 'revisione', label: 'Rev.', render: (r) => r.revisione || '—' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'emissione', label: 'Emissione', render: emissionePill },
      { key: 'data_invio', label: 'Data invio', render: (r) => formatDate(r.data_invio) },
      { key: 'data_approvazione', label: 'Data approvazione', render: (r) => formatDate(r.data_approvazione) },
      { key: 'cutoff', label: 'Cut-off', render: cutoffPill },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'requisito', label: 'Requisito collegato', render: (r) => r.requisito_wbs || '—' },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openMatriceDocument(row, refresh) }, 'Matrice'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('approvazioni_drawings', row.id, `${row.codice} — ${row.titolo}`) }, 'Storico'),
          clienteSoloLettura ? null : el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
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
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessun elaborato registrato. Aggiungilo a mano o importa un elenco da Excel.',
      onRowClick: clienteSoloLettura ? null : (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
