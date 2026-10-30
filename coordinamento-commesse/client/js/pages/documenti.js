// Documenti — link esterno e/o file caricato dal browser (in aggiunta,
// non in alternativa: una riga può avere entrambi, uno solo, o nessuno).

import { api } from '../api.js';
import { state, queryScopeCommessa, inVistaGruppo } from '../state.js';
import { el, field, textInput, textarea, select, openModal, closeModal, toast, confirmDialog, renderTable, settingsGear } from '../components/ui.js';
import { printReport } from '../components/report.js';
import { getCategoria, toMap, toOptions } from '../components/categorie.js';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function openForm(existing, onSaved) {
  const tipoOptions = toOptions(await getCategoria('documenti_tipo'));

  const form = el('form', {});
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true })));
  form.appendChild(field('Tipo', select('tipo', tipoOptions, existing?.tipo ?? 'altro')));
  form.appendChild(field('Link (URL)', textInput('url', existing?.url ?? '', { placeholder: 'https://…' })));

  const fileInput = el('input', { type: 'file', name: 'file' });
  form.appendChild(field('File', fileInput, existing?.file_nome
    ? `File attuale: ${existing.file_nome} (${formatSize(existing.file_size)})`
    : 'Carica un file dal tuo computer (PDF, immagine, Word, Excel... max 25 MB).'));
  if (existing?.file_nome) {
    form.appendChild(el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:11.5px;color:var(--ink-2);margin:-8px 0 14px' }, [
      el('input', { type: 'checkbox', name: 'rimuovi_file' }),
      'Rimuovi il file attuale',
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
      if (existing) await api.putForm(`/documenti/${existing.id}`, fd);
      else await api.postForm('/documenti', fd);
      closeModal();
      toast(existing ? 'Documento aggiornato.' : 'Documento creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica documento' : 'Nuovo documento', form);
}

export async function renderDocumenti(container) {
  if (!state.commessaId && !state.gruppoAttivo) {
    container.appendChild(el('p', { class: 'muted' }, 'Seleziona prima una commessa dal menu a sinistra.'));
    return;
  }
  const soloLettura = inVistaGruppo();
  if (soloLettura) {
    container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
      'Vista aggregata di gruppo: clicca una riga per modificarla. Per creare un nuovo documento, seleziona prima una singola commessa dal menu a sinistra.'));
  }

  let lastRows = [];
  let tipoMap = {};
  let selectedId = null;
  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'btn btn--sm', onclick: () => {
        const rows = selectedId ? lastRows.filter((r) => String(r.id) === String(selectedId)) : lastRows;
        printReport('Documenti', soloLettura ? { codice: state.gruppoAttivo, nome: 'tutte le commesse' } : state.commesse.find(c => c.id === state.commessaId), [{
          heading: 'Elenco documenti',
          columns: ['Titolo', 'Tipo', 'Link', 'File', 'Note'],
          rows: rows.map((r) => [r.titolo, tipoMap[r.tipo] || r.tipo, r.url || '—', r.file_nome || '—', r.note || '—']),
        }]);
      } }, 'Stampa'),
      soloLettura ? null : el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo documento'),
      settingsGear(),
    ]),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const [res, tipoList] = await Promise.all([
      api.get(`/documenti?${queryScopeCommessa()}`),
      getCategoria('documenti_tipo'),
    ]);
    tipoMap = toMap(tipoList);
    const TIPO = tipoMap;
    lastRows = res.data;
    renderTable(tableHost, [
      soloLettura ? { key: 'commessa_codice', label: 'Commessa', render: (r) => r.commessa_codice || '—' } : null,
      { key: 'titolo', label: 'Titolo' },
      { key: 'tipo', label: 'Tipo', render: (r) => TIPO[r.tipo] || r.tipo },
      { key: 'url', label: 'Link', render: (r) => r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener' }, 'Apri link ↗') : '—' },
      { key: 'file', label: 'File', render: (r) => r.file_path ? el('a', { href: `/api/documenti/${r.id}/file`, class: 'btn btn--sm btn--ghost' }, `⬇ ${r.file_nome} (${formatSize(r.file_size)})`) : '—' },
      { key: 'note', label: 'Note' },
      soloLettura ? null : {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo documento? Se è presente un file, viene rimosso anche dal server.')) return;
              await api.del(`/documenti/${row.id}`);
              toast('Eliminato.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ].filter(Boolean), res.data, {
      emptyLabel: 'Nessun documento registrato per questa commessa.',
      onRowClick: (row) => openForm(row, refresh),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });
  }

  await refresh();
}
