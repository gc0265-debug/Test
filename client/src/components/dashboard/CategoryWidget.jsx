import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';

export function CategoryWidget({ title, items = [], linkTo, emptyText }) {
  return (
    <div className="category-widget">
      <div className="category-widget__header">
        <h3>{title}</h3>
        <Link to={linkTo} className="link-all">Vedi tutti →</Link>
      </div>
      {items.length === 0 ? (
        <p className="empty-text">{emptyText || 'Nessun elemento'}</p>
      ) : (
        <ul className="widget-list">
          {items.map(item => (
            <li key={item.id} className="widget-list__item">
              <span>{item.title}</span>
              {item.status && <StatusBadge status={item.status} />}
              {item.original_type && <span className={`badge badge--${item.original_type}`}>{item.original_type}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
