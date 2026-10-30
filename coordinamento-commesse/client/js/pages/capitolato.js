// Capitolato Requisiti — scrittura in stile tabella con codici WBS, a
// monte dei Requisiti di progetto. Ogni voce è legata (facoltativamente)
// a un contratto: la pagina raggruppa le voci per contratto, come fossero
// documenti con sottorighe, invece di un'unica tabella piatta. Cliccando
// una voce si apre come un documento: i suoi dati in testa, i Requisiti
// collegati come sottorighe visibili e modificabili senza uscire dalla
// vista — è il punto che raccoglie tutti i requisiti definiti dalla
// Direzione Lavori e li tiene agganciati ai registri di Coordinamento e
// Contratti tramite i Requisiti stessi.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import { el, field, textInput, dateInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, settingsGear } from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const REQ_STATO_FIXED = { bozza: ['Bozza', 'outline'], approvato: ['Approvato', 'verde'], 'in-revisione': ['In revisione', 'ambra'], superato: ['Superato', 'rosso'] };

async function openForm(existing, onSaved) {
  const contrattiRes = await api.get(`/contratti?commessa_id=${state.commessaId}`);
  const contrattoOptions = [['', '— nessuno'], ...contrattiRes.data.map((c) => [c.id, c.controparte || c.titolo])];

  const form = el('form', {});
  form.appendChild(field('Codice WBS', textInput('codice_wbs', existing?.codice_wbs ?? '', { required: true, placeholder: `es. ${state.commesse.find(c => c.id === state.commessaId)?.codice || '2514RW'}.WP1.03` })));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data', dateInput('data', existing?.data ?? '')),
    field('Contratto', select('contratto_id', contrattoOptions, existing?.contratto_id ?? '')),
  ]));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v === '' ? null : v; });
    data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/capitolato/${existing.id}`, data);
      else await api.post('/capitolato', data);
      closeModal();
      toast(existing ? 'Voce aggiornata.' : 'Voce creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica voce di capitolato' : 'Nuova voce di capitolato', form);
}

// Form rapido per un requisito collegato a una voce: usato dentro il
// "documento" della voce, non ha un modal proprio — al termine riapre
// sempre il documento della voce da cui si è partiti.
function openRequisitoQuickForm(voce, existing, refreshList) {
  const form = el('form', {});
  form.appendChild(field('Codice WBS', textInput('codice_wbs', existing?.codice_wbs ?? `${voce.codice_wbs}.R`, { required: true })));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(REQ_STATO_FIXED).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'bozza')));
  const actions = [
    el('button', { type: 'button', class: 'btn', onclick: () => openVoceDocument(voce, refreshList) }, 'Annulla'),
  ];
  if (existing) {
    actions.push(el('button', {
      type: 'button', class: 'btn btn--ghost btn--danger',
      onclick: async () => {
        if (!confirmDialog('Scollegare ed eliminare questo requisito?')) return;
        await api.del(`/requisiti/${existing.id}`);
        toast('Requisito eliminato.');
        refreshList();
        openVoceDocument(voce, refreshList);
      },
    }, 'Elimina'));
  }
  actions.push(el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'));
  form.appendChild(el('div', { class: 'modal__actions' }, actions));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
    data.rif_capitolato_voce_id = voce.id;
    try {
      if (existing) await api.put(`/requisiti/${existing.id}`, data);
      else await api.post('/requisiti', data);
      toast(existing ? 'Requisito aggiornato.' : 'Requisito creato e collegato.');
      refreshList();
      openVoceDocument(voce, refreshList);
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica requisito collegato' : 'Nuovo requisito collegato', form);
}

// La voce rappresentata come documento: dati di testa modificabili in
// linea, sotto l'elenco dei Requisiti collegati come sottorighe, ognuna
// cliccabile per aprirla e modificarla senza lasciare la vista.
async function openVoceDocument(voce, refreshList) {
  const [contrattiRes, requisitiRes, statoList] = await Promise.all([
    api.get(`/contratti?commessa_id=${state.commessaId}`),
    api.get(`/requisiti?commessa_id=${state.commessaId}`),
    getCategoria('requisiti_stato'),
  ]);
  const contrattoOptions = [['', '— nessuno'], ...contrattiRes.data.map((c) => [c.id, c.controparte || c.titolo])];
  const STATO_REQ = mergeLabels(REQ_STATO_FIXED, statoList);
  const collegati = requisitiRes.data.filter((r) => r.rif_capitolato_voce_id === voce.id);

  const body = el('div', {});

  const headerForm = el('form', {});
  headerForm.appendChild(field('Codice WBS', textInput('codice_wbs', voce.codice_wbs, { required: true })));
  headerForm.appendChild(field('Titolo', textInput('titolo', voce.titolo, { required: true })));
  headerForm.appendChild(el('div', { class: 'field--row' }, [
    field('Data', dateInput('data', voce.data ?? '')),
    field('Contratto', select('contratto_id', contrattoOptions, voce.contratto_id ?? '')),
  ]));
  headerForm.appendChild(field('Descrizione', textarea('descrizione', voce.descrizione ?? '')));
  headerForm.appendChild(field('Note', textarea('note', voce.note ?? '')));
  headerForm.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openStorico('capitolato_voci', voce.id, `${voce.codice_wbs} — ${voce.titolo}`) }, 'Storico'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Salva'),
  ]));
  headerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(headerForm).forEach((v, k) => { data[k] = v === '' ? null : v; });
    data.commessa_id = state.commessaId;
    try {
      await api.put(`/capitolato/${voce.id}`, data);
      toast('Voce aggiornata.');
      refreshList();
      openVoceDocument({ ...voce, ...data }, refreshList);
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  body.appendChild(headerForm);

  body.appendChild(el('div', { class: 'eyebrow', style: 'margin-top:22px' }, `Requisiti collegati (${collegati.length})`));
  if (!collegati.length) {
    body.appendChild(el('p', { class: 'muted', style: 'margin:4px 0' }, 'Nessun requisito collegato a questa voce.'));
  } else {
    body.appendChild(el('div', { style: 'border:1px solid var(--rule);margin:6px 0 4px' }, collegati.map((r) => el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;font-size:12.5px;border-bottom:1px solid var(--rule-2);cursor:pointer',
      onclick: () => openRequisitoQuickForm(voce, r, refreshList),
    }, [
      el('span', {}, `${r.codice_wbs} — ${r.titolo}`),
      pill(STATO_REQ[r.stato][0], STATO_REQ[r.stato][1]),
    ]))));
  }
  body.appendChild(el('button', {
    type: 'button', class: 'btn btn--sm', style: 'margin:8px 0 4px',
    onclick: () => openRequisitoQuickForm(voce, null, refreshList),
  }, '+ Nuovo requisito collegato'));

  openModal(`${voce.codice_wbs} — ${voce.titolo}`, body);
}

function voceColumns(refresh, soloLettura) {
  return [
    soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
    { key: 'codice_wbs', label: 'WBS' },
    { key: 'titolo', label: 'Titolo' },
    { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
    { key: 'n_requisiti', label: 'Requisiti', render: (r) => pill(String(r.n_requisiti), r.n_requisiti > 0 ? 'verde' : 'outline') },
    soloLettura ? null : {
      key: 'actions', label: '', className: 'actions',
      render: (row) => el('div', {}, [
        el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openVoceDocument(row, refresh) }, 'Apri'),
        el('button', {
          class: 'btn btn--sm btn--ghost btn--danger',
          onclick: async () => {
            if (!confirmDialog(row.n_requisiti > 0
              ? `Eliminare questa voce? ${row.n_requisiti} requisiti collegati perderanno il riferimento (restano come requisiti autonomi).`
              : 'Eliminare questa voce di capitolato?')) return;
            await api.del(`/capitolato/${row.id}`);
            toast('Eliminata.');
            refresh();
          },
        }, 'Elimina'),
      ]),
    },
  ].filter(Boolean);
}

export async function renderCapitolato(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    soloLettura
      ? 'Vista aggregata di gruppo: sola lettura. Seleziona una singola commessa dal menu a sinistra per aprire o modificare una voce.'
      : 'Il capitolato requisiti raccoglie tutti i requisiti definiti dalla Direzione Lavori, raggruppati per contratto: ogni voce è un documento che si apre per vedere e modificare i Requisiti collegati, restando agganciata ai registri di Coordinamento e Contratti.'));

  let lastRows = [];
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Capitolato Requisiti', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Voci di capitolato',
          columns: ['WBS', 'Titolo', 'Data', 'Contratto', 'Descrizione', 'Requisiti collegati'],
          rows: rows.map((r) => [r.codice_wbs, r.titolo, formatDate(r.data), r.contratto_controparte || r.contratto_titolo || '—', r.descrizione || '—', r.n_requisiti]),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova voce'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const groupsHost = el('div');
  container.appendChild(groupsHost);

  async function refresh() {
    const res = await api.get(`/capitolato?${queryScopeCommessa()}`);
    lastRows = res.data;
    groupsHost.innerHTML = '';

    if (!res.data.length) {
      groupsHost.appendChild(el('p', { class: 'muted' }, 'Nessuna voce di capitolato registrata per questa commessa.'));
      return;
    }

    const contratti = new Map();
    const senzaContratto = [];
    res.data.forEach((v) => {
      if (v.contratto_id) {
        if (!contratti.has(v.contratto_id)) contratti.set(v.contratto_id, { titolo: v.contratto_controparte || v.contratto_titolo, voci: [] });
        contratti.get(v.contratto_id).voci.push(v);
      } else {
        senzaContratto.push(v);
      }
    });

    contratti.forEach(({ titolo, voci }) => {
      const tableHost = el('div');
      groupsHost.appendChild(el('div', { class: 'section card card--compact' }, [
        el('div', { class: 'eyebrow' }, 'Contratto'),
        el('h2', { style: 'margin:0 0 10px' }, titolo),
        tableHost,
      ]));
      renderTable(tableHost, voceColumns(refresh, soloLettura), voci, {
        emptyLabel: 'Nessuna voce.',
        onRowClick: soloLettura ? null : (row) => openVoceDocument(row, refresh),
        selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
      });
    });

    if (senzaContratto.length) {
      const tableHost = el('div');
      groupsHost.appendChild(el('div', { class: 'section card card--compact' }, [
        el('h2', { style: 'margin:0 0 10px' }, 'Senza contratto collegato'),
        tableHost,
      ]));
      renderTable(tableHost, voceColumns(refresh, soloLettura), senzaContratto, {
        emptyLabel: 'Nessuna voce.',
        onRowClick: soloLettura ? null : (row) => openVoceDocument(row, refresh),
        selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
      });
    }
  }

  await refresh();
}
