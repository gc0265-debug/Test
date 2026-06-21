import { useState, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { api } from '../../api/client';

export function ProjectForm({ initial, onSave, onCancel }) {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal: '',
    deadline: '',
    status: 'active',
    area_id: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  useEffect(() => {
    api.get('/areas').then(r => setAreas(r?.data || [])).catch(() => {});
  }, []);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({ ...form, area_id: form.area_id || null });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Titolo *
        <input className="input" value={form.title} onChange={set('title')} required />
      </label>
      <label>Descrizione
        <textarea className="input" value={form.description} onChange={set('description')} />
      </label>
      <label>Obiettivo
        <input className="input" value={form.goal} onChange={set('goal')} />
      </label>
      <label>Scadenza
        <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
      </label>
      <label>Status
        <select className="input" value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="on-hold">On hold</option>
        </select>
      </label>
      <label>Area
        <select className="input" value={form.area_id || ''} onChange={set('area_id')}>
          <option value="">Nessuna area</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
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
