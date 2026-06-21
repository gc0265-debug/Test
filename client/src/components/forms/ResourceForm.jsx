import { useState } from 'react';
import { TagInput } from '../common/TagInput';

export function ResourceForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    topic: '',
    url: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="form">
      <label>Titolo *
        <input className="input" value={form.title} onChange={set('title')} required />
      </label>
      <label>Descrizione
        <textarea className="input" value={form.description} onChange={set('description')} />
      </label>
      <label>Topic
        <input className="input" value={form.topic} onChange={set('topic')} placeholder="es. produttività, JavaScript..." />
      </label>
      <label>URL
        <input className="input" type="url" value={form.url} onChange={set('url')} placeholder="https://..." />
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
