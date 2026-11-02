// Piano Comunicazioni — un processo di gestione per riga (riunione,
// aggiornamento registro, approvazione...) con frequenza/canale/output
// e una matrice RACI verso gli stakeholder della commessa.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo, consumaFocusRiga } from '../state.js';
import { el, field, textInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, settingsGear, fasciaFissa } from '../components/ui.js';
import { printReport } from '../components/report.js';
import { getCategoria, toMap, toOptions } from '../components/categorie.js';

const RUOLI = [['', '—'], ['R', 'R — Responsible'], ['A', 'A — Accountable'], ['C', 'C — Consulted'], ['I', 'I — Informed']];

async function openForm(existing, onSaved) {
  const frequenzaOptions = toOptions(await getCategoria('comunicazione_frequenza'));

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(field('Nome processo', textInput('nome', existing?.nome ?? '', { required: true, placeholder: 'es. Riunione di coordinamento settimanale' }),
    'Il nome del processo comunicativo ricorrente.'));
  form.appendChild(field('Scopo', textarea('scopo', existing?.scopo ?? ''), 'Perché esiste questo processo, cosa deve garantire.'));
  form.appendChild(field('Frequenza', select('frequenza', frequenzaOptions, existing?.frequenza ?? 'settimanale'),
    'Con quale cadenza si ripete.'));
  form.appendChild(field('Canale', textInput('canale', existing?.canale ?? '', { placeholder: 'es. Riunione, email, PEC, piattaforma condivisa' }),
    'Lo strumento con cui avviene la comunicazione.'));
  form.appendChild(field('Output atteso', textInput('output', existing?.output ?? '', { placeholder: 'es. Verbale, Nota di Coordinamento, registro aggiornato' }),
    'Cosa produce questo processo, il documento o l\'azione risultante.'));
  form.appendChild(field('Ruolo responsabile', textInput('ruolo_responsabile', existing?.ruolo_responsabile ?? '', { placeholder: 'es. Direttore di Cantiere' }),
    'Chi presidia il processo — distinto dalla matrice RACI verso gli stakeholder, gestita separatamente.'));
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
    try {
      if (existing) await api.put(`/comunicazione/processi/${existing.id}`, data);
      else await api.post('/comunicazione/processi', data);
      closeModal();
      toast(existing ? 'Processo aggiornato.' : 'Processo creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica processo' : 'Nuovo processo', form);
}

async function openRaci(processo, stakeholderList, onSaved) {
  const assegnate = (await api.get(`/comunicazione/processi/${processo.id}/raci`)).data;
  const correnti = {};
  assegnate.forEach((a) => { correnti[a.stakeholder_id] = a.ruolo; });

  const form = el('form', {});
  if (!stakeholderList.length) {
    form.appendChild(el('p', { class: 'muted' }, 'Nessuno stakeholder registrato per questa commessa: aggiungine uno dal Registro Stakeholder prima di assegnare la matrice RACI.'));
  } else {
    const rows = stakeholderList.map((s) => {
      const row = el('div', { class: 'raci-row' }, [
        el('div', { class: 'raci-row__nome' }, [s.nome, el('span', { class: 'raci-row__ruolo' }, s.ruolo || '')]),
        select(`raci-${s.id}`, RUOLI, correnti[s.id] || ''),
      ]);
      return row;
    });
    rows.forEach((r) => form.appendChild(r));
  }
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary', disabled: !stakeholderList.length }, 'Salva matrice'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const assegnazioni = stakeholderList
      .map((s) => ({ stakeholder_id: s.id, ruolo: form.querySelector(`[name="raci-${s.id}"]`).value }))
      .filter((a) => a.ruolo);
    try {
      await api.put(`/comunicazione/processi/${processo.id}/raci`, { assegnazioni });
      closeModal();
      toast('Matrice RACI salvata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(`Matrice RACI — ${processo.nome}`, form);
}

export async function renderComunicazione(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  const sticky = fasciaFissa(container, []);
  sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    soloLettura
      ? 'Vista aggregata di gruppo: clicca una riga per modificarla. La matrice RACI e la creazione di nuovi processi richiedono una singola commessa.'
      : 'Un processo di gestione per riga, con la matrice RACI (Responsible/Accountable/Consulted/Informed) verso gli stakeholder registrati.'));

  let lastRows = [];
  let frequenzaMap = {};
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Piano Comunicazioni', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Processi di comunicazione',
          columns: ['Processo', 'Frequenza', 'Canale', 'Output atteso', 'Ruolo responsabile'],
          rows: rows.map((r) => [r.nome, frequenzaMap[r.frequenza] || r.frequenza, r.canale || '—', r.output || '—', r.ruolo_responsabile || '—']),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo processo'),
      settingsGear(),
    ]),
  ]);
  sticky.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [processiRes, stakeholderRes, frequenzaList] = await Promise.all([
      api.get(`/comunicazione/processi?${queryScopeCommessa()}`),
      soloLettura ? Promise.resolve({ data: [] }) : api.get(`/stakeholder?${queryScopeCommessa()}`),
      getCategoria('comunicazione_frequenza'),
    ]);
    frequenzaMap = toMap(frequenzaList);
    const FREQUENZA = frequenzaMap;
    lastRows = processiRes.data;
    const stakeholderAttivi = stakeholderRes.data.filter((s) => s.stato === 'attivo');

    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'nome', label: 'Processo' },
      { key: 'frequenza', label: 'Frequenza', render: (r) => FREQUENZA[r.frequenza] || r.frequenza },
      { key: 'canale', label: 'Canale' },
      { key: 'output', label: 'Output atteso' },
      { key: 'ruolo_responsabile', label: 'Ruolo responsabile' },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openRaci(row, stakeholderAttivi, refresh) }, 'Matrice RACI'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo processo?')) return;
              await api.del(`/comunicazione/processi/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), processiRes.data, {
      emptyLabel: 'Nessun processo di comunicazione registrato per questa commessa.',
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();

  const focusId = consumaFocusRiga('comunicazione');
  if (focusId) {
    const riga = lastRows.find((r) => String(r.id) === String(focusId));
    if (riga) openForm(riga, refresh);
  }
}
