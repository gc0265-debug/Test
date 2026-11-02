// Registro Stakeholder — con matrice interesse/influenza (prassi di
// project management) usata anche come base per le assegnazioni RACI
// del Piano Comunicazioni.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo, consumaFocusRiga } from '../state.js';
import { el, field, textInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, pill, settingsGear, fasciaFissa } from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';
import { creaImportCsv } from '../components/importCsv.js';
import { getCategoria, toMap, toOptions, mergeLabels } from '../components/categorie.js';

const INTERESSE = ['basso', 'medio', 'alto'];
const INFLUENZA = ['bassa', 'media', 'alta'];
const STATO_FIXED = { attivo: ['Attivo', 'verde'], 'non-attivo': ['Non attivo', 'outline'] };
let STATO = STATO_FIXED;

async function openForm(existing, onSaved) {
  const categoriaOptions = toOptions(await getCategoria('stakeholder_categoria'));

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true }),
    'Il nome con cui lo stakeholder compare nei menu di Lavorazioni, Maestranze e Contratti.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Organizzazione', textInput('organizzazione', existing?.organizzazione ?? ''), 'L\'azienda o ente di appartenenza.'),
    field('Ruolo', textInput('ruolo', existing?.ruolo ?? '', { placeholder: 'es. Direttore Lavori' }), 'La funzione ricoperta nella commessa.'),
  ]));
  form.appendChild(field('Categoria', select('categoria', categoriaOptions, existing?.categoria ?? 'interno'),
    'Classificazione libera, personalizzabile da Impostazioni.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Interesse', select('interesse', INTERESSE.map((v) => [v, v[0].toUpperCase() + v.slice(1)]), existing?.interesse ?? 'medio'),
      'Quanto è coinvolto dall\'esito della commessa: posiziona lo stakeholder nella matrice qui sotto.'),
    field('Influenza', select('influenza', INFLUENZA.map((v) => [v, v[0].toUpperCase() + v.slice(1)]), existing?.influenza ?? 'media'),
      'Quanto può condizionare l\'esito della commessa: posiziona lo stakeholder nella matrice qui sotto.'),
  ]));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Email', textInput('email', existing?.email ?? '', { type: 'email' }), 'Recapito di contatto.'),
    field('Telefono', textInput('telefono', existing?.telefono ?? ''), 'Recapito di contatto.'),
  ]));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'attivo'),
    'Solo gli stakeholder attivi compaiono nella matrice e nei menu a tendina delle altre schede.'));
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
  const sticky = fasciaFissa(container, []);
  if (soloLettura) {
    sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare un nuovo stakeholder, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  const matrixHost = el('div');
  sticky.appendChild(matrixHost);

  let lastRows = [];
  let categoriaMap = {};
  let selectedId = null;
  const importCsv = creaImportCsv({
    endpoint: '/stakeholder/import',
    colonne: ['Nome', 'Organizzazione', 'Ruolo', 'Categoria', 'Interesse', 'Influenza', 'Email', 'Telefono', 'Stato', 'Note'],
    esempioRiga: ['Mario Rossi', 'Rossi Allestimenti Srl', 'Referente commerciale', 'interno', 'alto', 'media', 'mario.rossi@esempio.it', '333 1234567', 'attivo', ''],
    nomeFile: 'modello-stakeholder.csv',
    onImported: refresh,
  });
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
      soloLettura ? null : importCsv.bottoneModello,
      soloLettura ? null : importCsv.bottoneImporta,
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo stakeholder'),
      settingsGear(),
    ]),
  ]);
  sticky.appendChild(toolbar);
  sticky.appendChild(importCsv.fileInput);
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
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();

  const focusId = consumaFocusRiga('stakeholder');
  if (focusId) {
    const riga = lastRows.find((r) => String(r.id) === String(focusId));
    if (riga) openForm(riga, refresh);
  }
}
