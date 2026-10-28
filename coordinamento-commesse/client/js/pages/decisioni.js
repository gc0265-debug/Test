// Registro Decisioni — modellato su Registro_Decisioni_DL_2514RW: domande
// chiuse (SI/NO) rivolte a DL/SAC/GC, con anzianità in giorni e il
// cruscotto (richieste totali, decise, tasso di resa, oltre 21gg,
// anzianità media, % confermate per iscritto) che quel file calcolava
// a mano.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO,
} from '../components/ui.js';

const STATO = { richiesta: ['Richiesta', 'outline'], parziale: ['Parziale', 'ambra'], decisa: ['Decisa', 'verde'] };

function openForm(existing, onSaved) {
  const form = el('form', {});
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  form.appendChild(field('Tema', textInput('tema', existing?.tema ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Domanda chiusa (SI/NO)', textarea('domanda_chiusa', existing?.domanda_chiusa ?? ''), 'Formulata come domanda a risposta SÌ/NO, mai aperta.'));
  form.appendChild(field('A chi', textInput('a_chi', existing?.a_chi ?? '', { placeholder: 'es. DL, SAC, GC' })));
  form.appendChild(field('Prima richiesta il', dateInput('data_prima_richiesta', existing?.data_prima_richiesta || todayISO(), { required: true })));
  form.appendChild(field('Impatto se non decisa', textarea('impatto_se_non_decisa', existing?.impatto_se_non_decisa ?? '')));
  form.appendChild(field('Esito ultima riunione', textarea('esito_ultima_riunione', existing?.esito_ultima_riunione ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'richiesta')));
  form.appendChild(field('Decisa il', dateInput('data_decisione', existing?.data_decisione || '')));
  form.appendChild(field('Confermata per iscritto', select('conferma_scritta', [[0, 'No'], [1, 'Sì']], existing?.conferma_scritta ? 1 : 0)));
  form.appendChild(field('Riferimento conferma', textInput('rif_conferma', existing?.rif_conferma ?? '', { placeholder: 'es. mail del 12/10, verbale riunione' })));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
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
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  const dashHost = el('div', { class: 'tiles' });
  container.appendChild(dashHost);

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova decisione'),
  ]);
  container.appendChild(toolbar);

  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [dash, list] = await Promise.all([
      api.get(`/dashboard/${state.commessaId}`),
      api.get(`/decisioni?commessa_id=${state.commessaId}`),
    ]);
    const d = dash.decisioni;
    dashHost.innerHTML = '';
    dashHost.appendChild(tile('Richieste totali', d.richieste_totali));
    dashHost.appendChild(tile('Decise', d.decise));
    dashHost.appendChild(tile('Tasso di resa', `${d.tasso_resa_pct}%`));
    dashHost.appendChild(tile('Pendenze aperte', d.pendenze_aperte));
    dashHost.appendChild(tile('Oltre 21 giorni', d.oltre_21gg, d.oltre_21gg > 0 ? 'alert' : ''));
    dashHost.appendChild(tile('Anzianità media aperte', `${d.anzianita_media_gg} gg`, d.anzianita_media_gg > 21 ? 'warn' : ''));
    dashHost.appendChild(tile('Confermate per iscritto', `${d.confermate_iscritto_pct}%`));

    renderTable(tableHost, [
      { key: 'tema', label: 'Tema' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'a_chi', label: 'A chi' },
      { key: 'data_prima_richiesta', label: 'Prima richiesta', render: (r) => formatDate(r.data_prima_richiesta) },
      {
        key: 'anzianita', label: 'Anzianità',
        render: (r) => pill(`${r.anzianita_giorni} gg${r.n_riproposte ? ` · ${r.n_riproposte}×` : ''}`, r.oltre_21gg ? 'rosso' : (r.stato === 'decisa' ? 'verde' : 'outline')),
      },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'conferma_scritta', label: 'Per iscritto', render: (r) => r.conferma_scritta ? pill('Sì', 'verde') : pill('No', 'outline') },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          row.stato !== 'decisa' ? el('button', {
            class: 'btn btn--sm btn--ghost',
            onclick: async () => { await api.post(`/decisioni/${row.id}/rilancia`); toast('Sollecito registrato.'); refresh(); },
          }, 'Rilancia') : null,
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
      },
    ], list.data, { emptyLabel: 'Nessuna decisione registrata per questa commessa.' });
  }

  await refresh();
}
