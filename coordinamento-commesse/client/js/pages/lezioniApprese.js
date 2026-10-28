// Lezioni Apprese — raccolte dalle altre sezioni (criticità, decisioni,
// allert) tramite collegamento opzionale, per non ripetere gli stessi
// errori sulla prossima commessa.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, formatDate, todayISO,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';

const CATEGORIA = {
  generale: 'Generale', progettazione: 'Progettazione', logistica: 'Logistica',
  sicurezza: 'Sicurezza', fornitori: 'Fornitori', coordinamento: 'Coordinamento',
};

async function openForm(existing, onSaved) {
  const [criticitaRes, decisioniRes, allertRes] = await Promise.all([
    api.get(`/criticita?commessa_id=${state.commessaId}`),
    api.get(`/decisioni?commessa_id=${state.commessaId}`),
    api.get(`/allert?commessa_id=${state.commessaId}`),
  ]);
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const criticitaOptions = [['', '— nessuna'], ...criticitaRes.data.map((c) => [c.id, c.tema])];
  const decisioniOptions = [['', '— nessuna'], ...decisioniRes.data.map((d) => [d.id, d.tema])];
  const allertOptions = [['', '— nessuno'], ...allertRes.data.map((a) => [a.id, a.descrizione])];

  const form = el('form', {});
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Data', dateInput('data', existing?.data || todayISO(), { required: true })));
  form.appendChild(field('Categoria', select('categoria', Object.entries(CATEGORIA).map(([k, v]) => [k, v]), existing?.categoria ?? 'generale')));
  form.appendChild(field('Cosa è successo', textarea('cosa_e_successo', existing?.cosa_e_successo ?? '')));
  form.appendChild(field('Cosa abbiamo imparato', textarea('cosa_abbiamo_imparato', existing?.cosa_abbiamo_imparato ?? '')));
  form.appendChild(field('Azione per il futuro', textarea('azione_futura', existing?.azione_futura ?? ''), 'Cosa faremo di diverso la prossima volta.'));
  form.appendChild(field('Collegata a criticità', select('rif_criticita_id', criticitaOptions, existing?.rif_criticita_id ?? '')));
  form.appendChild(field('Collegata a decisione', select('rif_decisione_id', decisioniOptions, existing?.rif_decisione_id ?? '')));
  form.appendChild(field('Collegata ad allert', select('rif_allert_id', allertOptions, existing?.rif_allert_id ?? '')));
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
      if (existing) await api.put(`/lezioni-apprese/${existing.id}`, data);
      else await api.post('/lezioni-apprese', data);
      closeModal();
      toast(existing ? 'Lezione aggiornata.' : 'Lezione registrata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica lezione appresa' : 'Nuova lezione appresa', form);
}

export async function renderLezioniApprese(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Raccoglie quanto imparato da criticità, decisioni e allert già registrati — per non ripetere gli stessi errori sulla prossima commessa.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova lezione'),
  ]);
  container.appendChild(toolbar);
  const listHost = el('div');
  container.appendChild(listHost);

  async function refresh() {
    const res = await api.get(`/lezioni-apprese?commessa_id=${state.commessaId}`);
    listHost.innerHTML = '';
    if (!res.data.length) {
      listHost.appendChild(el('p', { class: 'muted' }, 'Nessuna lezione appresa registrata.'));
      return;
    }
    res.data.forEach((l) => {
      const collegata = l.criticita_tema || l.decisione_tema || l.allert_descrizione;
      listHost.appendChild(el('div', { class: 'section' }, [
        el('div', { class: 'section__head' }, [
          el('div', {}, [
            el('h2', {}, l.titolo),
            el('div', { class: 'muted' }, `${formatDate(l.data)} · ${CATEGORIA[l.categoria] || l.categoria}${collegata ? ' · collegata a: ' + collegata : ''}`),
          ]),
          el('div', { style: 'display:flex;gap:6px' }, [
            el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('lezioni_apprese', l.id, l.titolo) }, 'Storico'),
            el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(l, refresh) }, 'Modifica'),
            el('button', {
              class: 'btn btn--sm btn--ghost btn--danger',
              onclick: async () => {
                if (!confirmDialog('Eliminare questa lezione?')) return;
                await api.del(`/lezioni-apprese/${l.id}`);
                toast('Eliminata.');
                refresh();
              },
            }, 'Elimina'),
          ]),
        ]),
        l.cosa_e_successo ? el('p', {}, [el('b', {}, 'Cosa è successo: '), l.cosa_e_successo]) : null,
        l.cosa_abbiamo_imparato ? el('p', {}, [el('b', {}, 'Cosa abbiamo imparato: '), l.cosa_abbiamo_imparato]) : null,
        l.azione_futura ? el('p', {}, [el('b', {}, 'Azione per il futuro: '), l.azione_futura]) : null,
      ]));
    });
  }

  await refresh();
}
