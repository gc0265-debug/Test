import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';

const WEATHER_ICON = {
  sereno: '☀️',
  nuvoloso: '⛅',
  pioggia: '🌧️',
  vento: '💨',
  neve: '❄️',
};

export function Giornale() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', cantiere_id: '' });

  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).toString();
  const { data, loading, refetch } = useApi(`/giornale?${query}`, [query]);
  const { data: cantieriData } = useApi('/cantieri');

  const items = data?.data || [];
  const cantieri = cantieriData?.data || [];

  async function handleDelete(id) {
    if (!confirm('Eliminare questa chiusura giornata? Verranno eliminati anche presenze, spese e materiali collegati.')) return;
    await api.delete(`/giornale/${id}`);
    refetch();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Giornale di Cantiere</h1>
        <button className="btn btn-primary" onClick={() => navigate('/chiusura')}>+ Chiudi giornata</button>
      </div>
      <div className="filter-bar">
        <input
          type="search"
          placeholder="Cerca attività, note..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          value={filters.cantiere_id}
          onChange={e => setFilters(f => ({ ...f, cantiere_id: e.target.value }))}
        >
          <option value="">Tutti i cantieri</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      {loading ? <div className="page-loading">Caricamento...</div> : (
        items.length === 0
          ? <EmptyState message="Nessuna chiusura registrata." onAdd={() => navigate('/chiusura')} addLabel="Chiudi giornata" />
          : <div className="cards-grid">
              {items.map(item => (
                <GiornaleCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
      )}
    </div>
  );
}

function GiornaleCard({ item, onDelete }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);
  const hasNcAperte = item.n_nc > 0;

  return (
    <div className="item-card item-card--giornale">
      <div className="item-card__header">
        <div>
          <h3>{item.date} <span style={{ fontSize: '1rem' }}>{WEATHER_ICON[item.weather] || '☀️'}</span></h3>
          {item.cantiere_name && <p className="item-card__meta" style={{ margin: 0 }}>{item.cantiere_name}</p>}
        </div>
      </div>

      <div className="chiusura-kpi-row">
        <span className="chiusura-kpi chiusura-kpi--presenze" title="Presenze">
          👷 {item.n_presenze}
        </span>
        <span className="chiusura-kpi chiusura-kpi--spese" title="Spese">
          💶 {item.n_spese > 0 ? `€ ${Number(item.totale_spese).toFixed(0)}` : '—'}
        </span>
        <span className="chiusura-kpi chiusura-kpi--materiali" title="Materiali ricevuti">
          📦 {item.n_materiali}
        </span>
        {hasNcAperte && (
          <span className="chiusura-kpi chiusura-kpi--nc" title="Non Conformità">
            ⚠️ {item.n_nc} NC
          </span>
        )}
      </div>

      {item.activities && (
        <p className="item-card__desc">{item.activities}</p>
      )}
      {item.notes && (
        <p className="item-card__desc" style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>{item.notes}</p>
      )}
      {tags.length > 0 && (
        <div className="item-card__tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div className="item-card__actions">
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}
