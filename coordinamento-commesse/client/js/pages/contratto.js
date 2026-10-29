// Contratto — baseline del capitolato e procedura di change management
// concordata in fase di stipula. Per ogni contratto attivo con una data
// di baseline, mostra le versioni di requisiti successive (variazioni
// da gestire) con un'azione rapida per segnalarle nel Registro Allert.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, formatDate, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';

const STATO = { attivo: 'Attivo', chiuso: 'Chiuso' };

function formatValore(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openAttoForm(contrattoId, existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true, placeholder: 'es. Variante n.1 — fornitura aggiuntiva' })));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data', dateInput('data', existing?.data ?? '')),
    field('Valore (€)', textInput('valore', existing?.valore ?? '', { type: 'number', step: '0.01' })),
  ]));
  form.appendChild(field('Descrizione', textarea('descrizione', existing?.descrizione ?? '')));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    try {
      if (existing) await api.put(`/contratti/atti/${existing.id}`, data);
      else await api.post(`/contratti/${contrattoId}/atti`, data);
      closeModal();
      toast(existing ? 'Atto aggiuntivo aggiornato.' : 'Atto aggiuntivo registrato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica atto aggiuntivo' : 'Nuovo atto aggiuntivo', form);
}

function openForm(existing, onSaved) {
  const form = el('form', {});
  if (existing) {
    const commessaOptions = state.commesse.map((c) => [c.id, `${c.codice} — ${c.nome}`]);
    form.appendChild(field('Commessa', select('commessa_id', commessaOptions, existing.commessa_id),
      'Sposta il contratto su un\'altra commessa se è stato registrato per errore su quella sbagliata.'));
  }
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true, placeholder: 'es. Contratto di appalto montaggio' })));
  form.appendChild(field('Controparte', textInput('controparte', existing?.controparte ?? '')));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Data stipula', dateInput('data_stipula', existing?.data_stipula ?? '')),
    field('Valore (€)', textInput('valore', existing?.valore ?? '', { type: 'number', step: '0.01' })),
  ]));
  form.appendChild(field('Riferimento capitolato', textInput('riferimento_capitolato', existing?.riferimento_capitolato ?? '', { placeholder: 'es. Capitolato rev. 3 del 15/09/2026' })));
  form.appendChild(field(
    'Data baseline capitolato', dateInput('capitolato_baseline_data', existing?.capitolato_baseline_data ?? ''),
    'Ogni versione di un requisito successiva a questa data è segnalata come variazione da gestire.'
  ));
  form.appendChild(field(
    'Procedura di change management', textarea('procedura_change_management', existing?.procedura_change_management ?? ''),
    'Cosa prevede il contratto quando capitolato o requisiti cambiano dopo la stipula.'
  ));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v]), existing?.stato ?? 'attivo')));
  form.appendChild(field('Link', textInput('url', existing?.url ?? '', { placeholder: 'https://…' })));
  const fileInput = el('input', { type: 'file', name: 'file' });
  form.appendChild(field('File', fileInput, existing?.file_nome
    ? `File attuale: ${existing.file_nome} (${formatSize(existing.file_size)})`
    : 'Carica il contratto firmato (PDF, max 25 MB).'));
  if (existing?.file_nome) {
    form.appendChild(el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:11.5px;color:var(--ink-2);margin:-8px 0 14px' }, [
      el('input', { type: 'checkbox', name: 'rimuovi_file' }), 'Rimuovi il file attuale',
    ]));
  }
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (!existing) fd.set('commessa_id', state.commessaId);
    if (fd.get('rimuovi_file') === 'on') fd.set('rimuovi_file', '1');
    if (!fileInput.files.length) fd.delete('file');
    try {
      if (existing) await api.putForm(`/contratti/${existing.id}`, fd);
      else await api.postForm('/contratti', fd);
      closeModal();
      toast(existing ? 'Contratto aggiornato.' : 'Contratto registrato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica contratto' : 'Nuovo contratto', form);
}

async function segnalaVariazione(contratto, variazione, onDone) {
  try {
    await api.post('/allert', {
      commessa_id: state.commessaId,
      classificazione: 'attenzione',
      perimetro: 'interno',
      descrizione: `Variazione del requisito ${variazione.codice_wbs} (v${variazione.numero_versione}) successiva alla baseline contrattuale del ${formatDate(contratto.capitolato_baseline_data)} — ${contratto.titolo}.`,
      azione_tutela: contratto.procedura_change_management || null,
      rif_requisito_id: variazione.requisito_id,
      stato: 'aperto',
    });
    toast('Segnalato nel Registro Allert.');
    onDone();
  } catch (err) {
    toast(err.message, { error: true });
  }
}

async function renderContrattoCard(c, refreshAll) {
  const [variazioni, atti] = await Promise.all([
    c.stato === 'attivo' && c.capitolato_baseline_data
      ? api.get(`/contratti/${c.id}/variazioni`).then((r) => r.data)
      : Promise.resolve([]),
    api.get(`/contratti/${c.id}/atti`).then((r) => r.data),
  ]);
  const valoreAtti = atti.reduce((sum, a) => sum + (a.valore || 0), 0);
  const valoreTotale = (c.valore || 0) + valoreAtti;

  return el('div', { class: 'section card card--compact' }, [
    el('div', { class: 'section__head' }, [
      el('div', {}, [
        el('h2', {}, c.titolo),
        el('div', { class: 'muted' }, [c.controparte, c.data_stipula && `stipulato il ${formatDate(c.data_stipula)}`,
          atti.length ? `base ${formatValore(c.valore)} + atti ${formatValore(valoreAtti)} = ${formatValore(valoreTotale)}` : formatValore(c.valore)]
          .filter(Boolean).join(' · ')),
      ]),
      el('div', { style: 'display:flex;gap:6px' }, [
        el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(c, refreshAll) }, 'Modifica'),
        el('button', {
          class: 'btn btn--sm btn--ghost btn--danger',
          onclick: async () => {
            if (!confirmDialog('Eliminare questo contratto?')) return;
            await api.del(`/contratti/${c.id}`);
            toast('Eliminato.');
            refreshAll();
          },
        }, 'Elimina'),
      ]),
    ]),
    el('div', { class: 'tiles' }, [
      el('div', { class: 'tile' }, [el('div', { class: 'tile__label' }, 'Stato'), el('div', { class: 'tile__value' }, STATO[c.stato])]),
      el('div', { class: 'tile' }, [el('div', { class: 'tile__label' }, 'Baseline capitolato'), el('div', { class: 'tile__value', style: 'font-size:16px' }, c.capitolato_baseline_data ? formatDate(c.capitolato_baseline_data) : '—')]),
      el('div', { class: 'tile' }, [el('div', { class: 'tile__label' }, 'Variazioni da gestire'), el('div', { class: 'tile__value' + (variazioni.length ? ' alert' : '') }, String(variazioni.length))]),
      el('div', { class: 'tile' }, [el('div', { class: 'tile__label' }, 'Valore totale (con atti aggiuntivi)'), el('div', { class: 'tile__value', style: 'font-size:16px' }, formatValore(valoreTotale))]),
    ]),
    c.riferimento_capitolato ? el('p', {}, [el('b', {}, 'Riferimento capitolato: '), c.riferimento_capitolato]) : null,
    c.procedura_change_management ? el('p', {}, [el('b', {}, 'Procedura di change management: '), c.procedura_change_management]) : null,
    el('p', {}, [
      c.url ? el('a', { href: c.url, target: '_blank', rel: 'noopener', class: 'btn btn--sm', style: 'margin-right:8px' }, 'Apri link ↗') : null,
      c.file_path ? el('a', { href: `/api/contratti/${c.id}/file`, class: 'btn btn--sm' }, `⬇ ${c.file_nome}`) : null,
    ]),
    el('div', { style: 'margin-top:14px' }, [
      el('div', { class: 'section__head' }, [
        el('div', { class: 'eyebrow' }, 'Atti aggiuntivi (varianti/integrazioni economiche)'),
        el('button', { class: 'btn btn--sm', onclick: () => openAttoForm(c.id, null, refreshAll) }, '+ Nuovo atto'),
      ]),
      atti.length ? el('div', { class: 'reminder-list' }, atti.map((a) => el('div', { class: 'reminder-item' }, [
        el('span', {}, `${a.titolo}${a.data ? ` — ${formatDate(a.data)}` : ''} · ${formatValore(a.valore)}`),
        el('div', { style: 'display:flex;gap:6px' }, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openAttoForm(c.id, a, refreshAll) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo atto aggiuntivo?')) return;
              await api.del(`/contratti/atti/${a.id}`);
              toast('Eliminato.');
              refreshAll();
            },
          }, 'Elimina'),
        ]),
      ]))) : el('p', { class: 'muted' }, 'Nessun atto aggiuntivo registrato per questo contratto.'),
    ]),
    variazioni.length ? el('div', { style: 'margin-top:14px' }, [
      el('div', { class: 'eyebrow' }, 'Variazioni rispetto alla baseline'),
      el('div', { class: 'reminder-list' }, variazioni.map((v) => el('div', { class: 'reminder-item' }, [
        el('span', {}, `${v.codice_wbs} — ${v.titolo} (v${v.numero_versione}, ${formatDate(v.data)})`),
        el('button', { class: 'btn btn--sm', onclick: () => segnalaVariazione(c, v, refreshAll) }, 'Segnala in Registro Allert'),
      ]))),
    ]) : null,
  ]);
}

export async function renderContratto(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Il contratto stipulato con la sua baseline di capitolato: ogni modifica ai requisiti successiva alla baseline è segnalata qui come variazione da gestire secondo la procedura concordata.'));

  let lastRows = [];
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => printReport('Contratti', state.commesse.find(c => c.id === state.commessaId), [{
        heading: 'Contratti',
        columns: ['Titolo', 'Controparte', 'Data stipula', 'Valore', 'Baseline capitolato', 'Stato'],
        rows: lastRows.map((r) => [r.titolo, r.controparte || '—', formatDate(r.data_stipula), formatValore(r.valore), r.capitolato_baseline_data ? formatDate(r.capitolato_baseline_data) : '—', STATO[r.stato]]),
      }]) }, 'Stampa'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo contratto'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const listHost = el('div');
  container.appendChild(listHost);

  async function refresh() {
    const res = await api.get(`/contratti?commessa_id=${state.commessaId}`);
    lastRows = res.data;
    listHost.innerHTML = '';
    if (!res.data.length) {
      listHost.appendChild(el('p', { class: 'muted' }, 'Nessun contratto registrato per questa commessa.'));
      return;
    }
    for (const c of res.data) {
      listHost.appendChild(await renderContrattoCard(c, refresh));
    }
  }

  await refresh();
}
