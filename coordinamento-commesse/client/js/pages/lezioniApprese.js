// Lezioni Apprese — raccolte dalle altre sezioni (criticità, decisioni,
// allert) tramite collegamento opzionale, per non ripetere gli stessi
// errori sulla prossima commessa.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, formatDate, todayISO, settingsGear,
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

function openDettaglio(l, numero, onSaved, soloLettura) {
  const collegata = l.criticita_tema || l.decisione_tema || l.allert_descrizione;
  const azioni = [
    el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('lezioni_apprese', l.id, l.titolo) }, 'Storico'),
  ];
  if (!soloLettura) {
    azioni.push(
      el('button', { class: 'btn', onclick: () => { closeModal(); openForm(l, onSaved); } }, 'Modifica'),
      el('button', {
        class: 'btn btn--danger',
        onclick: async () => {
          if (!confirmDialog('Eliminare questa lezione?')) return;
          await api.del(`/lezioni-apprese/${l.id}`);
          toast('Eliminata.');
          closeModal();
          onSaved();
        },
      }, 'Elimina'),
    );
  }
  const body = el('div', {}, [
    el('div', { class: 'muted', style: 'margin-bottom:14px' },
      `${soloLettura && l.commessa_codice ? l.commessa_codice + ' · ' : ''}${formatDate(l.data)} · ${CATEGORIA[l.categoria] || l.categoria}${collegata ? ' · collegata a: ' + collegata : ''}`),
    l.cosa_e_successo ? el('p', {}, [el('b', {}, 'Cosa è successo: '), l.cosa_e_successo]) : null,
    l.cosa_abbiamo_imparato ? el('p', {}, [el('b', {}, 'Cosa abbiamo imparato: '), l.cosa_abbiamo_imparato]) : null,
    l.azione_futura ? el('p', {}, [el('b', {}, 'Azione per il futuro: '), l.azione_futura]) : null,
    l.note ? el('p', {}, [el('b', {}, 'Note: '), l.note]) : null,
    el('div', { class: 'modal__actions' }, azioni),
  ]);
  openModal(`Lezione ${numero} — ${l.titolo}`, body);
}

export async function renderLezioniApprese(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    soloLettura
      ? 'Vista aggregata di gruppo: sola lettura. Seleziona una singola commessa dal menu a sinistra per modificare.'
      : 'Raccoglie quanto imparato da criticità, decisioni e allert già registrati — per non ripetere gli stessi errori sulla prossima commessa.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova lezione'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const res = await api.get(`/lezioni-apprese?${queryScopeCommessa()}`);
    const rows = [...res.data].sort((a, b) => a.id - b.id).map((l, i) => ({ ...l, numero: i + 1 }));
    renderTable(tableHost, [
      { key: 'numero', label: 'N.', numeric: true },
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (l) => l.commessa_codice || '—' } : null,
      { key: 'data', label: 'Data', render: (l) => formatDate(l.data) },
      { key: 'titolo', label: 'Descrizione' },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (l) => el('div', {}, [
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
      },
    ].filter(Boolean), rows, {
      emptyLabel: 'Nessuna lezione appresa registrata.',
      onRowClick: (l) => openDettaglio(l, l.numero, refresh, soloLettura),
    });
  }

  await refresh();
}
