import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';

function minuti(n) {
  const v = Number(n || 0);
  if (v < 60) return `${Math.round(v)} min`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function KPI() {
  const [search, setSearch] = useState('');
  const [aperto, setAperto] = useState(null);

  const query = search ? `?tipo_arredo=${encodeURIComponent(search)}` : '';
  const { data, loading } = useApi(`/kpi/tempi${query}`, [query]);
  const righe = data?.data || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">KPI Tempi di montaggio</h1>
          <p className="page-subtitle">
            Lo storico che alimenta le stime. Ogni rilevazione registrata in chiusura giornata entra qui e non viene mai sovrascritta.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Cerca tipologia di arredo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div className="page-loading">Caricamento...</div> : (
        righe.length === 0
          ? <EmptyState message={search ? 'Nessuna tipologia corrisponde alla ricerca.' : 'Nessuna rilevazione registrata. I tempi si raccolgono al passo 6 della chiusura giornata.'} />
          : (
            <>
              <div className="table-scroll">
                <table className="detail-table kpi-table">
                  <thead>
                    <tr>
                      <th>Tipologia di arredo</th>
                      <th className="num">Campioni</th>
                      <th className="num">Pezzi totali</th>
                      <th className="num">Media min/pz</th>
                      <th className="num">Minimo</th>
                      <th className="num">Massimo</th>
                      <th className="num">Stima 10 pz</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map(r => {
                      const spread = r.max_minuti - r.min_minuti;
                      const affidabile = r.campioni >= 3;
                      return (
                        <tr key={r.tipo_arredo}>
                          <td><strong>{r.tipo_arredo}</strong></td>
                          <td className="num">
                            <span className={`pill ${affidabile ? 'pill--ok' : 'pill--weak'}`} title={affidabile ? 'Base statistica sufficiente' : 'Pochi campioni: stima da usare con cautela'}>
                              {r.campioni}
                            </span>
                          </td>
                          <td className="num">{r.totale_pezzi}</td>
                          <td className="num"><strong>{r.minuti_per_pezzo}</strong></td>
                          <td className="num">{Math.round(r.min_minuti)}</td>
                          <td className="num">{Math.round(r.max_minuti)}</td>
                          <td className="num">{minuti(r.minuti_per_pezzo * 10)}</td>
                          <td className="num">
                            <button
                              className="btn btn-sm"
                              onClick={() => setAperto(aperto === r.tipo_arredo ? null : r.tipo_arredo)}
                            >
                              {aperto === r.tipo_arredo ? 'Chiudi' : 'Dettaglio'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="kpi-note">
                La colonna <strong>Campioni</strong> dice quante rilevazioni stanno dietro alla media.
                Sotto le tre rilevazioni il dato è indicativo: lo spread fra minimo e massimo conta più della media.
              </p>

              {aperto && <Dettaglio tipo={aperto} />}
            </>
          )
      )}
    </div>
  );
}

function Dettaglio({ tipo }) {
  const { data, loading } = useApi(`/kpi/tempi/dettaglio?tipo_arredo=${encodeURIComponent(tipo)}`, [tipo]);
  const righe = data?.data || [];

  return (
    <section className="detail-section" style={{ borderLeftColor: 'var(--color-tempi)' }}>
      <h2 className="detail-section__title">Rilevazioni — {tipo}</h2>
      {loading ? <p className="detail-empty">Caricamento...</p> : (
        righe.length === 0 ? <p className="detail-empty">Nessuna rilevazione.</p> : (
          <div className="table-scroll">
            <table className="detail-table">
              <thead>
                <tr><th>Data</th><th>Cantiere</th><th>Lavorazione</th><th className="num">Pezzi</th><th className="num">Durata</th><th className="num">Min/pz</th><th>Note</th></tr>
              </thead>
              <tbody>
                {righe.map(r => (
                  <tr key={r.id}>
                    <td className="num">{r.date || '—'}</td>
                    <td>{r.cantiere_name || '—'}</td>
                    <td>{r.lavorazione_name || '—'}</td>
                    <td className="num">{r.quantita}</td>
                    <td className="num">{r.durata_minuti} min</td>
                    <td className="num"><strong>{r.quantita > 0 ? Math.round(r.durata_minuti / r.quantita) : r.durata_minuti}</strong></td>
                    <td>{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
