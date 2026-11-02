// Editor di documenti Word scritti direttamente in app (Quill, caricato
// via CDN in index.html): il contenuto viene convertito in un vero .docx
// sul server (vedi server/utils/deltaToDocx.js) e salvato come un
// documento normale nell'archivio Documenti della commessa, con in più il
// Delta originale che permette di riaprirlo per modificarlo. Condiviso fra
// la scheda Documenti (dove nasce) e qualunque altra scheda che voglia
// offrire la stessa funzione — es. Note di Coordinamento — senza dover
// passare dall'archivio.
import { api } from '../api.js';
import { state } from '../state.js';
import { el, field, textInput, textarea, select, openModal, closeModal, toast } from './ui.js';
import { getCategoria, toOptions } from './categorie.js';

function figliPerGenitore(cartelle) {
  const mappa = {};
  cartelle.forEach((c) => {
    const k = c.parent_id || 'root';
    (mappa[k] ??= []).push(c);
  });
  Object.values(mappa).forEach((arr) => arr.sort((a, b) => a.nome.localeCompare(b.nome, 'it')));
  return mappa;
}

function opzioniCartelle(cartelle) {
  const figli = figliPerGenitore(cartelle);
  const out = [];
  (function cammina(genitoreKey, profondita) {
    (figli[genitoreKey] || []).forEach((c) => {
      out.push([c.id, '　'.repeat(profondita) + c.nome]);
      cammina(c.id, profondita + 1);
    });
  }('root', 0));
  return out;
}

export function openWordEditor({ existing, cartelle = [], cartellaIdDefault = null, titoloDefault = '', onSaved }) {
  if (typeof window.Quill === 'undefined') {
    toast('Editor Word non disponibile: ricarica la pagina (connessione assente al primo caricamento?).', { error: true });
    return;
  }

  const form = el('form', {});
  if (existing) form.appendChild(el('input', { type: 'hidden', name: '_versione', value: existing.updated_at }));
  form.appendChild(field('Titolo', textInput('titolo', existing?.titolo ?? titoloDefault, { required: true }),
    'Diventa anche il nome del file .docx generato.'));
  const tipoSelect = select('tipo', [['altro', 'Altro']], existing?.tipo ?? 'altro');
  form.appendChild(field('Tipo', tipoSelect, 'Classificazione libera, personalizzabile da Impostazioni.'));
  const cartellaSelect = select('cartella_id', [['', '— cartella radice —'], ...opzioniCartelle(cartelle)],
    existing ? (existing.cartella_id ?? '') : (cartellaIdDefault ?? ''));
  form.appendChild(field('Cartella', cartellaSelect, 'Dove si trova questo documento nell\'archivio Documenti.'));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '', { rows: 2 }),
    'Annotazioni libere, visibili solo qui — non fanno parte del testo del documento.'));

  form.appendChild(el('label', {}, 'Testo del documento'));
  const editorHost = el('div', { class: 'doc-editor' });
  form.appendChild(editorHost);
  form.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
    'Scritto qui, salvato come file .docx vero e proprio nell\'archivio Documenti: si scarica e si apre in Word come qualunque altro documento, e resta anche modificabile da questa scheda.'));

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
      cartella_id: cartellaSelect.value || null,
      note: form.note.value || null,
      delta,
    };
    if (!existing) payload.commessa_id = state.commessaId;
    try {
      let documento;
      if (existing) documento = await api.put(`/documenti/${existing.id}/autore`, payload);
      else documento = await api.post('/documenti/autore', payload);
      closeModal();
      toast(existing ? 'Documento aggiornato.' : 'Documento Word creato — disponibile nella scheda Documenti.');
      onSaved(documento);
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
}
