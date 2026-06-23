import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { MaestranzaForm } from '../components/forms/MaestranzaForm';

export function Maestranze() {
  const [filters, setFilters] = useState({ status: 'attivo', search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/maestranze?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/maestranze/${editing.id}`, form);
    } else {
      await api.post('/maestranze', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa maestranza?')) return;
    await api.delete(`/maestranze/${id}`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Maestranze</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Aggiungi</button>
      </div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: 'attivo', label: 'Attivo' },
          { value: 'inattivo', label: 'Inattivo' },
        ]}
      />
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessuna maestranza trovata." onAdd={() => setCreating(true)} addLabel="Aggiungi maestranza" />
          : <div className="cards-grid">
              {items.map(item => (
                <MaestranzaCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica maestranza' : 'Nuova maestranza'} onClose={close}>
          <MaestranzaForm initial={editing} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function MaestranzaCard({ item, onEdit, onDelete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  return (
    <div className="item-card item-card--maestranza">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        <StatusBadge status={item.status} />
      </div>
      {item.role && <p className="item-card__meta">Ruolo: {item.role}</p>}
      {item.company && <p className="item-card__meta">Impresa: {item.company}</p>}
      {item.phone && <p className="item-card__meta">Tel: {item.phone}</p>}
      {item.qualifications && <p className="item-card__desc">{item.qualifications}</p>}
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
