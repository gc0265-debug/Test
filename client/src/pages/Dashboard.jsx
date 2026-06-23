import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { StatsCard } from '../components/dashboard/StatsCard';
import { CategoryWidget } from '../components/dashboard/CategoryWidget';

export function Dashboard() {
  const { data, loading } = useApi('/dashboard');
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Caricamento...</div>;
  if (!data) return null;

  const { counts, recentLavorazioni, recentLogs } = data;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <div className="stats-grid">
        <StatsCard label="Cantieri attivi"     count={counts.cantieri}       type="cantiere"    onClick={() => navigate('/cantieri')} />
        <StatsCard label="Lavorazioni in corso" count={counts.lavorazioni}    type="lavorazione" onClick={() => navigate('/lavorazioni')} />
        <StatsCard label="Log di oggi"          count={counts.giornale_oggi}  type="giornale"    onClick={() => navigate('/giornale')} />
        <StatsCard label="Maestranze attive"    count={counts.maestranze}     type="maestranza"  onClick={() => navigate('/maestranze')} />
        <StatsCard label="Documenti"            count={counts.documenti}      type="documento"   onClick={() => navigate('/documenti')} />
        <StatsCard label="Archivio"             count={counts.archives}       type="archive"     onClick={() => navigate('/archivio')} />
      </div>
      <div className="widgets-grid">
        <CategoryWidget
          title="Lavorazioni in corso"
          items={recentLavorazioni}
          linkTo="/lavorazioni"
          emptyText="Nessuna lavorazione in corso. Premi + per aggiungerne una!"
        />
        <CategoryWidget
          title="Ultimi log di cantiere"
          items={recentLogs}
          linkTo="/giornale"
          emptyText="Nessun log registrato oggi."
        />
      </div>
    </div>
  );
}
