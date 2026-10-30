// Registro Stakeholder — con matrice interesse/influenza (prassi di
// project management) usata anche come base per le assegnazioni RACI
// del Piano Comunicazioni.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import { el, field, textInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, pill, settingsGear } from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { getCategoria, toMap, toOptions, mergeLabels } from '../components/categorie.js';

const INTERESSE = ['basso', 'medio', 'alto'];
const INFLUENZA = ['bassa', 'media', 'alta'];
const STATO_FIXED = { attivo: ['Attivo', 'verde'], 'non-attivo': ['Non attivo', 'outline'] };
let STATO = STATO_FIXED;

async function openForm(existing, onSaved) {
  const categoriaOptions = toOptions(await getCategoria('stakeholder_categoria'));

  const form = el('form', {});
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true })));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Organizzazione', textInput('organizzazione', existing?.organizzazione ?? '')),
    field('Ruolo', textInput('ruolo', existing?.ruolo ?? '', { placeholder: 'es. Direttore Lavori' })),
  ]));
  form.appendChild(field('Categoria', select('categoria', categoriaOptions, existing?.categoria ?? 'interno')));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Interesse', select('interesse', INTERESSE.map((v) => [v, v[0].toUpperCase() + v.slice(1)]), existing?.interesse ?? 'medio')),
    field('Influenza', select('influenza', INFLUENZA.map((v) => [v, v[0].toUpperCase() + v.slice(1)]), existing?.influenza ?? 'media')),
  ]));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Email', textInput('email', existing?.email ?? '', { type: 'email' })),
    field('Telefono', textInput('telefono', existing?.telefono ?? '')),
  ]));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'attivo')));
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
      if (existing) await api.put(`/stakeholder/${existing.id}`, data);
      else await api.post('/stakeholder', data);
      closeModal();
      toast(existing ? 'Stakeholder aggiornato.' : 'Stakeholder registrato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica stakeholder' : 'Nuovo stakeholder', form);
}

function renderMatrice(rows) {
  const attivi = rows.filter((r) => r.stato === 'attivo');
  const cell = (interesse, influenza) => {
    const nomi = attivi.filter((r) => r.interesse === interesse && r.influenza === influenza);
    return el('div', { class: 'matrix__cell' }, nomi.length
      ? nomi.map((r) => el('div', { class: 'matrix__chip' }, r.nome))
      : el('div', { class: 'matrix__empty' }, '—'));
  };
  const grid = el('div', { class: 'matrix' });
  grid.appendChild(el('div', { class: 'matrix__corner' }));
  INTERESSE.forEach((i) => grid.appendChild(el('div', { class: 'matrix__colhead' }, i[0].toUpperCase() + i.slice(1))));
  [...INFLUENZA].reverse().forEach((inf) => {
    grid.appendChild(el('div', { class: 'matrix__rowhead' }, inf[0].toUpperCase() + inf.slice(1)));
    INTERESSE.forEach((int) => grid.appendChild(cell(int, inf)));
  });
  return el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Matrice interesse / influenza'),
    el('div', { class: 'matrix__axis matrix__axis--x' }, 'Interesse →'),
    el('div', { class: 'matrix__wrap' }, [
      el('div', { class: 'matrix__axis matrix__axis--y' }, '↑ Influenza'),
      grid,
    ]),
  ]);
}

export async function renderStakeholder(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  if (soloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: sola lettura. Seleziona una singola commessa dal menu a sinistra per modificare.'));
  }

  const matrixHost = el('div');
  container.appendChild(matrixHost);

  let lastRows = [];
  let categoriaMap = {};
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Registro Stakeholder', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Stakeholder',
          columns: ['Nome', 'Ruolo', 'Categoria', 'Interesse', 'Influenza', 'Stato'],
          rows: rows.map((r) => [r.nome, [r.ruolo, r.organizzazione].filter(Boolean).join(' · ') || '—', categoriaMap[r.categoria] || r.categoria, r.interesse, r.influenza, STATO[r.stato][0]]),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo stakeholder'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, categoriaList, statoList] = await Promise.all([
      api.get(`/stakeholder?${queryScopeCommessa()}`),
      getCategoria('stakeholder_categoria'),
      getCategoria('stakeholder_stato'),
    ]);
    categoriaMap = toMap(categoriaList);
    const CATEGORIA = categoriaMap;
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;
    matrixHost.innerHTML = '';
    matrixHost.appendChild(renderMatrice(res.data));

    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'nome', label: 'Nome' },
      { key: 'ruolo', label: 'Ruolo / organizzazione', render: (r) => [r.ruolo, r.organizzazione].filter(Boolean).join(' · ') || '—' },
      { key: 'categoria', label: 'Categoria', render: (r) => CATEGORIA[r.categoria] || r.categoria },
      { key: 'interesse', label: 'Interesse', render: (r) => pill(r.interesse, r.interesse === 'alto' ? 'rosso' : (r.interesse === 'medio' ? 'ambra' : 'outline')) },
      { key: 'influenza', label: 'Influenza', render: (r) => pill(r.influenza, r.influenza === 'alta' ? 'rosso' : (r.influenza === 'media' ? 'ambra' : 'outline')) },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('stakeholder', row.id, row.nome) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(`Eliminare ${row.nome}? Verrà rimosso anche dalla matrice RACI.`)) return;
              await api.del(`/stakeholder/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessuno stakeholder registrato per questa commessa.',
      onRowClick: soloLettura ? null : (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
