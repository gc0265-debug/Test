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
          <option value="">Tutti gli stati</option>
          {statusOptions.map(s => {
            const value = typeof s === 'string' ? s : s.value;
            const label = typeof s === 'string' ? s : s.label;
            return <option key={value} value={value}>{label}</option>;
          })}
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
