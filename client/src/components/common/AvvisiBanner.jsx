import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export function AvvisiBanner() {
  const { data } = useApi('/avvisi');
  const avvisi = data?.data || [];

  if (avvisi.length === 0) return null;

  return (
    <div className="avvisi">
      {avvisi.map(a => (
        <div key={a.id} className={`avviso avviso--${a.livello}`} role="status">
          <div className="avviso__testo">
            <strong className="avviso__titolo">{a.titolo}</strong>
            <span className="avviso__messaggio">{a.messaggio}</span>
          </div>
          {a.azione && (
            <Link className="btn btn-primary btn-sm" to={a.azione.percorso}>
              {a.azione.etichetta} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
