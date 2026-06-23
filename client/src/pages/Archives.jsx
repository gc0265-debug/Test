import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';

const TYPE_LABELS = {
  cantiere: 'Cantiere',
  lavorazione: 'Lavorazione',
};

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
        <h1 className="page-title">Archivio</h1>
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
          <option value="cantiere">Cantieri</option>
          <option value="lavorazione">Lavorazioni</option>
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
                <div key={item.id} className="item-card item-card--archive">
                  <div className="item-card__header">
                    <h3>{item.title}</h3>
                    <span className={`badge badge--${item.original_type}`}>
                      {TYPE_LABELS[item.original_type] || item.original_type}
                    </span>
                  </div>
                  {item.description && <p className="item-card__desc">{item.description}</p>}
                  <p className="item-card__meta">
                    Archiviato: {new Date(item.archived_at * 1000).toLocaleDateString('it-IT')}
                  </p>
                  <div className="item-card__actions">
                    <button className="btn btn-sm btn-primary" onClick={() => handleRestore(item.id)}>Ripristina</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Elimina</button>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
