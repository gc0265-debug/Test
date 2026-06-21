import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { StatsCard } from '../components/dashboard/StatsCard';
import { CategoryWidget } from '../components/dashboard/CategoryWidget';

export function Dashboard() {
  const { data, loading } = useApi('/dashboard');
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Caricamento...</div>;
  if (!data) return null;

  const { counts, activeProjects, recentArchives } = data;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <div className="stats-grid">
        <StatsCard label="Progetti attivi" count={counts.projects} type="project" onClick={() => navigate('/projects')} />
        <StatsCard label="Aree" count={counts.areas} type="area" onClick={() => navigate('/areas')} />
        <StatsCard label="Risorse" count={counts.resources} type="resource" onClick={() => navigate('/resources')} />
        <StatsCard label="Archivio" count={counts.archives} type="archive" onClick={() => navigate('/archives')} />
      </div>
      <div className="widgets-grid">
        <CategoryWidget
          title="Progetti attivi recenti"
          items={activeProjects}
          linkTo="/projects"
          emptyText="Nessun progetto attivo. Premi + per crearne uno!"
        />
        <CategoryWidget
          title="Archiviati di recente"
          items={recentArchives}
          linkTo="/archives"
          emptyText="Nessun elemento archiviato."
        />
      </div>
    </div>
  );
}
