import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const ETICHETTE_TABELLE = {
  cantieri: 'Cantieri',
  work_packages: 'Work Package',
  lavorazioni: 'Lavorazioni',
  giornale: 'Giornate chiuse',
  presenze: 'Presenze',
  spese: 'Spese',
  materiali: 'Materiali ricevuti',
  nc_riferimenti: 'Non conformità',
  tempi_montaggio: 'Tempi di montaggio',
  maestranze: 'Maestranze',
  documenti: 'Documenti',
  archives: 'Archivio',
};

export function Impostazioni() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Impostazioni</h1>
          <p className="page-subtitle">Promemoria di chiusura e backup dei dati.</p>
        </div>
      </div>
      <Promemoria />
      <Backup />
    </div>
  );
}

function Promemoria() {
  const { data, loading } = useApi('/impostazioni');
  const [form, setForm] = useState(null);
  const [stato, setStato] = useState(null);

  useEffect(() => {
    if (data?.dati) setForm(data.dati);
  }, [data]);

  async function salva() {
    setStato('salvataggio');
    try {
      await api.put('/impostazioni', form);
      setStato('salvato');
      setTimeout(() => setStato(null), 2500);
    } catch (e) {
      setStato('errore');
    }
  }

  if (loading || !form) return <div className="page-loading">Caricamento...</div>;

  const attivo = form.promemoria_chiusura_attivo === '1';

  return (
    <section className="detail-section" style={{ borderLeftColor: 'var(--color-primary)' }}>
      <h2 className="detail-section__title">Promemoria di chiusura giornata</h2>
      <p className="impostazioni-desc">
        Se a fine turno non hai ancora registrato la chiusura, la dashboard te lo segnala.
        Il controllo avviene all'apertura dell'applicazione: non arriva nessuna notifica al telefono.
      </p>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={attivo}
          onChange={e => setForm(f => ({ ...f, promemoria_chiusura_attivo: e.target.checked ? '1' : '0' }))}
        />
        <span>Avvisami se non ho chiuso la giornata</span>
      </label>

      {attivo && (
        <>
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>A partire dalle
              <input
                className="input"
                type="time"
                value={form.promemoria_chiusura_ora}
                onChange={e => setForm(f => ({ ...f, promemoria_chiusura_ora: e.target.value }))}
              />
            </label>
          </div>
          <label className="checkbox-label" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={form.promemoria_salta_weekend === '1'}
              onChange={e => setForm(f => ({ ...f, promemoria_salta_weekend: e.target.checked ? '1' : '0' }))}
            />
            <span>Non avvisarmi sabato e domenica</span>
          </label>
        </>
      )}

      {data?.fuso && (
        <p className="impostazioni-nota">
          Orario di riferimento: <strong>{data.fuso.zona}</strong> — per il server adesso
          sono le {data.fuso.ora} del {data.fuso.data}.
        </p>
      )}

      <div className="report-panel__actions">
        <button className="btn btn-primary" onClick={salva} disabled={stato === 'salvataggio'}>
          {stato === 'salvataggio' ? 'Salvataggio...' : stato === 'salvato' ? 'Salvato ✓' : 'Salva'}
        </button>
        {stato === 'errore' && <span className="impostazioni-errore">Salvataggio non riuscito. Riprovare.</span>}
      </div>
    </section>
  );
}

function Backup() {
  const { data, loading, refetch } = useApi('/export');
  const tabelle = data?.tabelle || [];
  const totale = tabelle.reduce((s, t) => s + t.righe, 0);

  return (
    <section className="detail-section" style={{ borderLeftColor: 'var(--color-materiali)' }}>
      <h2 className="detail-section__title">Backup ed esportazione</h2>
      <p className="impostazioni-desc">
        Il file JSON contiene l'intero archivio in un solo documento: è quello da caricare
        su kDrive. I CSV servono a rileggere una singola tabella in Excel, non a ricostruire
        il database.
      </p>

      <div className="report-panel__actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <a className="btn btn-primary" href="/api/export/backup.json">
          Scarica backup completo (JSON)
        </a>
        <button className="btn" onClick={refetch} disabled={loading}>Aggiorna conteggi</button>
      </div>

      {loading ? <p className="detail-empty">Caricamento...</p> : (
        <div className="table-scroll">
          <table className="detail-table">
            <thead>
              <tr><th>Contenuto</th><th className="num">Righe</th><th className="num">CSV</th></tr>
            </thead>
            <tbody>
              {tabelle.map(t => (
                <tr key={t.nome}>
                  <td>{ETICHETTE_TABELLE[t.nome] || t.nome}</td>
                  <td className="num">{t.righe}</td>
                  <td className="num">
                    {t.righe > 0
                      ? <a className="btn btn-sm" href={`/api/export/${t.nome}.csv`}>Scarica</a>
                      : <span className="detail-empty">vuoto</span>}
                  </td>
                </tr>
              ))}
              <tr className="detail-table__total">
                <td>Totale</td>
                <td className="num">{totale}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="impostazioni-nota">
        Il backup è una fotografia del momento in cui lo scarichi. Su Railway i dati vivono
        su un volume persistente, ma il volume non è un backup: una copia periodica su kDrive
        è ciò che ti protegge davvero.
      </p>
    </section>
  );
}
