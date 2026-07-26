import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { ReportActions } from '../components/common/ReportActions';

const WEATHER_LABEL = {
  sereno: '☀️ Sereno',
  nuvoloso: '⛅ Nuvoloso',
  pioggia: '🌧️ Pioggia',
  vento: '💨 Vento',
  neve: '❄️ Neve',
};

const STATO_NC = {
  aperta: 'Aperta',
  'in-lavorazione': 'In lavorazione',
  chiusa: 'Chiusa',
};

function euro(n) {
  return Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function GiornaleDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi(`/chiusura/${id}`, [id]);

  if (loading) return <div className="page"><div className="page-loading">Caricamento...</div></div>;
  if (!data?.giornale) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Giornata non trovata</h1></div>
        <button className="btn" onClick={() => navigate('/giornale')}>← Torna al giornale</button>
      </div>
    );
  }

  const { giornale, presenze, spese, materiali, nc_riferimenti, tempi_montaggio } = data;
  const totaleSpese = spese.reduce((s, x) => s + Number(x.importo || 0), 0);
  const materialiNonConformi = materiali.filter(m => !m.conforme).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/giornale" className="back-link">← Giornale</Link>
          <h1 className="page-title">{giornale.date}</h1>
          <p className="page-subtitle">
            {giornale.cantiere_name || 'Cantiere non indicato'} · {WEATHER_LABEL[giornale.weather] || giornale.weather}
          </p>
        </div>
      </div>

      <ReportActions giornaleId={id} data={giornale.date} />

      <div className="detail-kpis">
        <DetailKpi label="Presenze" value={presenze.length} color="var(--color-presenze)" />
        <DetailKpi label="Spese" value={`€ ${euro(totaleSpese)}`} sub={`${spese.length} voci`} color="var(--color-spese)" />
        <DetailKpi label="Materiali" value={materiali.length} sub={materialiNonConformi > 0 ? `${materialiNonConformi} non conformi` : 'tutti conformi'} color="var(--color-materiali)" />
        <DetailKpi label="Non conformità" value={nc_riferimenti.length} color="var(--color-nc)" />
        <DetailKpi label="Rilevazioni tempi" value={tempi_montaggio.length} color="var(--color-tempi)" />
      </div>

      {giornale.activities && (
        <Sezione titolo="Attività della giornata">
          <p className="detail-text">{giornale.activities}</p>
        </Sezione>
      )}

      <Sezione titolo={`Presenze (${presenze.length})`} colore="var(--color-presenze)">
        {presenze.length === 0 ? <p className="detail-empty">Nessuna presenza registrata.</p> : (
          <div className="table-scroll">
            <table className="detail-table">
              <thead>
                <tr><th>Persona</th><th>Impresa</th><th>Zona</th><th>Attività</th><th>Entrata</th><th>Uscita</th></tr>
              </thead>
              <tbody>
                {presenze.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.persona}</strong></td>
                    <td>{p.impresa || '—'}</td>
                    <td>{p.zona || '—'}</td>
                    <td>{p.attivita || '—'}</td>
                    <td className="num">{p.ora_entrata || '—'}</td>
                    <td className="num">{p.ora_uscita || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sezione>

      <Sezione titolo={`Materiali ricevuti (${materiali.length})`} colore="var(--color-materiali)">
        {materiali.length === 0 ? <p className="detail-empty">Nessun materiale registrato.</p> : (
          <div className="detail-list">
            {materiali.map(m => (
              <div key={m.id} className={`detail-row${m.conforme ? '' : ' detail-row--alert'}`}>
                <div className="detail-row__main">
                  <strong>{m.descrizione}</strong>
                  <span className={`pill ${m.conforme ? 'pill--ok' : 'pill--alert'}`}>
                    {m.conforme ? 'Conforme' : 'Non conforme'}
                  </span>
                </div>
                <div className="detail-row__meta">
                  {m.quantita ? `${m.quantita} ${m.unita || ''}`.trim() : '—'}
                  {m.fornitore ? ` · ${m.fornitore}` : ''}
                </div>
                {m.note && <p className="detail-row__note">{m.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Sezione>

      <Sezione titolo={`Non conformità (${nc_riferimenti.length})`} colore="var(--color-nc)">
        {nc_riferimenti.length === 0 ? <p className="detail-empty">Nessuna NC registrata in questa giornata.</p> : (
          <div className="detail-list">
            {nc_riferimenti.map(nc => <NCRow key={nc.id} nc={nc} onSaved={refetch} />)}
          </div>
        )}
      </Sezione>

      <Sezione titolo={`Spese (${spese.length}) — totale € ${euro(totaleSpese)}`} colore="var(--color-spese)">
        {spese.length === 0 ? <p className="detail-empty">Nessuna spesa registrata.</p> : (
          <div className="table-scroll">
            <table className="detail-table">
              <thead>
                <tr><th>Descrizione</th><th>Categoria</th><th>Fornitore</th><th className="num">Importo</th></tr>
              </thead>
              <tbody>
                {spese.map(s => (
                  <tr key={s.id}>
                    <td>{s.descrizione}</td>
                    <td>{s.categoria}</td>
                    <td>{s.fornitore || '—'}</td>
                    <td className="num">€ {euro(s.importo)}</td>
                  </tr>
                ))}
                <tr className="detail-table__total">
                  <td colSpan={3}>Totale</td>
                  <td className="num">€ {euro(totaleSpese)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Sezione>

      <Sezione titolo={`Tempi di montaggio (${tempi_montaggio.length})`} colore="var(--color-tempi)">
        {tempi_montaggio.length === 0 ? <p className="detail-empty">Nessuna rilevazione registrata.</p> : (
          <div className="table-scroll">
            <table className="detail-table">
              <thead>
                <tr><th>Tipo arredo</th><th className="num">Pezzi</th><th className="num">Durata</th><th className="num">Min/pezzo</th><th>Note</th></tr>
              </thead>
              <tbody>
                {tempi_montaggio.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.tipo_arredo}</strong></td>
                    <td className="num">{t.quantita}</td>
                    <td className="num">{t.durata_minuti} min</td>
                    <td className="num"><strong>{t.quantita > 0 ? Math.round(t.durata_minuti / t.quantita) : t.durata_minuti}</strong></td>
                    <td>{t.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sezione>

      {giornale.notes && (
        <Sezione titolo="Note">
          <p className="detail-text">{giornale.notes}</p>
        </Sezione>
      )}
    </div>
  );
}

function Sezione({ titolo, colore, children }) {
  return (
    <section className="detail-section" style={{ borderLeftColor: colore || 'var(--color-border)' }}>
      <h2 className="detail-section__title">{titolo}</h2>
      {children}
    </section>
  );
}

function DetailKpi({ label, value, sub, color }) {
  return (
    <div className="detail-kpi" style={{ borderTopColor: color }}>
      <div className="detail-kpi__value">{value}</div>
      <div className="detail-kpi__label">{label}</div>
      {sub && <div className="detail-kpi__sub">{sub}</div>}
    </div>
  );
}

function NCRow({ nc, onSaved }) {
  const [stato, setStato] = useState(nc.stato);
  const [saving, setSaving] = useState(false);

  async function cambiaStato(nuovo) {
    setStato(nuovo);
    setSaving(true);
    try {
      await api.put(`/nc/${nc.id}`, { stato: nuovo });
      onSaved();
    } catch {
      setStato(nc.stato);
      alert('Non è stato possibile aggiornare la NC. Riprovare.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`detail-row${stato === 'chiusa' ? '' : ' detail-row--alert'}`}>
      <div className="detail-row__main">
        <strong>{nc.codice_nc ? `${nc.codice_nc} — ` : ''}{nc.descrizione}</strong>
        <select
          className="input input--inline"
          value={stato}
          onChange={e => cambiaStato(e.target.value)}
          disabled={saving}
          aria-label="Stato della non conformità"
        >
          {Object.entries(STATO_NC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {nc.note && <p className="detail-row__note">{nc.note}</p>}
      {nc.link_esterno && (
        <a className="detail-row__link" href={nc.link_esterno} target="_blank" rel="noreferrer">
          Apri nell'app NC ↗
        </a>
      )}
    </div>
  );
}
