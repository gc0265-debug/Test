import { useState, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { api } from '../../api/client';

export function DocumentoForm({ initial, onSave, onCancel }) {
  const [cantieri, setCantieri] = useState([]);
  const [form, setForm] = useState({
    title: '',
    type: 'altro',
    cantiere_id: '',
    url: '',
    notes: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  useEffect(() => {
    api.get('/cantieri').then(r => setCantieri(r?.data || [])).catch(() => {});
  }, []);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({ ...form, cantiere_id: form.cantiere_id || null });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Titolo documento *
        <input className="input" value={form.title} onChange={set('title')} required placeholder="es. Contratto appalto principale" />
      </label>
      <div className="form-row">
        <label>Tipologia
          <select className="input" value={form.type} onChange={set('type')}>
            <option value="contratto">Contratto</option>
            <option value="permesso">Permesso / Autorizzazione</option>
            <option value="disegno">Disegno / Progetto</option>
            <option value="verbale">Verbale</option>
            <option value="sicurezza">Sicurezza (PSC/POS)</option>
            <option value="relazione">Relazione tecnica</option>
            <option value="altro">Altro</option>
          </select>
        </label>
        <label>Cantiere
          <select className="input" value={form.cantiere_id || ''} onChange={set('cantiere_id')}>
            <option value="">Nessun cantiere</option>
            {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
      </div>
      <label>URL / Link documento
        <input className="input" value={form.url} onChange={set('url')} type="url" placeholder="https://..." />
      </label>
      <label>Note
        <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Riferimenti, revisioni, scadenze..." rows={2} />
      </label>
      <label>Tag
        <TagInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn btn-primary">Salva</button>
      </div>
    </form>
  );
}
