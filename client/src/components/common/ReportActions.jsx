import { useState } from 'react';
import { api } from '../../api/client';

const TIPI = [
  { id: 'presenze', label: 'Report presenze', desc: 'Chi era in cantiere, dove e a fare cosa' },
  { id: 'giornale', label: 'Giornale completo', desc: 'Presenze, materiali, NC, spese e tempi' },
];

export function ReportActions({ giornaleId, data }) {
  const [tipo, setTipo] = useState(null);
  const [testo, setTesto] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiato, setCopiato] = useState(false);

  async function genera(t) {
    if (tipo === t) { setTipo(null); return; }
    setLoading(true);
    setCopiato(false);
    try {
      const r = await api.get(`/chiusura/${giornaleId}/report?tipo=${t}`);
      setTesto(r.testo);
      setTipo(t);
    } catch {
      alert('Non è stato possibile generare il report. Riprovare.');
    } finally {
      setLoading(false);
    }
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      alert('Copia non riuscita. Seleziona il testo e copialo manualmente.');
    }
  }

  const oggetto = tipo === 'presenze'
    ? `Report presenze — ${data}`
    : `Giornale di cantiere — ${data}`;

  return (
    <div className="report-bar">
      <div className="report-bar__buttons">
        {TIPI.map(t => (
          <button
            key={t.id}
            className={`btn${tipo === t.id ? ' btn-primary' : ''}`}
            onClick={() => genera(t.id)}
            disabled={loading}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tipo && (
        <div className="report-panel">
          <textarea
            className="report-panel__text"
            value={testo}
            onChange={e => setTesto(e.target.value)}
            rows={16}
            spellCheck={false}
            aria-label="Testo del report, modificabile prima dell'invio"
          />
          <p className="report-panel__hint">
            Puoi modificare il testo qui sopra prima di inviarlo.
          </p>
          <div className="report-panel__actions">
            <button className="btn btn-primary" onClick={copia}>
              {copiato ? 'Copiato ✓' : 'Copia testo'}
            </button>
            <a
              className="btn btn-success"
              href={`https://wa.me/?text=${encodeURIComponent(testo)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp ↗
            </a>
            <a
              className="btn"
              href={`mailto:?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`}
            >
              Email ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
