import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { LavorazioneForm } from '../components/forms/LavorazioneForm';

export function Lavorazioni() {
  const [filters, setFilters] = useState({ status: '', search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/lavorazioni?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/lavorazioni/${editing.id}`, form);
    } else {
      await api.post('/lavorazioni', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa lavorazione?')) return;
    await api.delete(`/lavorazioni/${id}`);
    refetch();
  }

  async function handleComplete(id) {
    if (!confirm('Completare e archiviare questa lavorazione?')) return;
    await api.post(`/lavorazioni/${id}/complete`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Lavorazioni</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuova lavorazione</button>
      </div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: 'da-fare', label: 'Da fare' },
          { value: 'in-corso', label: 'In corso' },
          { value: 'bloccata', label: 'Bloccata' },
        ]}
      />
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessuna lavorazione trovata." onAdd={() => setCreating(true)} addLabel="Crea lavorazione" />
          : <div className="cards-grid">
              {items.map(item => (
                <LavorazioneCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                  onComplete={() => handleComplete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica lavorazione' : 'Nuova lavorazione'} onClose={close}>
          <LavorazioneForm initial={editing} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function LavorazioneCard({ item, onEdit, onDelete, onComplete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  return (
    <div className="item-card item-card--lavorazione">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <StatusBadge status={item.status} />
          <StatusBadge status={item.priority} />
        </div>
      </div>
      {item.cantiere_name && <p className="item-card__meta">Cantiere: {item.cantiere_name}</p>}
      {item.impresa && <p className="item-card__meta">Impresa: {item.impresa}</p>}
      {item.description && <p className="item-card__desc">{item.description}</p>}
      {item.deadline && <p className="item-card__meta">Scadenza: {item.deadline}</p>}
      {tags.length > 0 && (
        <div className="item-card__tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div className="item-card__actions">
        <button className="btn btn-sm" onClick={onEdit}>Modifica</button>
        <button className="btn btn-sm btn-success" onClick={onComplete}>Completa ✓</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}
