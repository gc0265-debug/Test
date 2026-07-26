import { useNavigate, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { StatsCard } from '../components/dashboard/StatsCard';

export function Dashboard() {
  const { data, loading } = useApi('/dashboard');
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Caricamento...</div>;
  if (!data) return null;

  const { counts, recentChiusure, ncAperte } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate('/chiusura')}>
          Chiudi giornata →
        </button>
      </div>

      <div className="stats-grid">
        <StatsCard label="Cantieri attivi"      count={counts.cantieri}        type="cantiere"    onClick={() => navigate('/cantieri')} />
        <StatsCard label="WP attivi"            count={counts.wp_attivi}       type="lavorazione" onClick={() => navigate('/wp')} />
        <StatsCard label="Lavorazioni in corso" count={counts.lavorazioni}     type="lavorazione" onClick={() => navigate('/lavorazioni')} />
        <StatsCard label="Presenze oggi"        count={counts.presenze_oggi}   type="maestranza"  onClick={() => navigate('/giornale')} />
        <StatsCard label="NC aperte"            count={counts.nc_aperte}       type="documento"   onClick={() => navigate('/giornale')} />
        <StatsCard label="KPI tempi (campioni)" count={counts.tempi_campioni}  type="archive"     onClick={() => navigate('/kpi')} />
      </div>

      <div className="widgets-grid">
        <div className="category-widget">
          <div className="category-widget__header">
            <h3>Ultime chiusure</h3>
            <Link to="/giornale" className="link-all">Vedi tutte →</Link>
          </div>
          {recentChiusure.length === 0
            ? <p className="empty-text">Nessuna chiusura registrata.</p>
            : <ul className="widget-list">
                {recentChiusure.map(g => (
                  <li key={g.id} className="widget-list__item">
                    <Link to={`/giornale/${g.id}`} className="card-link" style={{ flex: 1, marginRight: 8 }}>
                      {g.cantiere_name} — {g.date}
                    </Link>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {g.n_presenze}p {g.n_nc > 0 ? `· ${g.n_nc} NC` : ''}
                    </span>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="category-widget">
          <div className="category-widget__header">
            <h3>NC aperte</h3>
          </div>
          {ncAperte.length === 0
            ? <p className="empty-text">Nessuna NC aperta.</p>
            : <ul className="widget-list">
                {ncAperte.map(nc => (
                  <li key={nc.id} className="widget-list__item">
                    <Link to={`/giornale/${nc.giornale_id}`} className="card-link" style={{ flex: 1, marginRight: 8 }}>
                      {nc.codice_nc ? <strong>{nc.codice_nc}</strong> : null} {nc.descrizione}
                    </Link>
                    <span style={{ color: 'var(--color-nc)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{nc.stato}</span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>
    </div>
  );
}
