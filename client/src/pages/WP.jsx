import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';

export function WP() {
  const [filters, setFilters] = useState({ cantiere_id: '', search: '' });
  const [cantieri] = useApiSimple('/cantieri');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/wp?${query}`, [query]);
  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) await api.put(`/wp/${editing.id}`, form);
    else await api.post('/wp', form);
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo Work Package? Le lavorazioni associate verranno scollegate.')) return;
    await api.delete(`/wp/${id}`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Work Package</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuovo WP</button>
      </div>
      <div className="filter-bar">
        <select className="input" value={filters.cantiere_id} onChange={e => setFilters(f => ({ ...f, cantiere_id: e.target.value }))}>
          <option value="">Tutti i cantieri</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessun Work Package trovato." onAdd={() => setCreating(true)} addLabel="Crea WP" />
          : <div className="cards-grid">
              {items.map(item => (
                <WPCard key={item.id} item={item} onEdit={() => setEditing(item)} onDelete={() => handleDelete(item.id)} />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica Work Package' : 'Nuovo Work Package'} onClose={close}>
          <WPForm initial={editing} cantieri={cantieri} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function useApiSimple(url) {
  const { data } = useApi(url, []);
  return [data?.data || []];
}

function WPCard({ item, onEdit, onDelete }) {
  return (
    <div className="item-card item-card--wp">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        <StatusBadge status={item.status} />
      </div>
      {item.cantiere_name && <p className="item-card__meta">Cantiere: {item.cantiere_name}</p>}
      {item.lavorazioni_count > 0 && <p className="item-card__meta">Lavorazioni: {item.lavorazioni_count}</p>}
      {item.description && <p className="item-card__desc">{item.description}</p>}
      {item.start_date && <p className="item-card__meta">Inizio: {item.start_date}{item.end_date ? ` — Fine: ${item.end_date}` : ''}</p>}
      <div className="item-card__actions">
        <button className="btn btn-sm" onClick={onEdit}>Modifica</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}

function WPForm({ initial, cantieri, onSave, onCancel }) {
  const [form, setForm] = useState({
    cantiere_id: '',
    title: '',
    description: '',
    status: 'attivo',
    start_date: '',
    end_date: '',
    notes: '',
    ...initial,
  });

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.cantiere_id || !form.title) return alert('Cantiere e titolo sono obbligatori');
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Cantiere *
        <select className="input" value={form.cantiere_id} onChange={set('cantiere_id')} required>
          <option value="">Seleziona cantiere...</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      <label>Titolo WP *
        <input className="input" value={form.title} onChange={set('title')} placeholder="Es. WP-01 Camere piano 3" required />
      </label>
      <label>Descrizione
        <textarea className="input" value={form.description} onChange={set('description')} rows={2} />
      </label>
      <div className="form-row">
        <label>Stato
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="attivo">Attivo</option>
            <option value="sospeso">Sospeso</option>
            <option value="completato">Completato</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Data inizio
          <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
        </label>
        <label>Data fine prevista
          <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
        </label>
      </div>
      <label>Note
        <textarea className="input" value={form.notes} onChange={set('notes')} rows={2} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn btn-primary">Salva</button>
      </div>
    </form>
  );
}
