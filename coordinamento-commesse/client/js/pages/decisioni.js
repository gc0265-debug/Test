// Registro Decisioni — modellato su Registro_Decisioni_DL_2514RW: domande
// chiuse (SI/NO) rivolte a DL/SAC/GC, con anzianità in giorni e il
// cruscotto (richieste totali, decise, tasso di resa, oltre 21gg,
// anzianità media, % confermate per iscritto) che quel file calcolava
// a mano.

import { api } from '../api.js';
import { state, scopeParams, queryScopeCommessa, inVistaGruppo, consumaFocusRiga } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = { richiesta: ['Richiesta', 'outline'], parziale: ['Parziale', 'ambra'], decisa: ['Decisa', 'verde'] };
let STATO = STATO_FIXED;
const AZIONE_LABEL = { creata: 'Creata', modificata: 'Modificata', chiusa: 'Chiusa', riaperta: 'Riaperta', eliminata: 'Eliminata', rilancio: 'Rilanciata' };

async function openForm(existing, onSaved) {
  // In vista aggregata di gruppo la decisione può appartenere a una
  // commessa diversa da quella (eventuale) selezionata in sidebar: i menu
  // a tendina di questo form devono sempre riferirsi alla commessa della
  // riga che si sta modificando, non a state.commessaId.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const [requisitiRes, wpRes] = await Promise.all([
    api.get(`/requisiti?commessa_id=${commessaIdForm}`),
    api.get(`/commesse/${commessaIdForm}/wp`),
  ]);
  const requisitiOptions = [['', '— nessuno'], ...requisitiRes.data.map((r) => [r.id, `${r.codice_wbs} — ${r.titolo}`])];

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  const wpOptions = [['', 'Tutti i WP'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  form.appendChild(field('Tema', textInput('tema', existing?.tema ?? '', { required: true }),
    'Titolo breve della decisione da prendere.'));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'A quale WP si riferisce la decisione.'));
  form.appendChild(field('Domanda chiusa (SI/NO)', textarea('domanda_chiusa', existing?.domanda_chiusa ?? ''), 'Formulata come domanda a risposta SÌ/NO, mai aperta.'));
  form.appendChild(field('A chi', textInput('a_chi', existing?.a_chi ?? '', { placeholder: 'es. DL, SAC, GC' }),
    'Chi deve dare la risposta.'));
  form.appendChild(field('Approvazione del requisito', select('rif_requisito_id', requisitiOptions, existing?.rif_requisito_id ?? ''),
    'Collega questa decisione a un requisito del Capitolato, se la domanda nasce da un\'approvazione richiesta lì.'));
  form.appendChild(field('Prima richiesta il', dateInput('data_prima_richiesta', existing?.data_prima_richiesta || todayISO(), { required: true }),
    'Data della prima richiesta: da qui si calcola l\'anzianità in giorni mostrata in tabella.'));
  form.appendChild(field('Impatto se non decisa', textarea('impatto_se_non_decisa', existing?.impatto_se_non_decisa ?? ''),
    'Cosa succede al programma o alla produzione se la risposta tarda ad arrivare.'));
  form.appendChild(field('Esito ultima riunione', textarea('esito_ultima_riunione', existing?.esito_ultima_riunione ?? ''),
    'L\'ultimo aggiornamento verbale o informale ricevuto, anche se non ancora una decisione formale.'));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'richiesta'),
    'Parziale = risposta arrivata ma incompleta o condizionata; Decisa = risposta definitiva ricevuta.'));
  form.appendChild(field('Decisa il', dateInput('data_decisione', existing?.data_decisione || ''),
    'Data in cui è arrivata la risposta definitiva — lasciare vuoto finché lo stato non è "Decisa".'));
  form.appendChild(field('Confermata per iscritto', select('conferma_scritta', [[0, 'No'], [1, 'Sì']], existing?.conferma_scritta ? 1 : 0),
    'Se la decisione verbale è stata anche confermata per iscritto (mail, verbale): conta per il tasso di conferma mostrato nel cruscotto.'));
  form.appendChild(field('Riferimento conferma', textInput('rif_conferma', existing?.rif_conferma ?? '', { placeholder: 'es. mail del 12/10, verbale riunione' }),
    'Dove si trova la conferma scritta, per ritrovarla in caso di contestazione.'));
  form.appendChild(field('Note', textarea('note', existing?.note ?? ''),
    'Annotazioni libere, visibili solo qui.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = state.commessaId;
    data.conferma_scritta = data.conferma_scritta === '1';
    try {
      if (existing) await api.put(`/decisioni/${existing.id}`, data);
      else await api.post('/decisioni', data);
      closeModal();
      toast(existing ? 'Decisione aggiornata.' : 'Decisione registrata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica decisione' : 'Nuova decisione', form);
}

function tile(label, value, cls) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile__label' }, label),
    el('div', { class: 'tile__value' + (cls ? ' ' + cls : '') }, String(value)),
  ]);
}

export async function renderDecisioni(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  if (soloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare una nuova decisione o importare da Excel, seleziona prima una singola commessa dal menu a sinistra. Il cruscotto numerico sopra la tabella richiede anch\'esso una singola commessa.'));
  }

  const dashHost = el('div', { class: 'tiles' });
  if (!soloLettura) container.appendChild(dashHost);

  let lastRows = [];
  let selectedId = null;
  let raggruppaWp = false;
  const filtri = { wp: '', stato: '', urgenti: '' };
  const wpList = soloLettura ? [] : (await api.get(`/commesse/${state.commessaId}/wp`)).data;

  const fileInput = el('input', { type: 'file', accept: '.xlsx,.xls', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.postForm('/decisioni/import', fd);
      toast(`Importate ${res.imported} decisioni${res.skipped ? ` (${res.skipped} righe saltate: commessa non trovata o campi mancanti)` : ''}.`);
      await refresh();
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      fileInput.value = '';
    }
  });

  const wpFilterOptions = [['', 'Tutti i WP'], ...wpList.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const statoFilterOptions = [['', 'Tutti gli stati'], ['pendenti', 'Pendenti (richiesta/parziale)'], ['decisa', 'Decise']];
  const urgentiFilterOptions = [['', 'Tutte'], ['1', 'Solo urgenti (oltre 21gg)']];

  const filterRow = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' }, [
    soloLettura ? null : select('filtro_wp', wpFilterOptions, '', { class: 'filter-select', onchange: (e) => { filtri.wp = e.target.value; refresh(); } }),
    select('filtro_stato', statoFilterOptions, '', { class: 'filter-select', onchange: (e) => { filtri.stato = e.target.value; refresh(); } }),
    select('filtro_urgenti', urgentiFilterOptions, '', { class: 'filter-select', onchange: (e) => { filtri.urgenti = e.target.value; refresh(); } }),
    soloLettura ? null : el('label', { class: 'filter-group', style: 'cursor:pointer' }, [
      el('input', {
        type: 'checkbox',
        onchange: (e) => { raggruppaWp = e.target.checked; refresh(); },
      }),
      'Raggruppa per WP',
    ]),
  ]);

  const toolbar = el('div', { class: 'section__head' }, [
    filterRow,
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => stampaDecisioni() }, 'Stampa'),
      soloLettura ? null : el('a', { class: 'btn btn--sm', href: `/api/export/decisioni/${state.commessaId}` }, 'Esporta Excel'),
      soloLettura ? null : el('button', { class: 'btn btn--sm', onclick: () => fileInput.click() }, 'Importa da Excel'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova decisione'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  container.appendChild(fileInput);

  const tableHost = el('div');
  container.appendChild(tableHost);

  async function stampaDecisioni() {
    const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
    const storici = await Promise.all(rows.map((r) => api.get(`/audit?entity_type=decisioni&entity_id=${r.id}`).then((res) => res.data)));
    const righe = [];
    rows.forEach((r, i) => {
      righe.push([`<b>${r.tema}</b>`, r.a_chi || '—', formatDate(r.data_prima_richiesta), `${r.anzianita_giorni} gg`, STATO[r.stato][0], r.conferma_scritta ? 'Sì' : 'No']);
      storici[i].forEach((h) => {
        const quando = new Date(h.created_at * 1000).toLocaleDateString('it-IT');
        righe.push([`<span style="padding-left:22px;color:#666;font-size:11px">↳ ${AZIONE_LABEL[h.azione] || h.azione}${h.dettaglio ? ' — ' + h.dettaglio : ''} · ${quando} · ${h.utente || 'utente non registrato'}</span>`, '', '', '', '', '']);
      });
    });
    printReport('Registro Decisioni', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
      heading: 'Decisioni',
      columns: ['Tema', 'A chi', 'Prima richiesta', 'Anzianità', 'Stato', 'Per iscritto'],
      rows: righe,
    }]);
  }

  async function refresh() {
    const [dash, list, statoList] = await Promise.all([
      soloLettura ? Promise.resolve(null) : api.get(`/dashboard/${state.commessaId}`),
      api.get(`/decisioni?${queryScopeCommessa()}`),
      getCategoria('decisioni_stato'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = list.data;
    if (dash) {
      const d = dash.decisioni;
      dashHost.innerHTML = '';
      dashHost.appendChild(tile('Richieste totali', d.richieste_totali));
      dashHost.appendChild(tile('Decise', d.decise));
      dashHost.appendChild(tile('Tasso di resa', `${d.tasso_resa_pct}%`));
      dashHost.appendChild(tile('Pendenze aperte', d.pendenze_aperte));
      dashHost.appendChild(tile('Oltre 21 giorni', d.oltre_21gg, d.oltre_21gg > 0 ? 'alert' : ''));
      dashHost.appendChild(tile('Anzianità media aperte', `${d.anzianita_media_gg} gg`, d.anzianita_media_gg > 21 ? 'warn' : ''));
      dashHost.appendChild(tile('Confermate per iscritto', `${d.confermate_iscritto_pct}%`));
    }

    const filtered = lastRows.filter((r) => {
      if (filtri.wp && String(r.wp_id) !== String(filtri.wp)) return false;
      if (filtri.stato === 'pendenti' && r.stato === 'decisa') return false;
      if (filtri.stato === 'decisa' && r.stato !== 'decisa') return false;
      if (filtri.urgenti && !r.oltre_21gg) return false;
      return true;
    });

    const columns = (includeWp) => [
      ...(soloLettura ? [{ key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' }] : []),
      {
        key: 'tema', label: 'Tema',
        render: (r) => el('div', {}, [r.tema, r.requisito_wbs ? el('div', { class: 'muted', style: 'font-size:10.5px' }, `approvazione requisito ${r.requisito_wbs}`) : null]),
      },
      ...(includeWp ? [{ key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' }] : []),
      { key: 'a_chi', label: 'A chi' },
      { key: 'data_prima_richiesta', label: 'Prima richiesta', render: (r) => formatDate(r.data_prima_richiesta) },
      {
        key: 'anzianita', label: 'Anzianità',
        render: (r) => pill(`${r.anzianita_giorni} gg${r.n_riproposte ? ` · ${r.n_riproposte}×` : ''}`, r.oltre_21gg ? 'rosso' : (r.stato === 'decisa' ? 'verde' : 'outline')),
      },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'conferma_scritta', label: 'Per iscritto', render: (r) => r.conferma_scritta ? pill('Sì', 'verde') : pill('No', 'outline') },
      ...(soloLettura ? [] : [{
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          row.stato !== 'decisa' ? el('button', {
            class: 'btn btn--sm btn--ghost',
            onclick: async () => { await api.post(`/decisioni/${row.id}/rilancia`); toast('Sollecito registrato.'); refresh(); },
          }, 'Rilancia') : null,
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('decisioni', row.id, row.tema) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questa decisione?')) return;
              await api.del(`/decisioni/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      }]),
    ];

    const tableOpts = {
      emptyLabel: 'Nessuna decisione registrata per questa commessa.',
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    };

    tableHost.innerHTML = '';
    if (!raggruppaWp || soloLettura) {
      const flatHost = el('div');
      tableHost.appendChild(flatHost);
      renderTable(flatHost, columns(true), filtered, tableOpts);
    } else {
      const gruppi = new Map();
      const senzaWp = [];
      filtered.forEach((r) => {
        if (r.wp_id) {
          if (!gruppi.has(r.wp_id)) gruppi.set(r.wp_id, { titolo: r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : r.wp_nome, righe: [] });
          gruppi.get(r.wp_id).righe.push(r);
        } else {
          senzaWp.push(r);
        }
      });
      if (!filtered.length) {
        tableHost.appendChild(el('p', { class: 'muted' }, 'Nessuna decisione corrispondente ai filtri.'));
      }
      gruppi.forEach(({ titolo, righe }) => {
        const groupTableHost = el('div');
        tableHost.appendChild(el('div', { class: 'section card card--compact' }, [
          el('div', { class: 'eyebrow' }, 'Work package'),
          el('h2', { style: 'margin:0 0 10px' }, titolo),
          groupTableHost,
        ]));
        renderTable(groupTableHost, columns(false), righe, tableOpts);
      });
      if (senzaWp.length) {
        const groupTableHost = el('div');
        tableHost.appendChild(el('div', { class: 'section card card--compact' }, [
          el('h2', { style: 'margin:0 0 10px' }, 'Senza WP'),
          groupTableHost,
        ]));
        renderTable(groupTableHost, columns(false), senzaWp, tableOpts);
      }
    }
  }

  await refresh();

  const focusId = consumaFocusRiga('decisioni');
  if (focusId) {
    const riga = lastRows.find((r) => String(r.id) === String(focusId));
    if (riga) openForm(riga, refresh);
  }
}
