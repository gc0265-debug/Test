// Note di Coordinamento — modellata sulla Nota di Coordinamento ATI:
// un'agenda numerata, generabile in automatico dalle criticità aperte
// (per WP, se filtrate) e poi modificabile a mano prima dell'invio.

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import {
  el, field, textInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { printReport } from '../components/report.js';
import { getCategoria, mergeLabels } from '../components/categorie.js';

const STATO_FIXED = { bozza: ['Bozza', 'outline'], inviata: ['Inviata', 'verde'] };
let STATO = STATO_FIXED;

function renderPuntiEditor(punti, onChange) {
  const host = el('div');
  function draw() {
    host.innerHTML = '';
    punti.forEach((p, i) => {
      const row = el('div', { style: 'border:1px solid var(--rule);padding:10px 12px;margin-bottom:8px;' }, [
        el('div', { class: 'field--row' }, [
          field('WP', textInput(`p-wp-${i}`, p.wp || '', { oninput: (e) => { p.wp = e.target.value; } })),
          field('Stato', textInput(`p-stato-${i}`, p.stato || '', { oninput: (e) => { p.stato = e.target.value; } })),
        ]),
        field('Tema', textInput(`p-tema-${i}`, p.tema || '', { oninput: (e) => { p.tema = e.target.value; } })),
        field('Testo', textarea(`p-testo-${i}`, p.testo || '', { oninput: (e) => { p.testo = e.target.value; } })),
        el('button', {
          type: 'button', class: 'btn btn--sm btn--ghost btn--danger',
          onclick: () => { punti.splice(i, 1); draw(); onChange(); },
        }, 'Rimuovi punto'),
      ]);
      host.appendChild(row);
    });
    host.appendChild(el('button', {
      type: 'button', class: 'btn btn--sm',
      onclick: () => { punti.push({ wp: '', tema: '', testo: '', stato: 'Aperto' }); draw(); onChange(); },
    }, '+ Aggiungi punto manuale'));
  }
  draw();
  return host;
}

function openForm(existing, onSaved) {
  const punti = existing ? JSON.parse(JSON.stringify(existing.punti)) : [];
  const form = el('form', {});
  form.appendChild(field('Data', textInput('data', existing?.data || todayISO(), { type: 'date', required: true })));
  form.appendChild(field('Oggetto', textInput('oggetto', existing?.oggetto ?? 'Punti aperti per il coordinamento', { required: true })));
  form.appendChild(field('Destinatari', textInput('destinatari', existing?.destinatari ?? '')));
  form.appendChild(field('Per conoscenza', textInput('per_conoscenza', existing?.per_conoscenza ?? '')));
  form.appendChild(el('div', { class: 'eyebrow', style: 'margin-top:18px' }, 'Punti dell\'agenda'));
  form.appendChild(renderPuntiEditor(punti, () => {}));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'bozza')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (!existing) data.commessa_id = state.commessaId;
    data.punti = punti;
    try {
      if (existing) await api.put(`/note-coordinamento/${existing.id}`, data);
      else await api.post('/note-coordinamento', data);
      closeModal();
      toast(existing ? 'Nota aggiornata.' : 'Nota creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica nota di coordinamento' : 'Nuova nota di coordinamento', form);
}

function openGeneraBozza(onSaved) {
  const form = el('form', {});
  const wpOptions = [['', 'Tutti i work package'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  form.appendChild(field('Oggetto', textInput('oggetto', 'Punti aperti per il coordinamento')));
  form.appendChild(field('Destinatari', textInput('destinatari', '')));
  form.appendChild(field('Per conoscenza', textInput('per_conoscenza', '')));
  form.appendChild(field('Work package', select('wp_id', wpOptions, '')));
  form.appendChild(el('p', { class: 'muted' }, 'Genera un punto numerato per ogni criticità ancora aperta, ordinato per work package e urgenza. Il testo resta modificabile prima dell\'invio.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Genera bozza'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
    try {
      await api.post('/note-coordinamento/genera-bozza', data);
      closeModal();
      toast('Bozza generata dalle criticità aperte.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal('Genera bozza dalle criticità aperte', form);
}

function printableView(nota) {
  const doc = el('div', { class: 'nota-doc' }, [
    el('div', { class: 'nota-doc__head' }, [
      el('div', {}, [el('span', { class: 'k' }, 'Data'), formatDate(nota.data)]),
      el('div', {}, [el('span', { class: 'k' }, 'Oggetto'), nota.oggetto]),
      el('div', {}, [el('span', { class: 'k' }, 'Destinatari'), nota.destinatari || '—']),
      el('div', {}, [el('span', { class: 'k' }, 'Per conoscenza'), nota.per_conoscenza || '—']),
    ]),
    el('ol', {}, nota.punti.map((p) => el('li', {}, [
      el('b', {}, p.tema || '(senza tema)'),
      p.wp ? el('div', { class: 'wp' }, p.wp) : null,
      el('p', {}, `${p.testo || ''}${p.stato ? ` — Stato: ${p.stato}` : ''}`),
    ]))),
  ]);
  return doc;
}

function openPreview(nota) {
  openModal(`Anteprima — ${nota.oggetto}`, el('div', {}, [
    printableView(nota),
    el('div', { class: 'modal__actions' }, [
      el('button', { class: 'btn', onclick: () => closeModal() }, 'Chiudi'),
      el('button', { class: 'btn btn--primary', onclick: () => { const w = window.open('', '_blank'); printToWindow(w, nota); } }, 'Stampa / esporta'),
    ]),
  ]));
}

export async function renderNote(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  if (soloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per l\'anteprima, o su "Modifica" per modificarla. Per creare una nuova nota, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  let lastRows = [];
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((n) => String(n.id) === String(selectedId)) : lastRows;
        printReport('Note di Coordinamento', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Elenco note',
          columns: ['Data', 'Oggetto', 'Destinatari', 'Punti', 'Stato'],
          rows: rows.map((n) => [formatDate(n.data), n.oggetto, n.destinatari || '—', n.punti.length, STATO[n.stato][0]]),
        }]);
      } }, 'Stampa elenco'),
      soloLettura ? null : el('button', { class: 'btn', onclick: () => openGeneraBozza(refresh) }, 'Genera da criticità aperte'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nota vuota'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, statoList] = await Promise.all([
      api.get(`/note-coordinamento?${queryScopeCommessa()}`),
      getCategoria('note_stato'),
    ]);
    STATO = mergeLabels(STATO_FIXED, statoList);
    lastRows = res.data;
    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (n) => n.commessa_codice || '—' } : null,
      { key: 'data', label: 'Data', render: (n) => formatDate(n.data) },
      { key: 'oggetto', label: 'Oggetto', render: (n) => el('a', { href: '#', onclick: (e) => { e.preventDefault(); openPreview(n); } }, n.oggetto) },
      { key: 'destinatari', label: 'Destinatari' },
      { key: 'punti', label: 'Punti', numeric: true, render: (n) => n.punti.length },
      { key: 'stato', label: 'Stato', render: (n) => pill(STATO[n.stato][0], STATO[n.stato][1]) },
      {
        key: 'actions', label: '', className: 'actions',
        render: (nota) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openPreview(nota) }, 'Anteprima'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(nota, refresh) }, 'Modifica'),
          soloLettura ? null : el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questa nota?')) return;
              await api.del(`/note-coordinamento/${nota.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessuna nota di coordinamento per questa commessa.',
      onRowClick: (n) => openPreview(n),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}

function printToWindow(win, nota) {
  const commessa = state.commesse.find((c) => c.id === state.commessaId);
  const intestazione = commessa ? `${commessa.codice} — ${commessa.nome}` : (nota.commessa_codice || '');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${nota.oggetto}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1A1A1A;}
      h1{font-size:18px;} .k{display:inline-block;width:110px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.08em;}
      ol{list-style:none;counter-reset:n;padding:0;} li{counter-increment:n;padding:10px 0;border-bottom:1px solid #eee;}
      li::before{content:counter(n,decimal-leading-zero) "  ";color:#C0332B;font-weight:700;}
      li b{display:block;margin-left:26px;} li .wp{font-size:10px;color:#888;text-transform:uppercase;margin-left:26px;}
      li p{margin:4px 0 0 26px;color:#444;}
    </style></head><body>
    <h1>${intestazione}</h1>
    <p><span class="k">Data</span>${formatDate(nota.data)}</p>
    <p><span class="k">Oggetto</span>${nota.oggetto}</p>
    <p><span class="k">Destinatari</span>${nota.destinatari || '—'}</p>
    <p><span class="k">Per conoscenza</span>${nota.per_conoscenza || '—'}</p>
    <ol>${nota.punti.map((p) => `<li><b>${p.tema || ''}</b>${p.wp ? `<div class="wp">${p.wp}</div>` : ''}<p>${p.testo || ''}${p.stato ? ' — Stato: ' + p.stato : ''}</p></li>`).join('')}</ol>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
