import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { GiornaleForm } from '../components/forms/GiornaleForm';

const WEATHER_ICON = {
  sereno: '☀️',
  nuvoloso: '⛅',
  pioggia: '🌧️',
  vento: '💨',
  neve: '❄️',
};

export function Giornale() {
  const [filters, setFilters] = useState({ search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/giornale?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/giornale/${editing.id}`, form);
    } else {
      await api.post('/giornale', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo log di cantiere?')) return;
    await api.delete(`/giornale/${id}`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Giornale di Cantiere</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuovo log</button>
      </div>
      <div className="filter-bar">
        <input
          type="search"
          placeholder="Cerca..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Filtra per tag..."
          value={filters.tag}
          onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}
        />
      </div>
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessun log registrato." onAdd={() => setCreating(true)} addLabel="Nuovo log" />
          : <div className="cards-grid">
              {items.map(item => (
                <GiornaleCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica log' : 'Nuovo log di cantiere'} onClose={close}>
          <GiornaleForm initial={editing} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function GiornaleCard({ item, onEdit, onDelete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  return (
    <div className="item-card item-card--giornale">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.date}</h3>
        <span className="weather-icon" title={item.weather}>{WEATHER_ICON[item.weather] || '☀️'}</span>
      </div>
      {item.cantiere_name && <p className="item-card__meta">Cantiere: {item.cantiere_name}</p>}
      <p className="item-card__meta">Operai presenti: <strong>{item.workers_count}</strong></p>
      {item.activities && (
        <div>
          <p className="item-card__meta" style={{ marginBottom: 4 }}>Lavorazioni svolte:</p>
          <p className="item-card__desc">{item.activities}</p>
        </div>
      )}
      {item.issues && (
        <div>
          <p className="item-card__meta" style={{ marginBottom: 4, color: '#ef4444' }}>Problematiche:</p>
          <p className="item-card__desc">{item.issues}</p>
        </div>
      )}
      {item.notes && <p className="item-card__desc">{item.notes}</p>}
      {tags.length > 0 && (
        <div className="item-card__tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div className="item-card__actions">
        <button className="btn btn-sm" onClick={onEdit}>Modifica</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}
