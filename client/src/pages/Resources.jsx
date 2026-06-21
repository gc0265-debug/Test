import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { ItemCard } from '../components/common/ItemCard';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { ResourceForm } from '../components/forms/ResourceForm';

export function Resources() {
  const [filters, setFilters] = useState({ search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/resources?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/resources/${editing.id}`, form);
    } else {
      await api.post('/resources', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa risorsa?')) return;
    await api.delete(`/resources/${id}`);
    refetch();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Resources</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuova</button>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessuna risorsa trovata." onAdd={() => setCreating(true)} addLabel="Crea risorsa" />
          : <div className="cards-grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="resource"
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica risorsa' : 'Nuova risorsa'} onClose={() => { setEditing(null); setCreating(false); }}>
          <ResourceForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setCreating(false); }}
          />
        </Modal>
      )}
    </div>
  );
}
