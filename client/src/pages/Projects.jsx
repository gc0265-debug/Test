import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { ItemCard } from '../components/common/ItemCard';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { ProjectForm } from '../components/forms/ProjectForm';

export function Projects() {
  const [filters, setFilters] = useState({ status: 'active', search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/projects?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/projects/${editing.id}`, form);
    } else {
      await api.post('/projects', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo progetto?')) return;
    await api.delete(`/projects/${id}`);
    refetch();
  }

  async function handleComplete(id) {
    if (!confirm('Completare e archiviare questo progetto?')) return;
    await api.post(`/projects/${id}/complete`);
    refetch();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuovo</button>
      </div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={['active', 'on-hold', 'completed']}
      />
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessun progetto trovato." onAdd={() => setCreating(true)} addLabel="Crea progetto" />
          : <div className="cards-grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="project"
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                  onComplete={() => handleComplete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica progetto' : 'Nuovo progetto'} onClose={() => { setEditing(null); setCreating(false); }}>
          <ProjectForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setCreating(false); }}
          />
        </Modal>
      )}
    </div>
  );
}
