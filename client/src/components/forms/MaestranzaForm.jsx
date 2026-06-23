import { useState } from 'react';
import { TagInput } from '../common/TagInput';

export function MaestranzaForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    role: '',
    company: '',
    phone: '',
    status: 'attivo',
    qualifications: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Nome *
        <input className="input" value={form.title} onChange={set('title')} required placeholder="Nome e cognome" />
      </label>
      <div className="form-row">
        <label>Ruolo / Qualifica
          <input className="input" value={form.role} onChange={set('role')} placeholder="es. Muratore, Carpentiere" />
        </label>
        <label>Impresa
          <input className="input" value={form.company} onChange={set('company')} placeholder="Impresa di appartenenza" />
        </label>
      </div>
      <div className="form-row">
        <label>Telefono
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+39 ..." type="tel" />
        </label>
        <label>Stato
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="attivo">Attivo</option>
            <option value="inattivo">Inattivo</option>
          </select>
        </label>
      </div>
      <label>Qualifiche / Abilitazioni
        <textarea className="input" value={form.qualifications} onChange={set('qualifications')} placeholder="Patentini, corsi sicurezza, specializzazioni..." rows={2} />
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
