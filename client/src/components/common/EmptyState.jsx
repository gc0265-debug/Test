export function EmptyState({ message = 'Nessun elemento trovato', onAdd, addLabel }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {onAdd && <button className="btn btn-primary" onClick={onAdd}>{addLabel || 'Aggiungi'}</button>}
    </div>
  );
}
