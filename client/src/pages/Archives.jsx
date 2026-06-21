import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { FilterBar } from '../components/common/FilterBar';
import { ItemCard } from '../components/common/ItemCard';
import { EmptyState } from '../components/common/EmptyState';

export function Archives() {
  const [filters, setFilters] = useState({ original_type: '', search: '', tag: '' });

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/archives?${query}`, [query]);

  const items = data?.data || [];

  async function handleDelete(id) {
    if (!confirm('Eliminare definitivamente questo elemento dall\'archivio?')) return;
    await api.delete(`/archives/${id}`);
    refetch();
  }

  async function handleRestore(id) {
    await api.post(`/archives/${id}/restore`);
    refetch();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Archives</h1>
      </div>
      <div className="filter-bar">
        <input
          type="search"
          placeholder="Cerca..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          value={filters.original_type}
          onChange={e => setFilters(f => ({ ...f, original_type: e.target.value }))}
        >
          <option value="">Tutti i tipi</option>
          <option value="project">Project</option>
          <option value="area">Area</option>
          <option value="resource">Resource</option>
        </select>
        <input
          type="text"
          placeholder="Filtra per tag..."
          value={filters.tag}
          onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}
        />
      </div>
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessun elemento archiviato." />
          : <div className="cards-grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="archive"
                  onRestore={() => handleRestore(item.id)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
    </div>
  );
}
