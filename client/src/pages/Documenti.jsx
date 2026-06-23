import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { DocumentoForm } from '../components/forms/DocumentoForm';

const TYPE_LABELS = {
  contratto: 'Contratto',
  permesso: 'Permesso',
  disegno: 'Disegno',
  verbale: 'Verbale',
  sicurezza: 'Sicurezza',
  relazione: 'Relazione',
  altro: 'Altro',
};

export function Documenti() {
  const [filters, setFilters] = useState({ type: '', search: '', tag: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/documenti?${query}`, [query]);

  const items = data?.data || [];

  async function handleSave(form) {
    if (editing) {
      await api.put(`/documenti/${editing.id}`, form);
    } else {
      await api.post('/documenti', form);
    }
    setEditing(null);
    setCreating(false);
    refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo documento?')) return;
    await api.delete(`/documenti/${id}`);
    refetch();
  }

  function close() { setEditing(null); setCreating(false); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Documenti</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuovo documento</button>
      </div>
      <div className="filter-bar">
        <input
          type="search"
          placeholder="Cerca..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
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
          ? <EmptyState message="Nessun documento trovato." onAdd={() => setCreating(true)} addLabel="Aggiungi documento" />
          : <div className="cards-grid">
              {items.map(item => (
                <DocumentoCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifica documento' : 'Nuovo documento'} onClose={close}>
          <DocumentoForm initial={editing} onSave={handleSave} onCancel={close} />
        </Modal>
      )}
    </div>
  );
}

function DocumentoCard({ item, onEdit, onDelete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  return (
    <div className="item-card item-card--documento">
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        <span className="badge badge--documento">{TYPE_LABELS[item.type] || item.type}</span>
      </div>
      {item.cantiere_name && <p className="item-card__meta">Cantiere: {item.cantiere_name}</p>}
      {item.notes && <p className="item-card__desc">{item.notes}</p>}
      {item.url && (
        <a className="item-card__url" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
      )}
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
