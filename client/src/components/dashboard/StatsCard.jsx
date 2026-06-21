export function StatsCard({ label, count, type, onClick }) {
  return (
    <div className={`stats-card stats-card--${type}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <span className="stats-card__count">{count}</span>
      <span className="stats-card__label">{label}</span>
    </div>
  );
}
