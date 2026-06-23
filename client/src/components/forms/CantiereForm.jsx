import { useState } from 'react';
import { TagInput } from '../common/TagInput';

export function CantiereForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    address: '',
    client: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({
      ...form,
      budget: form.budget ? Number(form.budget) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Nome cantiere *
        <input className="input" value={form.title} onChange={set('title')} required placeholder="es. Ristrutturazione Via Roma" />
      </label>
      <label>Cliente
        <input className="input" value={form.client} onChange={set('client')} placeholder="Nome cliente o committente" />
      </label>
      <label>Indirizzo
        <input className="input" value={form.address} onChange={set('address')} placeholder="Via, numero, città" />
      </label>
      <div className="form-row">
        <label>Data inizio
          <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
        </label>
        <label>Data fine prevista
          <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
        </label>
      </div>
      <div className="form-row">
        <label>Budget (€)
          <input className="input" type="number" value={form.budget} onChange={set('budget')} placeholder="0.00" min="0" step="0.01" />
        </label>
        <label>Stato
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="active">Attivo</option>
            <option value="suspended">Sospeso</option>
          </select>
        </label>
      </div>
      <label>Note
        <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Informazioni aggiuntive..." />
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
