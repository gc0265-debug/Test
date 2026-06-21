import { useState } from 'react';
import { TagInput } from '../common/TagInput';

export function AreaForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    responsibility: '',
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
      <label>Standard da mantenere
        <textarea className="input" value={form.responsibility} onChange={set('responsibility')} placeholder="Qual è lo standard che vuoi mantenere in quest'area?" />
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
