// Lavorazioni — pagina autonoma (non genericCrud) per ospitare i due
// grafici in alto: barre con % e torta con i valori, entrambi per stato.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo, consumaFocusRiga } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { barChart, pieChart, barChartHtml, pieChartHtml } from '../components/charts.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = { 'da-fare': ['Da fare', 'outline', 'var(--ink-3)'], 'in-corso': ['In corso', 'ambra', 'var(--ambra)'], completata: ['Completata', 'verde', 'var(--verde)'], bloccata: ['Bloccata', 'rosso', 'var(--red)'] };
// Stessi colori di STATO_FIXED, ma come esadecimale: la finestra di
// stampa non carica il CSS dell'app, quindi i var(--...) non risolverebbero.
const STATO_COLOR_PRINT = { 'var(--ink-3)': '#8A8A8A', 'var(--ambra)': '#A8761E', 'var(--verde)': '#2E7D5B', 'var(--red)': '#C0332B' };
const PRIORITA_FIXED = { alta: ['Alta', 'rosso'], media: ['Media', 'ambra'], bassa: ['Bassa', 'outline'] };
let STATO = STATO_FIXED;
let PRIORITA = PRIORITA_FIXED;

function guidaFase(titolo, punti) {
  return el('div', { style: 'margin-bottom:16px' }, [
    el('div', { class: 'eyebrow' }, titolo),
    el('ul', { style: 'margin:6px 0 0;padding-left:18px' }, punti.map((p) => el('li', { style: 'margin-bottom:4px;font-size:12.5px' }, p))),
  ]);
}

// Guida in linea al rilevamento misure, richiamabile dalla scheda di una
// lavorazione: le 5 fasi della procedura, adattate per riferirsi ai campi
// e ai pulsanti effettivamente presenti qui (non un testo generico).
function openGuidaMisure() {
  const body = el('div', {}, [
    el('p', { class: 'muted', style: 'margin-top:0' },
      'Procedura consigliata per aggiornare le misure prima della riunione di SAL — tipico per gli arredi su misura, dove la differenza tra progetto e realtà è spesso la base per una variante.'),
    guidaFase('Fase 1 — Rilevamento in opera (sopralluogo)', [
      'Strumenti: distanziometro laser per le lunghezze totali, metro a nastro per i dettagli millimetrici (spessori, disallineamenti dei muri).',
      'Percorri ogni tratta oggetto di intervento nel mese.',
      'Rileva: lunghezza effettiva posata, altezza reale dal pavimento al soffitto (spesso variabile nei corridoi lunghi), profondità disponibile (sporgenze impiantistiche non previste).',
      'Segna subito su uno schizzo quotato — o sui file di progetto, se disponibili in cantiere — le differenze rispetto al disegno iniziale, con un colore diverso per le quote "reali".',
    ]),
    guidaFase('Fase 2 — Registra la variazione qui', [
      'Per ogni tratta misurata, aggiungi una riga in Misure con Tratta/Posizione, Quota di progetto e Quota rilevata: il Delta e la percentuale di scostamento si calcolano da soli.',
      'Esempio: "Corridoio Nord, lato dx" — progetto 12,50 m, rilevato 12,65 m.',
      'Se il contratto è a misura, il delta per il prezzo unitario dà l\'incidenza economica; se è a corpo, valuta se la variazione supera la soglia di tolleranza contrattuale (tipicamente ±5% o ±10%) — una valutazione tua, non calcolata qui.',
    ]),
    guidaFase('Fase 3 — Documentazione fotografica', [
      'Scatta foto chiare di ogni tratta misurata, con data e quota rilevata in didascalia o su un cartellino visibile nello scatto.',
      'Carica la foto in Documenti, poi collegala qui alla misura dal campo "Foto / documento di riferimento": è la prova per giustificare pezzi speciali o tagli aggiuntivi non previsti inizialmente.',
    ]),
    guidaFase('Fase 4 — Nota tecnica e soglia di attenzione', [
      'Le misure con uno scostamento superiore al 3% sono evidenziate automaticamente in rosso qui sotto.',
      'Per ciascuna, scrivi nella nota tecnica il motivo della differenza (es. "muro non a piombo", "variazione massetto", "spostamento traccia elettrica").',
      'Se lo scostamento richiede una decisione del cliente o della Direzione Lavori, usa il pulsante "Segnala criticità" sulla riga: apre direttamente una voce nel Registro Criticità, già collegata a questa misura.',
    ]),
    guidaFase('Fase 5 — Verifica finale', [
      'Controlla che la somma delle misure rilevate corrisponda a quanto dichiarerai nel SAL del mese.',
      'Assicurati che tutte le misure del mese siano inserite qui prima della riunione.',
    ]),
  ]);
  openModal('Guida — Come aggiornare le misurazioni', body);
}

function formatQuota(v, unita) {
  if (v === null || v === undefined) return '—';
  const etichettaUnita = unita === 'm2' ? 'm²' : (unita === 'pz' ? 'pz' : 'm');
  return `${v} ${etichettaUnita}`;
}

async function openMisuraForm(lavorazione, existing, onSaved) {
  const documentiRes = await api.get(`/documenti?commessa_id=${lavorazione.commessa_id}`);
  const documentoOptions = [['', '— nessuno'], ...documentiRes.data.map((d) => [d.id, d.titolo])];

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(field('Tratta / Posizione', textInput('tratta', existing?.tratta ?? '', { required: true, placeholder: 'es. Corridoio Nord, lato dx' }),
    'La porzione di lavorazione misurata, identificabile anche da chi non era presente al sopralluogo.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Quota di progetto', textInput('quota_progetto', existing?.quota_progetto ?? '', { type: 'number', step: '0.01' }),
      'Il valore previsto dal disegno esecutivo.'),
    field('Quota rilevata', textInput('quota_rilevata', existing?.quota_rilevata ?? '', { type: 'number', step: '0.01' }),
      'Il valore misurato in opera: da qui si calcolano delta e percentuale di scostamento.'),
  ]));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Unità', select('unita', [['m', 'Metri lineari'], ['m2', 'Metri quadri'], ['pz', 'Pezzi']], existing?.unita ?? 'm'),
      'Deve essere la stessa per quota di progetto e quota rilevata.'),
    field('Data rilievo', dateInput('data_rilievo', existing?.data_rilievo || todayISO()),
      'Quando è stata presa la misura in cantiere.'),
  ]));
  form.appendChild(field('Nota tecnica', textarea('nota_tecnica', existing?.nota_tecnica ?? ''),
    'Perché c\'è differenza: es. "muro non a piombo", "variazione massetto", "spostamento traccia elettrica".'));
  form.appendChild(field('Foto / documento di riferimento', select('documento_id', documentoOptions, existing?.documento_id ?? ''),
    'Collega una foto già caricata in Documenti, se presente.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => openForm(lavorazione, onSaved) }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Aggiungi'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.lavorazione_id = lavorazione.id;
    try {
      if (existing) await api.put(`/misure/${existing.id}`, data);
      else await api.post('/misure', data);
      toast(existing ? 'Misura aggiornata.' : 'Misura aggiunta.');
      await openForm(lavorazione, onSaved);
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica misura' : 'Nuova misura', form);
}

async function renderMisureSection(lavorazione, onSaved, soloLettura) {
  const res = await api.get(`/misure?lavorazione_id=${lavorazione.id}`);
  const misure = res.data;
  const host = el('div');

  if (!misure.length) {
    host.appendChild(el('p', { class: 'muted', style: 'margin:4px 0' }, 'Nessuna misura rilevata per questa lavorazione.'));
  } else {
    host.appendChild(el('div', { style: 'border:1px solid var(--rule);margin:6px 0 4px' }, misure.map((m) => {
      const deltaText = m.delta !== null
        ? `${m.delta > 0 ? '+' : ''}${m.delta.toFixed(2)} ${m.unita === 'm2' ? 'm²' : m.unita} (${m.percentuale_scostamento > 0 ? '+' : ''}${m.percentuale_scostamento.toFixed(1)}%)`
        : '—';
      const azioni = soloLettura ? [] : [
        el('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openMisuraForm(lavorazione, m, onSaved) }, 'Modifica'),
        el('button', {
          type: 'button', class: 'btn btn--sm btn--ghost btn--danger',
          onclick: async () => {
            if (!confirmDialog('Eliminare questa misura?')) return;
            await api.del(`/misure/${m.id}`);
            await openForm(lavorazione, onSaved);
          },
        }, 'Elimina'),
        (m.oltre_soglia && !m.rif_criticita_id) ? el('button', {
          type: 'button', class: 'btn btn--sm btn--ghost',
          onclick: async () => {
            if (!confirmDialog('Aprire una criticità nel Registro Criticità per questo scostamento?')) return;
            await api.post(`/misure/${m.id}/segnala-criticita`, {});
            toast('Criticità creata nel Registro Criticità.');
            await openForm(lavorazione, onSaved);
          },
        }, 'Segnala criticità') : null,
      ].filter(Boolean);

      return el('div', { style: 'padding:8px 10px;font-size:12.5px;border-bottom:1px solid var(--rule-2)' }, [
        el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' }, [
          el('b', {}, m.tratta),
          m.oltre_soglia ? pill('Oltre soglia', 'rosso') : (m.delta !== null ? pill('Entro soglia', 'verde') : null),
        ]),
        el('div', { class: 'muted', style: 'margin-top:2px' },
          `Progetto: ${formatQuota(m.quota_progetto, m.unita)} · Rilevato: ${formatQuota(m.quota_rilevata, m.unita)} · Delta: ${deltaText}`),
        m.nota_tecnica ? el('div', { style: 'margin-top:4px' }, m.nota_tecnica) : null,
        el('div', { class: 'muted', style: 'margin-top:4px;font-size:11px' },
          `Rilevata il ${formatDate(m.data_rilievo)}${m.documento_titolo ? ` · Foto/doc: ${m.documento_titolo}` : ''}${m.criticita_tema ? ` · Segnalata: ${m.criticita_tema}` : ''}`),
        azioni.length ? el('div', { style: 'display:flex;gap:6px;margin-top:6px' }, azioni) : null,
      ]);
    })));
  }
  return host;
}

async function openForm(existing, onSaved) {
  // In vista aggregata di gruppo la lavorazione può appartenere a una
  // commessa diversa da quella (eventuale) selezionata in sidebar.
  const commessaIdForm = existing?.commessa_id ?? state.commessaId;
  const [contrattiRes, stakeholderRes, wpRes, lavorazioniRes] = await Promise.all([
    api.get(`/contratti?commessa_id=${commessaIdForm}`),
    api.get(`/stakeholder?commessa_id=${commessaIdForm}`),
    api.get(`/commesse/${commessaIdForm}/wp`),
    api.get(`/lavorazioni?commessa_id=${commessaIdForm}`),
  ]);
  const contrattoOptions = [['', '— nessuna (seleziona dal Registro Stakeholder sotto)'], ...contrattiRes.data.map((c) => [c.id, `${c.controparte || c.titolo}`])];
  // Solo lavorazioni "di primo livello" (senza a loro volta una madre) e
  // diverse da questa: la gerarchia resta a 2 soli livelli, come in Timeline.
  const parentOptions = [['', '— nessuna (lavorazione autonoma)'],
    ...lavorazioniRes.data.filter((l) => !l.parent_id && l.id !== existing?.id).map((l) => [l.id, l.titolo])];
  // L'elenco mostra l'organizzazione (l'impresa vera e propria), non il
  // nome della persona di riferimento: più stakeholder della stessa
  // azienda (es. due referenti SAC Spa) contano come una sola opzione.
  // Uno stakeholder senza organizzazione compilata resta identificato dal
  // proprio nome, per non perderlo dall'elenco.
  const organizzazioniAttive = [...new Set(
    stakeholderRes.data.filter((s) => s.stato === 'attivo').map((s) => s.organizzazione || s.nome)
  )].sort((a, b) => a.localeCompare(b, 'it'));
  const impresaOptions = [['', '—'], ...organizzazioniAttive.map((o) => [o, o])];
  if (existing?.impresa && !impresaOptions.some(([v]) => v === existing.impresa)) {
    impresaOptions.push([existing.impresa, `${existing.impresa} (non più nel Registro Stakeholder)`]);
  }

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  const wpOptions = [['', 'Tutti i WP'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true }),
    'Il nome mostrato nella Timeline Montaggi e nella lista Lavorazioni.'));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'A quale WP appartiene questa lavorazione.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Piano', textInput('piano', existing?.piano ?? '', { placeholder: 'es. P+5' }),
      'Determina il gruppo in cui compare nella Timeline Montaggi, in stile MPP.'),
    field('Zona (Key Plan)', textInput('zona', existing?.zona ?? '', { placeholder: 'es. 5.1' }),
      'Riferimento alla planimetria, se disponibile.'),
  ]));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? ''),
    'Dettagli aggiuntivi, non mostrati nel Gantt ma visibili aprendo la lavorazione.'));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'da-fare'),
    'Determina il colore della barra nella Timeline e conta nei grafici di avanzamento e nel SAL.'));
  form.appendChild(field('Priorità', select('priorita', Object.entries(PRIORITA).map(([k, v]) => [k, v[0]]), existing?.priorita ?? 'media'),
    'Solo informativa: non influisce sul calcolo delle date.'));
  form.appendChild(field('Avanzamento (%)', textInput('percentuale_completamento', existing?.percentuale_completamento ?? 0, { type: 'number', min: '0', max: '100', step: '5' }),
    'Riempie la barra nella Timeline in proporzione: non è legato allo stato, va aggiornato a mano quando cambia l\'avanzamento reale in cantiere.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data inizio', dateInput('data_inizio', existing?.data_inizio ?? ''),
      'Lasciare vuoto se la lavorazione non ha ancora una pianificazione: non comparirà nella Timeline Montaggi finché non ha entrambe le date.'),
    field('Data fine', dateInput('data_fine', existing?.data_fine ?? ''), 'Data entro cui la lavorazione deve concludersi.'),
  ]));
  form.appendChild(field('Impresa (collegata a un contratto)', select('contratto_id', contrattoOptions, existing?.contratto_id ?? ''),
    'Se l\'impresa ha un contratto registrato in Contratti, collegalo qui invece di scriverlo a mano.'));
  form.appendChild(field('Impresa / squadra (da Registro Stakeholder)', select('impresa', impresaOptions, existing?.impresa ?? ''),
    'L\'organizzazione dello stakeholder, non la singola persona di riferimento. Usato solo se non è collegato un contratto sopra.'));
  form.appendChild(field('Lavorazione madre', select('parent_id', parentOptions, existing?.parent_id ?? ''),
    'Scegli una lavorazione madre per renderla una sotto-attività, mostrata rientrata sotto di essa nella Timeline Montaggi.'));

  if (existing) {
    const soloLettura = state.currentUser?.ruolo === 'cliente';
    form.appendChild(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:18px' }, [
      el('div', { class: 'eyebrow' }, 'Misure rilevate in opera'),
      el('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openGuidaMisure() }, '? Guida'),
    ]));
    form.appendChild(await renderMisureSection(existing, onSaved, soloLettura));
    if (!soloLettura) {
      form.appendChild(el('button', {
        type: 'button', class: 'btn btn--sm', style: 'margin:8px 0 4px',
        onclick: () => openMisuraForm(existing, null, onSaved),
      }, '+ Aggiungi misura'));
    }
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
      if (existing) await api.put(`/lavorazioni/${existing.id}`, data);
      else await api.post('/lavorazioni', data);
      closeModal();
      toast(existing ? 'Modifica salvata.' : 'Lavorazione creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica lavorazione' : 'Nuova lavorazione', form);
}

function statoItems(rows) {
  const counts = { 'da-fare': 0, 'in-corso': 0, completata: 0, bloccata: 0 };
  rows.forEach((r) => { counts[r.stato] = (counts[r.stato] || 0) + 1; });
  return Object.entries(STATO).map(([k, v]) => ({ label: v[0], value: counts[k], color: v[2] }));
}

// Stessi due grafici mostrati a schermo, in HTML per la finestra di
// stampa: stessa disposizione (barre a sinistra, torta con legenda a
// destra), colori esadecimali al posto dei var(--...) dell'app.
function chartsPrintHtml(rows) {
  const items = statoItems(rows).map((it) => ({ ...it, color: STATO_COLOR_PRINT[it.color] || it.color }));
  const legend = items.map((it) => `
    <div class="chart-legend-item"><span class="chart-legend-dot" style="background:${it.color}"></span>${it.label}: ${it.value}</div>
  `).join('');
  return `
    <div class="charts-row">
      <div class="chart-box">
        <div class="chart-box__title">Lavorazioni per stato (%)</div>
        ${barChartHtml(items, { width: 320 })}
      </div>
      <div class="chart-box">
        <div class="chart-box__title">Lavorazioni per stato (valori)</div>
        <div class="chart-pie-wrap">
          ${pieChartHtml(items, { size: 130 })}
          <div class="chart-legend">${legend}</div>
        </div>
      </div>
    </div>
  `;
}

function renderCharts(rows) {
  const items = statoItems(rows);
  return el('div', { class: 'charts-row' }, [
    el('div', { class: 'chart-box' }, [
      el('div', { class: 'chart-box__title' }, 'Lavorazioni per stato (%)'),
      barChart(items, { width: 320 }),
    ]),
    el('div', { class: 'chart-box' }, [
      el('div', { class: 'chart-box__title' }, 'Lavorazioni per stato (valori)'),
      el('div', { class: 'chart-pie-wrap' }, [
        pieChart(items, { size: 130 }),
        el('div', { class: 'chart-legend' }, items.map((it) => el('div', { class: 'chart-legend-item' }, [
          el('span', { class: 'chart-legend-dot', style: `background:${it.color}` }),
          `${it.label}: ${it.value}`,
        ]))),
      ]),
    ]),
  ]);
}

export async function renderLavorazioni(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  const chartsHost = el('div');
  container.appendChild(chartsHost);

  let lastRows = [];
  let selectedId = null;
  let filtroStato = '';
  let filtroWp = '';
  const clienteSoloLettura = state.currentUser?.ruolo === 'cliente';
  const soloLettura = clienteSoloLettura || inVistaGruppo();
  if (inVistaGruppo() && !clienteSoloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare una nuova lavorazione, seleziona prima una singola commessa dal menu a sinistra.'));
  }
  const statoPillHost = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
  const wpPillHost = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });

  function statoPillFilter(value, label) {
    return el('button', {
      class: 'btn btn--sm' + (filtroStato === value ? ' btn--primary' : ''),
      onclick: () => { filtroStato = value; refresh(); },
    }, label);
  }
  function wpPillFilter(value, label) {
    return el('button', {
      class: 'btn btn--sm' + (String(filtroWp) === String(value) ? ' btn--primary' : ''),
      onclick: () => { filtroWp = value; refresh(); },
    }, label);
  }

  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:center' }, [
      statoPillHost,
      soloLettura ? null : wpPillHost,
    ]),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Stato avanzamento dei montaggi', inVistaGruppo() ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Lavorazioni',
          columns: ['Titolo', 'WP', 'Piano/Zona', 'Stato', 'Priorità', 'Inizio', 'Fine', 'Impresa'],
          rows: rows.map((r) => [r.titolo, r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—', [r.piano, r.zona].filter(Boolean).join(' · ') || '—', STATO[r.stato][0], PRIORITA[r.priorita][0], formatDate(r.data_inizio), formatDate(r.data_fine), r.contratto_controparte || r.impresa || '—']),
        }], {
          intro: 'Si condivide lo stato avanzamento dei montaggi Gili Creations per vostra opportuna informazione.',
          chartsHtml: chartsPrintHtml(lastRows),
        });
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova lavorazione'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    let query = queryScopeCommessa();
    if (filtroStato) query += `&stato=${encodeURIComponent(filtroStato)}`;
    if (filtroWp) query += `&wp_id=${encodeURIComponent(filtroWp)}`;
    const [res, statoList, prioritaList] = await Promise.all([
      api.get(`/lavorazioni?${query}`),
      getCategoria('lavorazioni_stato'),
      getCategoria('lavorazioni_priorita'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    PRIORITA = mergeLabels(PRIORITA_FIXED, prioritaList);
    lastRows = res.data;

    statoPillHost.innerHTML = '';
    statoPillHost.appendChild(statoPillFilter('', 'Tutte'));
    Object.entries(STATO).forEach(([key, v]) => statoPillHost.appendChild(statoPillFilter(key, v[0])));
    if (!soloLettura) {
      wpPillHost.innerHTML = '';
      wpPillHost.appendChild(wpPillFilter('', 'Tutti i WP'));
      state.workPackages.forEach((w) => wpPillHost.appendChild(wpPillFilter(w.id, w.codice)));
    }
    chartsHost.innerHTML = '';
    chartsHost.appendChild(renderCharts(res.data));

    renderTable(tableHost, [
      inVistaGruppo() ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      {
        key: 'titolo', label: 'Titolo',
        render: (r) => el('div', {}, [r.titolo, r.parent_titolo ? el('div', { class: 'muted', style: 'font-size:10.5px' }, `↳ sotto-attività di ${r.parent_titolo}`) : null]),
      },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'pianozona', label: 'Piano / Zona', render: (r) => [r.piano, r.zona].filter(Boolean).join(' · ') || '—' },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'priorita', label: 'Priorità', render: (r) => pill(PRIORITA[r.priorita][0], PRIORITA[r.priorita][1]) },
      { key: 'date', label: 'Inizio → Fine', render: (r) => (r.data_inizio || r.data_fine) ? `${formatDate(r.data_inizio)} → ${formatDate(r.data_fine)}` : '—' },
      { key: 'impresa', label: 'Impresa', render: (r) => r.contratto_controparte || r.impresa || '—' },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare definitivamente questa lavorazione?')) return;
              await api.del(`/lavorazioni/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessuna lavorazione registrata per questa commessa.',
      onRowClick: clienteSoloLettura ? null : (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();

  const focusId = consumaFocusRiga('lavorazioni');
  if (focusId) {
    const riga = lastRows.find((r) => String(r.id) === String(focusId));
    if (riga && !clienteSoloLettura) openForm(riga, refresh);
  }
}
