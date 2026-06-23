import { useState, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { api } from '../../api/client';

const today = new Date().toISOString().split('T')[0];

export function GiornaleForm({ initial, onSave, onCancel }) {
  const [cantieri, setCantieri] = useState([]);
  const [form, setForm] = useState({
    cantiere_id: '',
    date: today,
    weather: 'sereno',
    workers_count: 0,
    activities: '',
    issues: '',
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
    if (!form.cantiere_id) return alert('Seleziona un cantiere');
    await onSave({ ...form, workers_count: Number(form.workers_count) });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Cantiere *
        <select className="input" value={form.cantiere_id || ''} onChange={set('cantiere_id')} required>
          <option value="">Seleziona cantiere...</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      <div className="form-row">
        <label>Data
          <input className="input" type="date" value={form.date} onChange={set('date')} required />
        </label>
        <label>Meteo
          <select className="input" value={form.weather} onChange={set('weather')}>
            <option value="sereno">☀️ Sereno</option>
            <option value="nuvoloso">⛅ Nuvoloso</option>
            <option value="pioggia">🌧️ Pioggia</option>
            <option value="vento">💨 Vento</option>
            <option value="neve">❄️ Neve</option>
          </select>
        </label>
      </div>
      <label>Numero operai presenti
        <input className="input" type="number" value={form.workers_count} onChange={set('workers_count')} min="0" />
      </label>
      <label>Lavorazioni svolte
        <textarea
          className="input"
          value={form.activities}
          onChange={set('activities')}
          placeholder="Descrivere le attività eseguite oggi..."
          rows={3}
        />
      </label>
      <label>Problematiche / Non conformità
        <textarea
          className="input"
          value={form.issues}
          onChange={set('issues')}
          placeholder="Segnalare eventuali problemi, ritardi, incidenti..."
          rows={2}
        />
      </label>
      <label>Note aggiuntive
        <textarea className="input" value={form.notes} onChange={set('notes')} rows={2} />
      </label>
      <label>Tag
        <TagInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn btn-primary">Salva log</button>
      </div>
    </form>
  );
}
