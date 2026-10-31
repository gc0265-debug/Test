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
  // In vista aggregata di gruppo la lezione può appartenere a una
  // commessa diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const [criticitaRes, decisioniRes, allertRes, wpRes] = await Promise.all([
    api.get(`/criticita?commessa_id=${commessaIdForm}`),
    api.get(`/decisioni?commessa_id=${commessaIdForm}`),
    api.get(`/allert?commessa_id=${commessaIdForm}`),
    api.get(`/commesse/${commessaIdForm}/wp`),
  ]);
  const wpOptions = [['', '—'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const criticitaOptions = [['', '— nessuna'], ...criticitaRes.data.map((c) => [c.id, c.tema])];
  const decisioniOptions = [['', '— nessuna'], ...decisioniRes.data.map((d) => [d.id, d.tema])];
  const allertOptions = [['', '— nessuno'], ...allertRes.data.map((a) => [a.id, a.descrizione])];

  const form = el('form', {});
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true }),
    'Riassunto breve della lezione, mostrato in elenco.'));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'A quale WP si riferisce, se pertinente a uno in particolare.'));
  form.appendChild(field('Data', dateInput('data', existing?.data || todayISO(), { required: true }),
    'Quando si è verificato l\'evento, non quando viene registrata la lezione.'));
  form.appendChild(field('Categoria', select('categoria', Object.entries(CATEGORIA).map(([k, v]) => [k, v]), existing?.categoria ?? 'generale'),
    'Area a cui appartiene la lezione, utile per ritrovarla su commesse future.'));
  form.appendChild(field('Cosa è successo', textarea('cosa_e_successo', existing?.cosa_e_successo ?? ''),
    'Il fatto, descritto in modo oggettivo.'));
  form.appendChild(field('Cosa abbiamo imparato', textarea('cosa_abbiamo_imparato', existing?.cosa_abbiamo_imparato ?? ''),
    'La causa di fondo individuata, non solo il sintomo.'));
  form.appendChild(field('Azione per il futuro', textarea('azione_futura', existing?.azione_futura ?? ''), 'Cosa faremo di diverso la prossima volta.'));
  form.appendChild(field('Collegata a criticità', select('rif_criticita_id', criticitaOptions, existing?.rif_criticita_id ?? ''),
    'Se la lezione nasce da una criticità già registrata.'));
  form.appendChild(field('Collegata a decisione', select('rif_decisione_id', decisioniOptions, existing?.rif_decisione_id ?? ''),
    'Se la lezione nasce da una decisione già registrata.'));
  form.appendChild(field('Collegata ad allert', select('rif_allert_id', allertOptions, existing?.rif_allert_id ?? ''),
    'Se la lezione nasce da un allert già registrato.'));
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

const TIPO_LABEL = { criticita: 'Criticità', decisione: 'Decisione', allert: 'Allert' };

async function openGeneratore(onSaved) {
  const [criticitaRes, decisioniRes, allertRes, lezioniRes, wpRes] = await Promise.all([
    api.get(`/criticita?commessa_id=${state.commessaId}`),
    api.get(`/decisioni?commessa_id=${state.commessaId}`),
    api.get(`/allert?commessa_id=${state.commessaId}`),
    api.get(`/lezioni-apprese?commessa_id=${state.commessaId}`),
    api.get(`/commesse/${state.commessaId}/wp`),
  ]);
  const wpMap = Object.fromEntries(wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`]));
  const linked = {
    criticita: new Set(lezioniRes.data.map((l) => l.rif_criticita_id).filter(Boolean)),
    decisione: new Set(lezioniRes.data.map((l) => l.rif_decisione_id).filter(Boolean)),
    allert: new Set(lezioniRes.data.map((l) => l.rif_allert_id).filter(Boolean)),
  };
  const troncaTitolo = (t) => (t && t.length > 90 ? `${t.slice(0, 87)}…` : t);

  const candidati = [
    ...criticitaRes.data.filter((c) => c.stato === 'chiusa' && !linked.criticita.has(c.id)).map((c) => ({
      tipo: 'criticita', origineId: c.id, titolo: troncaTitolo(c.tema),
      dettaglio: c.cosa_serve || c.impatto_programma || '', data: c.data_apertura, wp_id: c.wp_id,
    })),
    ...decisioniRes.data.filter((d) => d.stato === 'decisa' && !linked.decisione.has(d.id)).map((d) => ({
      tipo: 'decisione', origineId: d.id, titolo: troncaTitolo(d.tema),
      dettaglio: d.domanda_chiusa || d.impatto_se_non_decisa || '', data: d.data_prima_richiesta, wp_id: d.wp_id,
    })),
    ...allertRes.data.filter((a) => a.stato === 'chiuso' && !linked.allert.has(a.id)).map((a) => ({
      tipo: 'allert', origineId: a.id, titolo: troncaTitolo(a.descrizione),
      dettaglio: a.descrizione, data: a.data, wp_id: a.wp_id,
    })),
  ];

  if (!candidati.length) {
    openModal('Genera lezioni apprese dai registri', el('div', {}, [
      el('p', {}, 'Nessun elemento nuovo da proporre: le criticità chiuse, le decisioni prese e gli allert chiusi sono già tutti collegati a una lezione, oppure non ce ne sono ancora.'),
      el('div', { class: 'modal__actions' }, [el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Chiudi')]),
    ]));
    return;
  }

  const righe = new Map();
  const list = el('div', { class: 'checkbox-list', style: 'max-height:380px;overflow:auto' }, candidati.map((cand) => {
    const checkbox = el('input', { type: 'checkbox', checked: true });
    const catSelect = select(`cat_${cand.tipo}_${cand.origineId}`, Object.entries(CATEGORIA).map(([k, v]) => [k, v]), 'generale');
    catSelect.style.marginLeft = 'auto';
    righe.set(cand, { checkbox, catSelect });
    return el('label', { class: 'checkbox-list__item', style: 'align-items:flex-start;gap:10px' }, [
      checkbox,
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', {}, [
          el('b', {}, `${TIPO_LABEL[cand.tipo]}`),
          cand.wp_id && wpMap[cand.wp_id] ? el('span', { class: 'muted' }, ` · ${wpMap[cand.wp_id]}`) : null,
          ' — ', cand.titolo,
        ]),
        cand.dettaglio ? el('div', { class: 'muted', style: 'font-size:12px;margin-top:2px' }, cand.dettaglio) : null,
      ]),
      catSelect,
    ]);
  }));

  const body = el('div', {}, [
    el('p', { class: 'muted', style: 'margin:-4px 0 12px' },
      'Una bozza di lezione per ogni criticità chiusa, decisione presa e allert chiuso non ancora collegato a una lezione. Titolo e collegamento all\'origine sono precompilati; "Cosa abbiamo imparato" e "Azione per il futuro" restano da scrivere dopo, voce per voce, aprendo ciascuna lezione creata.'),
    list,
    el('div', { class: 'modal__actions' }, [
      el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
      el('button', { type: 'button', class: 'btn btn--primary', onclick: async (e) => {
        const selezionati = candidati.filter((c) => righe.get(c).checkbox.checked);
        if (!selezionati.length) { toast('Seleziona almeno un elemento.', { error: true }); return; }
        e.target.disabled = true;
        try {
          for (const c of selezionati) {
            const { catSelect } = righe.get(c);
            await api.post('/lezioni-apprese', {
              commessa_id: state.commessaId,
              wp_id: c.wp_id || null,
              data: c.data || todayISO(),
              titolo: c.titolo,
              cosa_e_successo: c.dettaglio || null,
              categoria: catSelect.value,
              rif_criticita_id: c.tipo === 'criticita' ? c.origineId : null,
              rif_decisione_id: c.tipo === 'decisione' ? c.origineId : null,
              rif_allert_id: c.tipo === 'allert' ? c.origineId : null,
            });
          }
          closeModal();
          toast(`${selezionati.length} ${selezionati.length === 1 ? 'lezione generata' : 'lezioni generate'} dai registri.`);
          onSaved();
        } catch (err) {
          toast(err.message, { error: true });
          e.target.disabled = false;
        }
      } }, 'Genera selezionate'),
    ]),
  ]);
  openModal('Genera lezioni apprese dai registri', body);
}

function openDettaglio(l, numero, onSaved, soloLettura) {
  const collegata = l.criticita_tema || l.decisione_tema || l.allert_descrizione;
  const azioni = [
    el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('lezioni_apprese', l.id, l.titolo) }, 'Storico'),
    el('button', { class: 'btn', onclick: () => { closeModal(); openForm(l, onSaved); } }, 'Modifica'),
  ];
  if (!soloLettura) {
    azioni.push(
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
      ? 'Vista aggregata di gruppo: clicca una riga per aprirla e modificarla. Per creare una nuova lezione, seleziona prima una singola commessa dal menu a sinistra.'
      : 'Raccoglie quanto imparato da criticità, decisioni e allert già registrati — per non ripetere gli stessi errori sulla prossima commessa.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      soloLettura ? null : el('button', { class: 'btn', onclick: () => openGeneratore(refresh) }, '+ Genera da registri'),
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
