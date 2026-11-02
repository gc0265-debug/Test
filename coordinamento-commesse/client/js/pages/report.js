// Report configurabili: una selezione salvata di sezioni (registri),
// filtrabile per Work Package e periodo, da rigenerare in PDF/Word/Excel
// o inviare via email senza dover ricostruire ogni volta lo stesso export
// a mano. I dati di ogni sezione vengono raccolti sul server (vedi
// server/utils/reportSezioni.js), coerenti fra i tre formati.

import { api } from '../api.js';
import { state } from '../state.js';
import {
  el, field, textInput, dateInput, select, formData,
  openModal, closeModal, toast, confirmDialog, renderTable, formatDate, settingsGear, fasciaFissa,
} from '../components/ui.js';

let SEZIONI_DISPONIBILI = [];

async function openForm(existing, onSaved) {
  if (!SEZIONI_DISPONIBILI.length) {
    SEZIONI_DISPONIBILI = (await api.get('/report-config/sezioni')).data;
  }
  const wpRes = await api.get(`/commesse/${state.commessaId}/wp`);
  const wpOptions = [['', 'Tutti i Work Package'], ...wpRes.data.map((w) => [w.id, `${w.codice} ${w.nome}`])];
  const sezioniSelezionate = new Set(existing?.sezioni ?? []);

  const form = el('form', {});
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true, placeholder: 'es. Report mensile SAC' }),
    'Il nome con cui questo report compare nell\'elenco, e il nome di base del file generato.'));

  form.appendChild(el('label', {}, 'Sezioni incluse'));
  const checkbox = {};
  const list = el('div', { class: 'checkbox-list', style: 'max-height:260px' }, SEZIONI_DISPONIBILI.map((s) => {
    const cb = el('input', { type: 'checkbox', checked: sezioniSelezionate.has(s.key) });
    checkbox[s.key] = cb;
    return el('label', { class: 'checkbox-list__item' }, [cb, s.label]);
  }));
  form.appendChild(list);
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
    'Ogni sezione selezionata diventa una tabella nel report, nell\'ordine in cui compare qui sopra.'));

  form.appendChild(field('Work package', select('wp_id', wpOptions, existing?.wp_id ?? ''),
    'Limita tutte le sezioni selezionate a un solo Work Package. Lascia su "Tutti" per includerli tutti.'));
  form.appendChild(el('div', { class: 'field--row' }, [
    field('Periodo da', dateInput('periodo_da', existing?.periodo_da ?? ''), 'Filtra le sezioni che hanno una data (es. apertura criticità, invio drawing). Lascia vuoto per non filtrare.'),
    field('Periodo a', dateInput('periodo_a', existing?.periodo_a ?? ''), 'Estremo superiore del periodo, incluso.'),
  ]));

  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea report'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.sezioni = SEZIONI_DISPONIBILI.map((s) => s.key).filter((k) => checkbox[k].checked);
    if (!data.sezioni.length) { toast('Seleziona almeno una sezione.', { error: true }); return; }
    if (!existing) data.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/report-config/${existing.id}`, data);
      else await api.post('/report-config', data);
      closeModal();
      toast(existing ? 'Report aggiornato.' : 'Report creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica report' : 'Nuovo report', form, { wide: true });
}

function openInvioEmail(report) {
  const form = el('form', {});
  form.appendChild(field('Destinatari', textInput('destinatari', '', { required: true, placeholder: 'es. direttore@fieldproject.it, pm@gili.it' }),
    'Uno o più indirizzi separati da virgola.'));
  form.appendChild(el('label', {}, 'Formati da allegare'));
  const fPdf = el('input', { type: 'checkbox', checked: true });
  const fDocx = el('input', { type: 'checkbox' });
  const fXlsx = el('input', { type: 'checkbox' });
  form.appendChild(el('div', { class: 'checkbox-list', style: 'max-height:none' }, [
    el('label', { class: 'checkbox-list__item' }, [fPdf, 'PDF']),
    el('label', { class: 'checkbox-list__item' }, [fDocx, 'Word (.docx)']),
    el('label', { class: 'checkbox-list__item' }, [fXlsx, 'Excel (.xlsx)']),
  ]));
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
    'Richiede un server SMTP configurato nel file .env (vedi .env.example) — lo stesso usato dalle notifiche di scadenza.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Invia'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formati = [fPdf.checked && 'pdf', fDocx.checked && 'docx', fXlsx.checked && 'xlsx'].filter(Boolean);
    if (!formati.length) { toast('Seleziona almeno un formato.', { error: true }); return; }
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try {
      const res = await api.post(`/report-config/${report.id}/email`, { destinatari: form.destinatari.value, formati });
      closeModal();
      toast(`Report inviato a: ${res.destinatari.join(', ')}`);
    } catch (err) {
      toast(err.message, { error: true });
      submitBtn.disabled = false;
    }
  });
  openModal(`Invia "${report.nome}" via email`, form);
}

export async function renderReport(container) {
  if (!state.commessaId) {
    container.appendChild(el('p', { class: 'muted' },
      state.gruppoAttivo
        ? 'I Report si configurano su una singola commessa: seleziona una commessa specifica dal menu a sinistra.'
        : 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const sticky = fasciaFissa(container, []);
  sticky.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Report salvati che aggregano una o più sezioni, filtrabili per Work Package e periodo: si scaricano in PDF, Word o Excel, o si inviano via email in allegato.'));

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo report'),
      settingsGear(),
    ]),
  ]);
  sticky.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const res = await api.get(`/report-config?commessa_id=${state.commessaId}`);
    renderTable(tableHost, [
      { key: 'nome', label: 'Nome' },
      { key: 'sezioni', label: 'Sezioni', render: (r) => `${r.sezioni.length}` },
      { key: 'wp', label: 'Work package', render: (r) => (r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : 'Tutti') },
      { key: 'periodo', label: 'Periodo', render: (r) => (r.periodo_da || r.periodo_a) ? `${r.periodo_da ? formatDate(r.periodo_da) : '…'} → ${r.periodo_a ? formatDate(r.periodo_a) : '…'}` : 'Tutto' },
      {
        key: 'export', label: 'Esporta', className: 'actions',
        render: (r) => el('div', { style: 'display:flex;gap:6px' }, [
          el('a', { class: 'btn btn--sm btn--ghost', href: `/api/report-config/${r.id}/pdf` }, 'PDF'),
          el('a', { class: 'btn btn--sm btn--ghost', href: `/api/report-config/${r.id}/docx` }, 'Word'),
          el('a', { class: 'btn btn--sm btn--ghost', href: `/api/report-config/${r.id}/xlsx` }, 'Excel'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openInvioEmail(r) }, 'Email'),
        ]),
      },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(`Eliminare il report "${row.nome}"?`)) return;
              await api.del(`/report-config/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, {
      emptyLabel: 'Nessun report configurato per questa commessa.',
      onRowClick: (row) => openForm(row, refresh),
    });
  }

  await refresh();
}
