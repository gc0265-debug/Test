import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { ItemCard } from '../components/common/ItemCard';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { CantiereForm } from '../components/forms/CantiereForm';

export function Cantieri() {
  const [filters, setFilters] = useState({ status: 'active', search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/cantieri?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/cantieri/${editing.id}`, form);
    } else {
      await api.post('/cantieri', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo cantiere?')) return;
    await api.delete(`/cantieri/${id}`);
    refetch();
  }

  async function handleComplete(id) {
    if (!confirm('Chiudere e archiviare questo cantiere?')) return;
    await api.post(`/cantieri/${id}/complete`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Cantieri</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuovo cantiere</button>
      </div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: 'active', label: 'Attivo' },
          { value: 'suspended', label: 'Sospeso' },
        ]}
      />
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessun cantiere trovato." onAdd={() => setCreating(true)} addLabel="Crea cantiere" />
          : <div className="cards-grid">
              {items.map(item => (
                <CantiereCard
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
        <Modal title={editing ? 'Modifica cantiere' : 'Nuovo cantiere'} onClose={close}>
          <CantiereForm initial={editing} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function CantiereCard({ item, onEdit, onDelete, onComplete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  return (
    <div className="item-card item-card--cantiere">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        <span className={`badge badge-${item.status}`}>
          {item.status === 'active' ? 'Attivo' : item.status === 'suspended' ? 'Sospeso' : 'Completato'}
        </span>
      </div>
      {item.client && <p className="item-card__meta">Cliente: {item.client}</p>}
      {item.address && <p className="item-card__meta">Indirizzo: {item.address}</p>}
      <div className="item-card__meta-row">
        {item.start_date && <span>Inizio: {item.start_date}</span>}
        {item.end_date && <span>Fine: {item.end_date}</span>}
        {item.budget && <span>Budget: €{Number(item.budget).toLocaleString('it-IT')}</span>}
      </div>
      {item.notes && <p className="item-card__desc">{item.notes}</p>}
      {tags.length > 0 && (
        <div className="item-card__tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div className="item-card__actions">
        <button className="btn btn-sm" onClick={onEdit}>Modifica</button>
        <button className="btn btn-sm btn-success" onClick={onComplete}>Chiudi ✓</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}
