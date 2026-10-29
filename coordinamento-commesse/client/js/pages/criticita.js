// Registro Criticità — modellato su 2514RW_Registro_Criticita_PM: una
// criticità per Work Package, con urgenza "viola" (risposta a scadenza,
// tipicamente 3 giorni) o "verde" (risposta dovuta dalla controparte,
// senza termine fisso). La tabella mostra per prima cosa le viola scadute.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, textarea, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, pill, formatDate, todayISO, settingsGear,
} from '../components/ui.js';
import { openStorico } from '../components/storico.js';
import { printReport } from '../components/report.js';

const URGENZA = { viola: ['Urgente (3gg)', 'viola'], verde: ['Dovuta da controparte', 'verde'], normale: ['Normale', 'normale'] };
const STATO = { aperta: ['Aperta', 'outline'], 'in-attesa': ['In attesa', 'ambra'], chiusa: ['Chiusa', 'verde'] };

function urgenzaCell(row) {
  const [label] = URGENZA[row.urgenza];
  const badges = [pill(label, URGENZA[row.urgenza][1])];
  if (row.urgenza === 'viola' && row.stato !== 'chiusa' && row.entro_quando) {
    if (row.scaduta) badges.push(pill(`scaduta da ${Math.abs(row.giorni_rimanenti)} gg`, 'rosso'));
    else badges.push(pill(`${row.giorni_rimanenti} gg`, row.giorni_rimanenti <= 1 ? 'rosso' : 'ambra'));
  }
  return el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, badges);
}

function openForm(existing, onSaved) {
  const form = el('form', {});
  const wpOptions = [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])];

  const urgenzaSelect = select('urgenza', Object.entries(URGENZA).map(([k, v]) => [k, v[0]]), existing?.urgenza ?? 'normale');
  const scadenzaField = field('Entro quando (se urgente)', dateInput('entro_quando', existing?.entro_quando || ''), 'Obbligatoria se l\'urgenza è "Urgente (3gg)".');
  function syncScadenza() { scadenzaField.style.display = urgenzaSelect.value === 'viola' ? '' : 'none'; }
  urgenzaSelect.addEventListener('change', syncScadenza);

  form.appendChild(field('Tema', textInput('tema', existing?.tema ?? '', { required: true })));
  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? '')));
  form.appendChild(field('Cosa serve', textarea('cosa_serve', existing?.cosa_serve ?? '')));
  form.appendChild(field('Destinatario', textInput('destinatario', existing?.destinatario ?? '', { placeholder: 'es. SAC, DL, interno' })));
  form.appendChild(field('Urgenza', urgenzaSelect));
  form.appendChild(scadenzaField);
  form.appendChild(field('Impatto sul programma', textarea('impatto_programma', existing?.impatto_programma ?? '')));
  form.appendChild(field('Stato', select('stato', Object.entries(STATO).map(([k, v]) => [k, v[0]]), existing?.stato ?? 'aperta')));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  syncScadenza();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/criticita/${existing.id}`, data);
      else await api.post('/criticita', data);
      closeModal();
      toast(existing ? 'Criticità aggiornata.' : 'Criticità registrata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica criticità' : 'Nuova criticità', form);
}

export async function renderCriticita(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }

  const dashHost = el('div', { class: 'tiles' });
  container.appendChild(dashHost);

  let filtroStato = 'aperta';
  let lastRows = [];
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div', { style: 'display:flex;gap:6px' }, [
      pillFilter('aperta', 'Aperte'),
      pillFilter('', 'Tutte'),
      pillFilter('chiusa', 'Chiuse'),
    ]),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Registro Criticità', state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Criticità',
          columns: ['Tema', 'WP', 'Destinatario', 'Urgenza', 'Stato', 'Aperta il'],
          rows: rows.map((r) => [r.tema, r.wp_codice || '—', r.destinatario || '—', URGENZA[r.urgenza][0], STATO[r.stato][0], formatDate(r.data_apertura)]),
        }]);
      } }, 'Stampa'),
      el('a', { class: 'btn btn--sm', href: `/api/export/criticita/${state.commessaId}` }, 'Esporta Excel'),
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuova criticità'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);

  const tableHost = el('div');
  container.appendChild(tableHost);

  function tile(label, value, cls) {
    return el('div', { class: 'tile' }, [
      el('div', { class: 'tile__label' }, label),
      el('div', { class: 'tile__value' + (cls ? ' ' + cls : '') }, String(value)),
    ]);
  }

  function pillFilter(value, label) {
    const btn = el('button', {
      class: 'btn btn--sm' + (filtroStato === value ? ' btn--primary' : ''),
      onclick: () => { filtroStato = value; refresh(); },
    }, label);
    return btn;
  }

  async function refresh() {
    const query = new URLSearchParams({ commessa_id: state.commessaId });
    if (filtroStato) query.set('stato', filtroStato);
    const [res, allRes] = await Promise.all([
      api.get(`/criticita?${query.toString()}`),
      api.get(`/criticita?commessa_id=${state.commessaId}`),
    ]);
    lastRows = res.data;
    const totali = allRes.data.length;
    const aperte = allRes.data.filter((r) => r.stato !== 'chiusa').length;
    const inRitardo = allRes.data.filter((r) => r.scaduta).length;
    dashHost.innerHTML = '';
    dashHost.appendChild(tile('Totali', totali));
    dashHost.appendChild(tile('Aperte', aperte));
    dashHost.appendChild(tile('Chiuse', totali - aperte));
    dashHost.appendChild(tile('In ritardo', inRitardo, inRitardo > 0 ? 'alert' : ''));

    renderTable(tableHost, [
      { key: 'tema', label: 'Tema' },
      { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
      { key: 'destinatario', label: 'Destinatario' },
      { key: 'urgenza', label: 'Urgenza', render: urgenzaCell },
      { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
      { key: 'data_apertura', label: 'Aperta il', render: (r) => formatDate(r.data_apertura) },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          row.stato !== 'chiusa' ? el('button', {
            class: 'btn btn--sm btn--ghost',
            onclick: async () => { await api.put(`/criticita/${row.id}`, { ...row, stato: 'chiusa' }); toast('Criticità chiusa.'); refresh(); },
          }, 'Chiudi') : null,
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openStorico('criticita', row.id, row.tema) }, 'Storico'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questa criticità?')) return;
              await api.del(`/criticita/${row.id}`);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, {
      rowClass: (r) => r.scaduta ? 'row-scaduta' : (r.urgenza === 'viola' && r.stato !== 'chiusa' && r.giorni_rimanenti !== null && r.giorni_rimanenti <= 3 ? 'row-warn' : ''),
      emptyLabel: 'Nessuna criticità in questo filtro.',
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });

    // ridisegna i filtri per riflettere la selezione corrente
    toolbar.firstChild.innerHTML = '';
    toolbar.firstChild.appendChild(pillFilter('aperta', 'Aperte'));
    toolbar.firstChild.appendChild(pillFilter('', 'Tutte'));
    toolbar.firstChild.appendChild(pillFilter('chiusa', 'Chiuse'));
  }

  await refresh();
}
