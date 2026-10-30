// Maestranze — pagina custom (non più genericCrud): i fornitori collegati
// si scelgono con una selezione multipla dal Registro Stakeholder della
// commessa, invece di scriverli a mano in un campo di testo libero.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = { attivo: ['Attivo', 'verde'], 'non-attivo': ['Non attivo', 'outline'] };
let STATO = STATO_FIXED;

async function openForm(existing, onSaved) {
  // In vista aggregata di gruppo la maestranza può appartenere a una
  // commessa diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const [stakeholderRes, fornitoriAttuali, wpRes] = await Promise.all([
    api.get(`/stakeholder?commessa_id=${commessaIdForm}`),
    existing ? api.get(`/maestranze/${existing.id}/fornitori`).then((r) => r.data) : Promise.resolve([]),
    api.get(`/commesse/${commessaIdForm}/wp`),
  ]);
  const stakeholderAttivi = stakeholderRes.data.filter((s) => s.stato === 'attivo');
  const selezionati = new Set(fornitoriAttuali);

  const form = el('form', {});
  const wpOptions = [['', '—'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true })));
  form.appendChild(field('Ruolo', textInput('ruolo', existing?.ruolo ?? '')));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Telefono', textInput('telefono', existing?.telefono ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'attivo')));
  form.appendChild(field('Qualifiche', textarea('qualifiche', existing?.qualifiche ?? ''), 'Attestati, abilitazioni, scadenze note.'));

  form.appendChild(el('label', {}, 'Fornitori collegati'));
  if (!stakeholderAttivi.length) {
    form.appendChild(el('p', { class: 'muted', style: 'margin:4px 0 14px' },
      'Nessuno stakeholder registrato per questa commessa: aggiungine uno dal Registro Stakeholder per poterlo collegare qui.'));
  } else {
    const list = el('div', { class: 'checkbox-list' }, stakeholderAttivi.map((s) => {
      const checkbox = el('input', { type: 'checkbox', checked: selezionati.has(s.id) });
      checkbox.addEventListener('change', () => { if (checkbox.checked) selezionati.add(s.id); else selezionati.delete(s.id); });
      return el('label', { class: 'checkbox-list__item' }, [
        checkbox,
        el('span', {}, [s.nome, s.organizzazione ? el('span', { class: 'muted' }, ` — ${s.organizzazione}`) : null]),
      ]);
    }));
    form.appendChild(list);
    form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
      'Sostituisce il vecchio campo "Azienda": collega qui una o più imprese già registrate nel Registro Stakeholder.'));
  }

  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = state.commessaId;
    try {
      let id = existing?.id;
      if (existing) await api.put(`/maestranze/${existing.id}`, data);
      else { const row = await api.post('/maestranze', data); id = row.id; }
      await api.put(`/maestranze/${id}/fornitori`, { stakeholder_ids: [...selezionati] });
      closeModal();
      toast(existing ? 'Modifica salvata.' : 'Maestranza creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica maestranza' : 'Nuova maestranza', form);
}

export async function renderMaestranze(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  if (soloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare una nuova maestranza, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  let lastRows = [];
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Maestranze', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Maestranze',
          columns: ['Nome', 'Ruolo', 'Fornitori', 'WP', 'Telefono', 'Stato'],
          rows: rows.map((r) => [r.nome, r.ruolo || '—', r.fornitori_nomi || r.azienda || '—', r.wp_codice || '—', r.telefono || '—', STATO[r.stato][0]]),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, statoList] = await Promise.all([
      api.get(`/maestranze?${queryScopeCommessa()}`),
      getCategoria('maestranze_stato'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;
    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'nome', label: 'Nome' },
      { key: 'ruolo', label: 'Ruolo' },
      { key: 'fornitori', label: 'Fornitori', render: (r) => r.fornitori_nomi || r.azienda || '—' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare definitivamente questa maestranza?')) return;
              await api.del(`/maestranze/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessuna maestranza registrata per questa commessa.',
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
