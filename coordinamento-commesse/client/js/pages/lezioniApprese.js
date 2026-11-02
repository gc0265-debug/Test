// Lezioni Apprese — raccolte dalle altre sezioni (criticità, decisioni,
// allert) tramite collegamento opzionale, per non ripetere gli stessi
// errori sulla prossima commessa.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, formatDate, todayISO, settingsGear, fasciaFissa,
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
  const wpOptions = [['', 'Tutti i WP'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const criticitaOptions = [['', '— nessuna'], ...criticitaRes.data.map((c) => [c.id, c.tema])];
  const decisioniOptions = [['', '— nessuna'], ...decisioniRes.data.map((d) => [d.id, d.tema])];
  const allertOptions = [['', '— nessuno'], ...allertRes.data.map((a) => [a.id, a.descrizione])];

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
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
      id: `criticita:${c.id}`, tipo: 'criticita', origineId: c.id, titolo: troncaTitolo(c.tema),
      data: c.data_apertura, wp_id: c.wp_id,
      dati: { cosa_serve: c.cosa_serve, impatto_programma: c.impatto_programma, destinatario: c.destinatario, urgenza: c.urgenza },
    })),
    ...decisioniRes.data.filter((d) => d.stato === 'decisa' && !linked.decisione.has(d.id)).map((d) => ({
      id: `decisione:${d.id}`, tipo: 'decisione', origineId: d.id, titolo: troncaTitolo(d.tema),
      data: d.data_prima_richiesta, wp_id: d.wp_id,
      dati: { domanda_chiusa: d.domanda_chiusa, a_chi: d.a_chi, impatto_se_non_decisa: d.impatto_se_non_decisa, n_riproposte: d.n_riproposte },
    })),
    ...allertRes.data.filter((a) => a.stato === 'chiuso' && !linked.allert.has(a.id)).map((a) => ({
      id: `allert:${a.id}`, tipo: 'allert', origineId: a.id, titolo: troncaTitolo(a.descrizione),
      data: a.data, wp_id: a.wp_id,
      dati: { descrizione: a.descrizione, perimetro: a.perimetro, classificazione: a.classificazione, azione_tutela: a.azione_tutela },
    })),
  ];

  if (!candidati.length) {
    openModal('Genera lezioni apprese dai registri', el('div', {}, [
      el('p', {}, 'Nessun elemento nuovo da proporre: le criticità chiuse, le decisioni prese e gli allert chiusi sono già tutti collegati a una lezione, oppure non ce ne sono ancora.'),
      el('div', { class: 'modal__actions' }, [el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Chiudi')]),
    ]));
    return;
  }

  // Mostra subito uno stato di attesa: la generazione ragionata dall'IA
  // su più elementi può richiedere qualche secondo.
  const attesa = el('div', {}, [
    el('p', {}, `Generazione in corso: l'IA sta ragionando su ${candidati.length} elementi chiusi per proporre cosa è successo, cosa abbiamo imparato e un'azione per il futuro. Qualche secondo...`),
  ]);
  const closeAttesa = openModal('Genera lezioni apprese dai registri', attesa);

  let risultatiAI = {};
  let erroreAI = null;
  try {
    const res = await api.post('/lezioni-apprese/genera-ai', {
      candidati: candidati.map((c) => ({ id: c.id, tipo: c.tipo, titolo: c.titolo, wp: c.wp_id ? wpMap[c.wp_id] : null, dati: c.dati })),
    });
    risultatiAI = Object.fromEntries(res.risultati.map((r) => [r.id, r]));
  } catch (err) {
    erroreAI = err.message;
  }

  const righe = new Map();
  const cards = candidati.map((cand) => {
    const ai = risultatiAI[cand.id];
    const checkbox = el('input', { type: 'checkbox', checked: true });
    const titoloInput = textInput(`titolo_${cand.id}`, cand.titolo, {});
    const catSelect = select(`cat_${cand.id}`, Object.entries(CATEGORIA).map(([k, v]) => [k, v]), 'generale');
    const successoTa = textarea(`successo_${cand.id}`, ai?.cosa_e_successo ?? '', { rows: 2 });
    const imparatoTa = textarea(`imparato_${cand.id}`, ai?.cosa_abbiamo_imparato ?? '', { rows: 2 });
    const azioneTa = textarea(`azione_${cand.id}`, ai?.azione_futura ?? '', { rows: 2 });
    righe.set(cand, { checkbox, titoloInput, catSelect, successoTa, imparatoTa, azioneTa });

    return el('div', { class: 'card card--compact', style: 'margin-bottom:12px' }, [
      el('label', { style: 'display:flex;align-items:flex-start;gap:10px;cursor:pointer' }, [
        checkbox,
        el('div', { style: 'flex:1;min-width:0' }, [
          el('div', { class: 'eyebrow' }, [
            TIPO_LABEL[cand.tipo],
            cand.wp_id && wpMap[cand.wp_id] ? ` · ${wpMap[cand.wp_id]}` : '',
          ]),
          field('Titolo', titoloInput, null),
          field('Categoria', catSelect, null),
          field('Cosa è successo', successoTa, erroreAI ? 'Generazione IA non disponibile: scrivila qui a mano.' : 'Generato dall\'IA a partire dai dati del registro — rivedi e correggi se serve.'),
          field('Cosa abbiamo imparato', imparatoTa, erroreAI ? 'Generazione IA non disponibile: scrivila qui a mano.' : 'Generato dall\'IA: la causa di fondo individuata, non solo il sintomo.'),
          field('Azione per il futuro', azioneTa, erroreAI ? 'Generazione IA non disponibile: scrivila qui a mano.' : 'Generato dall\'IA: cosa faremo di diverso la prossima volta.'),
        ]),
      ]),
    ]);
  });

  const body = el('div', {}, [
    erroreAI ? el('div', { class: 'banner banner--warn', style: 'margin-bottom:12px' },
      `Generazione ragionata dall'IA non disponibile (${erroreAI}). Titolo e collegamento restano precompilati dai registri; completa gli altri campi a mano prima di generare.`)
      : el('p', { class: 'muted', style: 'margin:-4px 0 12px' },
        'Una proposta di lezione per ogni criticità chiusa, decisione presa e allert chiuso non ancora collegato a una lezione, ragionata dall\'IA a partire dai dati del registro. Rivedi e correggi ogni testo prima di generare: resta una bozza, non un verbale.'),
    el('div', { style: 'max-height:460px;overflow:auto' }, cards),
    el('div', { class: 'modal__actions' }, [
      el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
      el('button', { type: 'button', class: 'btn btn--primary', onclick: async (e) => {
        const selezionati = candidati.filter((c) => righe.get(c).checkbox.checked);
        if (!selezionati.length) { toast('Seleziona almeno un elemento.', { error: true }); return; }
        e.target.disabled = true;
        try {
          for (const c of selezionati) {
            const r = righe.get(c);
            await api.post('/lezioni-apprese', {
              commessa_id: state.commessaId,
              wp_id: c.wp_id || null,
              data: c.data || todayISO(),
              titolo: r.titoloInput.value || c.titolo,
              cosa_e_successo: r.successoTa.value || null,
              cosa_abbiamo_imparato: r.imparatoTa.value || null,
              azione_futura: r.azioneTa.value || null,
              categoria: r.catSelect.value,
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
  closeAttesa();
  openModal('Genera lezioni apprese dai registri', body);
}

// Documento di stampa narrativo (non tabellare): una voce numerata per
// lezione, raggruppata per commessa quando il filtro ne include più di
// una — pensato per essere portato o distribuito come memoria storica
// prima di avviare una nuova commessa, non solo come elenco interno.
function stampaLezioniDocumento(righe, { commessaLabel, wpLabel: wpLabelSel } = {}) {
  const win = window.open('', '_blank');
  if (!win) return;

  const perCommessa = new Map();
  righe.forEach((l) => {
    const key = l.commessa_id || 0;
    if (!perCommessa.has(key)) {
      perCommessa.set(key, { label: l.commessa_codice ? `${l.commessa_codice} — ${l.commessa_nome || ''}`.trim() : 'Senza commessa', righe: [] });
    }
    perCommessa.get(key).righe.push(l);
  });
  const multiCommessa = perCommessa.size > 1;

  let numero = 0;
  const blocco = (l) => {
    numero += 1;
    const collegata = l.criticita_tema || l.decisione_tema || l.allert_descrizione;
    return `<li>
      <b>${numero}. ${l.titolo}</b>
      <div class="meta">${formatDate(l.data)} · ${CATEGORIA[l.categoria] || l.categoria}${l.wp_codice ? ` · ${l.wp_codice}${l.wp_nome ? ' ' + l.wp_nome : ''}` : ''}${collegata ? ` · collegata a: ${collegata}` : ''}</div>
      ${l.cosa_e_successo ? `<p><span class="k">Cosa è successo</span>${l.cosa_e_successo}</p>` : ''}
      ${l.cosa_abbiamo_imparato ? `<p><span class="k">Cosa abbiamo imparato</span>${l.cosa_abbiamo_imparato}</p>` : ''}
      ${l.azione_futura ? `<p><span class="k">Azione per il futuro</span>${l.azione_futura}</p>` : ''}
      ${l.note ? `<p><span class="k">Note</span>${l.note}</p>` : ''}
    </li>`;
  };

  let corpo;
  if (!righe.length) {
    corpo = '<p class="empty">Nessuna lezione appresa corrisponde ai filtri scelti.</p>';
  } else if (multiCommessa) {
    corpo = [...perCommessa.values()].map(({ label, righe: righeCommessa }) =>
      `<h2>${label}</h2><ol>${righeCommessa.map(blocco).join('')}</ol>`).join('');
  } else {
    corpo = `<ol>${righe.map(blocco).join('')}</ol>`;
  }

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lezioni Apprese</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1A1A1A;}
      h1{font-size:18px;margin:0 0 4px;}
      .sub{color:#666;font-size:12px;margin-bottom:6px;}
      .filtri{color:#666;font-size:11.5px;margin-bottom:24px;}
      h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#4D4D4D;margin:26px 0 10px;border-bottom:1px solid #ddd;padding-bottom:4px;}
      ol{list-style:none;padding:0;margin:0;}
      li{padding:12px 0;border-bottom:1px solid #eee;}
      li b{font-size:13px;}
      li .meta{font-size:10.5px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin:3px 0 8px;}
      li p{margin:4px 0;font-size:12px;line-height:1.5;}
      li .k{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#C0332B;font-weight:700;}
      .empty{color:#999;}
      @media print{ body{padding:0;} }
    </style></head><body>
    <h1>Lezioni Apprese</h1>
    <div class="sub">${new Date().toLocaleDateString('it-IT')} · ${righe.length} ${righe.length === 1 ? 'lezione' : 'lezioni'}</div>
    <div class="filtri">Filtri: ${commessaLabel || 'tutte le commesse'} · ${wpLabelSel || 'tutti i WP'}</div>
    ${corpo}
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

async function apriFiltriStampa() {
  const tutte = (await api.get('/lezioni-apprese')).data;
  if (!tutte.length) {
    openModal('Stampa Lezioni Apprese', el('div', {}, [
      el('p', {}, 'Non ci sono ancora lezioni apprese registrate su nessuna commessa.'),
      el('div', { class: 'modal__actions' }, [el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Chiudi')]),
    ]));
    return;
  }

  const commesseConLezioni = new Map();
  tutte.forEach((l) => { if (l.commessa_id && !commesseConLezioni.has(l.commessa_id)) commesseConLezioni.set(l.commessa_id, l.commessa_codice); });
  const commessaOptions = [['', 'Tutte le commesse'], ...[...commesseConLezioni.keys()].map((id) => {
    const c = state.commesse.find((x) => x.id === id);
    return [id, c ? `${c.codice} — ${c.nome}` : commesseConLezioni.get(id)];
  })];

  const wpCodici = new Map();
  tutte.forEach((l) => { if (l.wp_codice && !wpCodici.has(l.wp_codice)) wpCodici.set(l.wp_codice, l.wp_nome); });
  const wpOptions = [['', 'Tutti i WP'], ...[...wpCodici.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([codice, nome]) => [codice, `${codice} ${nome || ''}`.trim()])];

  const commessaSelect = select('filtro_commessa', commessaOptions, state.commessaId && !state.gruppoAttivo ? state.commessaId : '');
  const wpSelect = select('filtro_wp', wpOptions, '');

  const form = el('form', {});
  form.appendChild(field('Commessa', commessaSelect,
    'Lascia su "Tutte le commesse" per un documento che raccoglie l\'esperienza di più commesse — utile da rileggere prima di avviarne una nuova.'));
  form.appendChild(field('Work package', wpSelect,
    'Filtra per la sigla del Work Package (es. WP1), coerente tra le commesse.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Genera stampa'),
  ]));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const commessaId = commessaSelect.value;
    const wpCodice = wpSelect.value;
    const filtrate = tutte.filter((l) => {
      if (commessaId && String(l.commessa_id) !== String(commessaId)) return false;
      if (wpCodice && l.wp_codice !== wpCodice) return false;
      return true;
    }).sort((a, b) => (a.commessa_codice || '').localeCompare(b.commessa_codice || '') || (a.data || '').localeCompare(b.data || ''));
    closeModal();
    const commessaLabel = commessaId ? commessaOptions.find(([v]) => String(v) === String(commessaId))?.[1] : null;
    const wpLabelSel = wpCodice ? wpOptions.find(([v]) => v === wpCodice)?.[1] : null;
    stampaLezioniDocumento(filtrate, { commessaLabel, wpLabel: wpLabelSel });
  });

  openModal('Stampa Lezioni Apprese', form);
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
  const sticky = fasciaFissa(container, []);
  sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    soloLettura
      ? 'Vista aggregata di gruppo: clicca una riga per aprirla e modificarla. Per creare una nuova lezione, seleziona prima una singola commessa dal menu a sinistra.'
      : 'Raccoglie quanto imparato da criticità, decisioni e allert già registrati — per non ripetere gli stessi errori sulla prossima commessa.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => apriFiltriStampa() }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn', onclick: () => openGeneratore(refresh) }, '+ Genera da registri'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova lezione'),
      settingsGear(),
    ]),
  ]);
  sticky.appendChild(toolbar);
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
