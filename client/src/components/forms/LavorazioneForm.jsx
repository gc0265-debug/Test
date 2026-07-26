import { useState, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { api } from '../../api/client';

export function LavorazioneForm({ initial, onSave, onCancel }) {
  const [cantieri, setCantieri] = useState([]);
  const [wps, setWps] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    cantiere_id: '',
    wp_id: '',
    status: 'da-fare',
    priority: 'media',
    deadline: '',
    impresa: '',
    tags: [],
    ...initial,
    tags: initial?.tags ? (typeof initial.tags === 'string' ? JSON.parse(initial.tags) : initial.tags) : [],
  });

  useEffect(() => {
    api.get('/cantieri').then(r => setCantieri(r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.cantiere_id) {
      api.get(`/wp?cantiere_id=${form.cantiere_id}`).then(r => setWps(r?.data || [])).catch(() => setWps([]));
    } else {
      setWps([]);
    }
  }, [form.cantiere_id]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({
      ...form,
      cantiere_id: form.cantiere_id || null,
      wp_id: form.wp_id || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Titolo lavorazione *
        <input className="input" value={form.title} onChange={set('title')} required placeholder="es. Intonacatura pareti piano terra" />
      </label>
      <label>Descrizione
        <textarea className="input" value={form.description} onChange={set('description')} placeholder="Dettagli tecnici..." />
      </label>
      <label>Cantiere
        <select className="input" value={form.cantiere_id || ''} onChange={set('cantiere_id')}>
          <option value="">Nessun cantiere</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      {form.cantiere_id && (
        <label>Work Package
          <select className="input" value={form.wp_id || ''} onChange={set('wp_id')}>
            <option value="">— Nessun WP —</option>
            {wps.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </label>
      )}
      <label>Impresa esecutrice
        <input className="input" value={form.impresa} onChange={set('impresa')} placeholder="Nome impresa" />
      </label>
      <div className="form-row">
        <label>Stato
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="da-fare">Da fare</option>
            <option value="in-corso">In corso</option>
            <option value="bloccata">Bloccata</option>
          </select>
        </label>
        <label>Priorità
          <select className="input" value={form.priority} onChange={set('priority')}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="bassa">Bassa</option>
          </select>
        </label>
      </div>
      <label>Scadenza
        <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
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
