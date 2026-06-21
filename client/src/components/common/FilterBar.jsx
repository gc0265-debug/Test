export function FilterBar({ filters, onChange, statusOptions }) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        placeholder="Cerca..."
        value={filters.search || ''}
        onChange={e => onChange({ ...filters, search: e.target.value })}
      />
      {statusOptions && (
        <select
          value={filters.status || ''}
          onChange={e => onChange({ ...filters, status: e.target.value })}
        >
          <option value="">Tutti gli status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <input
        type="text"
        placeholder="Filtra per tag..."
        value={filters.tag || ''}
        onChange={e => onChange({ ...filters, tag: e.target.value })}
      />
    </div>
  );
}
