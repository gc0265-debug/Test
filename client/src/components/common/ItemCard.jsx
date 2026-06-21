import { StatusBadge } from './StatusBadge';

export function ItemCard({ item, type, onEdit, onDelete, onComplete, onRestore }) {
  const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || []);

  return (
    <div className={`item-card item-card--${type}`}>
      <div className="item-card__header">
        <h3 onClick={onEdit}>{item.title}</h3>
        {item.status && <StatusBadge status={item.status} />}
      </div>
      {item.description && <p className="item-card__desc">{item.description}</p>}
      {item.deadline && (
        <p className="item-card__meta">Scadenza: {item.deadline}</p>
      )}
      {item.url && (
        <a className="item-card__url" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
      )}
      {tags.length > 0 && (
        <div className="item-card__tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div className="item-card__actions">
        {onEdit && <button className="btn btn-sm" onClick={onEdit}>Modifica</button>}
        {onComplete && <button className="btn btn-sm btn-success" onClick={onComplete}>Completa ✓</button>}
        {onRestore && <button className="btn btn-sm btn-primary" onClick={onRestore}>Ripristina</button>}
        {onDelete && <button className="btn btn-sm btn-danger" onClick={onDelete}>Elimina</button>}
      </div>
    </div>
  );
}
