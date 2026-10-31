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
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true }),
    'Il nome con cui il documento compare nell\'elenco.'));
  form.appendChild(field('Tipo', select('tipo', tipoOptions, existing?.tipo ?? 'altro'),
    'Classificazione libera, personalizzabile da Impostazioni.'));
  form.appendChild(field('Link (URL)', textInput('url', existing?.url ?? '', { placeholder: 'https://…' }),
    'Link esterno (es. cartella condivisa), in aggiunta o in alternativa al file caricato sotto.'));

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
  form.appendChild(field('Note', textarea('note', existing?.note ?? ''),
    'Annotazioni libere, visibili solo qui.'));
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

// Documento Word scritto direttamente in app (editor Quill, caricato via
// CDN in index.html) invece che caricato da file esterno: il contenuto
// viene convertito in un vero .docx sul server (vedi
// server/utils/deltaToDocx.js) e salvato come un documento normale, con
// in più il Delta originale che permette di riaprirlo per modificarlo.
function openEditorWord(existing, onSaved) {
  if (typeof window.Quill === 'undefined') {
    toast('Editor Word non disponibile: ricarica la pagina (connessione assente al primo caricamento?).', { error: true });
    return;
  }

  const form = el('form', {});
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? '', { required: true }),
    'Diventa anche il nome del file .docx generato.'));
  const tipoSelect = select('tipo', [['altro', 'Altro']], existing?.tipo ?? 'altro');
  form.appendChild(field('Tipo', tipoSelect, 'Classificazione libera, personalizzabile da Impostazioni.'));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '', { rows: 2 }),
    'Annotazioni libere, visibili solo qui — non fanno parte del testo del documento.'));

  form.appendChild(el('label', {}, 'Testo del documento'));
  const editorHost = el('div', { class: 'doc-editor' });
  form.appendChild(editorHost);
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
    'Scritto qui, salvato come file .docx vero e proprio: si scarica e si apre in Word come qualunque altro documento, e resta anche modificabile da questa scheda.'));

  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea documento'),
  ]));

  openModal(existing ? 'Modifica documento Word' : 'Nuovo documento Word', form, { wide: true });

  // Il modulo Quill va creato dopo che il nodo è nel DOM (misura l'altezza).
  const quill = new window.Quill(editorHost, {
    theme: 'snow',
    modules: { toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote'],
      ['clean'],
    ] },
  });
  if (existing?.contenuto_editor) {
    try { quill.setContents(JSON.parse(existing.contenuto_editor)); } catch { /* contenuto non leggibile, editor vuoto */ }
  }

  // Aggiorna la lista "Tipo" con quella reale appena disponibile (il
  // select sopra parte con un solo valore per non ritardare l'apertura
  // dell'editor, che è la parte più lenta a inizializzare).
  getCategoria('documenti_tipo').then((lista) => {
    const opts = toOptions(lista);
    const valoreAttuale = tipoSelect.value;
    tipoSelect.innerHTML = '';
    opts.forEach(([v, label]) => {
      const o = el('option', { value: v }, label);
      if (String(v) === String(valoreAttuale)) o.selected = true;
      tipoSelect.appendChild(o);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const delta = quill.getContents();
    const payload = {
      titolo: form.titolo.value,
      tipo: tipoSelect.value,
      note: form.note.value || null,
      delta,
    };
    if (!existing) payload.commessa_id = state.commessaId;
    try {
      if (existing) await api.put(`/documenti/${existing.id}/autore`, payload);
      else await api.post('/documenti/autore', payload);
      closeModal();
      toast(existing ? 'Documento aggiornato.' : 'Documento Word creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
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
      soloLettura ? null : el('button', { class: 'btn', onclick: () => openEditorWord(null, refresh) }, '+ Scrivi documento Word'),
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
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => apriModifica(row) }, row.contenuto_editor ? 'Modifica testo' : 'Modifica'),
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
      onRowClick: (row) => apriModifica(row),
      selection: { selectedId, onSelect: (id) => { selectedId = id; refresh(); } },
    });

    function apriModifica(row) {
      if (row.contenuto_editor) openEditorWord(row, refresh);
      else openForm(row, refresh);
    }
  }

  await refresh();
}
