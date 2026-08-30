import { useState, useEffect } from 'react';
import { api } from '../api/client';

// Data locale del dispositivo: toISOString() darebbe UTC e a tarda sera
// proporrebbe la data del giorno prima.
const today = new Date().toLocaleDateString('en-CA');
const STEPS = ['Cantiere', 'Presenze', 'Spese', 'Materiali', 'NC', 'Tempi', 'Riepilogo'];

export function ChiusuraGiornata() {
  const [step, setStep] = useState(0);
  const [cantieri, setCantieri] = useState([]);
  const [lavorazioni, setLavorazioni] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    cantiere_id: '',
    date: today,
    weather: 'sereno',
    activities: '',
    notes: '',
    presenze: [],
    spese: [],
    materiali: [],
    nc_riferimenti: [],
    tempi_montaggio: [],
  });

  useEffect(() => {
    api.get('/cantieri').then(r => setCantieri(r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.cantiere_id) {
      api.get(`/lavorazioni?cantiere_id=${form.cantiere_id}`).then(r => setLavorazioni(r?.data || [])).catch(() => {});
    }
  }, [form.cantiere_id]);

  function setField(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function addItem(field, item) {
    setForm(f => ({ ...f, [field]: [...f[field], item] }));
  }

  function removeItem(field, idx) {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  }

  function updateItem(field, idx, updates) {
    setForm(f => ({
      ...f,
      [field]: f[field].map((item, i) => i === idx ? { ...item, ...updates } : item),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.post('/chiusura', form);
      setSaved(true);
    } catch (e) {
      alert('Errore durante il salvataggio. Riprovare.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) return <SuccessScreen onNew={() => { setSaved(false); setStep(0); setForm({ cantiere_id: '', date: today, weather: 'sereno', activities: '', notes: '', presenze: [], spese: [], materiali: [], nc_riferimenti: [], tempi_montaggio: [] }); }} />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Chiusura Giornata</h1>
        <span className="tag">Passo {step + 1} di {STEPS.length}</span>
      </div>

      <StepNav steps={STEPS} current={step} onChange={setStep} />

      <div className="wizard-body">
        {step === 0 && <StepCantiere form={form} cantieri={cantieri} setField={setField} />}
        {step === 1 && <StepPresenze items={form.presenze} onAdd={() => addItem('presenze', { persona: '', impresa: '', zona: '', attivita: '', ora_entrata: '', ora_uscita: '' })} onRemove={i => removeItem('presenze', i)} onUpdate={(i, u) => updateItem('presenze', i, u)} />}
        {step === 2 && <StepSpese items={form.spese} onAdd={() => addItem('spese', { descrizione: '', importo: '', categoria: 'altro', fornitore: '' })} onRemove={i => removeItem('spese', i)} onUpdate={(i, u) => updateItem('spese', i, u)} />}
        {step === 3 && <StepMateriali items={form.materiali} onAdd={() => addItem('materiali', { descrizione: '', quantita: '', unita: '', fornitore: '', conforme: true })} onRemove={i => removeItem('materiali', i)} onUpdate={(i, u) => updateItem('materiali', i, u)} />}
        {step === 4 && <StepNC items={form.nc_riferimenti} onAdd={() => addItem('nc_riferimenti', { descrizione: '', codice_nc: '', link_esterno: '', stato: 'aperta' })} onRemove={i => removeItem('nc_riferimenti', i)} onUpdate={(i, u) => updateItem('nc_riferimenti', i, u)} />}
        {step === 5 && <StepTempi items={form.tempi_montaggio} lavorazioni={lavorazioni} onAdd={() => addItem('tempi_montaggio', { tipo_arredo: '', quantita: 1, durata_minuti: '', lavorazione_id: '', note: '' })} onRemove={i => removeItem('tempi_montaggio', i)} onUpdate={(i, u) => updateItem('tempi_montaggio', i, u)} />}
        {step === 6 && <StepRiepilogo form={form} cantieri={cantieri} />}
      </div>

      <div className="wizard-nav">
        {step > 0 && <button className="btn" onClick={() => setStep(s => s - 1)}>← Indietro</button>}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.cantiere_id}>
            Avanti →
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Chiudi giornata ✓'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepNav({ steps, current, onChange }) {
  return (
    <div className="step-nav">
      {steps.map((s, i) => (
        <button
          key={s}
          className={`step-dot${i === current ? ' step-dot--active' : ''}${i < current ? ' step-dot--done' : ''}`}
          onClick={() => onChange(i)}
          title={s}
        >
          {i < current ? '✓' : i + 1}
          <span className="step-label">{s}</span>
        </button>
      ))}
    </div>
  );
}

function StepCantiere({ form, cantieri, setField }) {
  return (
    <div className="step">
      <h2 className="step-title">Cantiere e data</h2>
      <label>Cantiere *
        <select className="input" value={form.cantiere_id} onChange={setField('cantiere_id')} required>
          <option value="">Seleziona cantiere...</option>
          {cantieri.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      <div className="form-row">
        <label>Data
          <input className="input" type="date" value={form.date} onChange={setField('date')} />
        </label>
        <label>Meteo
          <select className="input" value={form.weather} onChange={setField('weather')}>
            <option value="sereno">Sereno</option>
            <option value="nuvoloso">Nuvoloso</option>
            <option value="pioggia">Pioggia</option>
            <option value="vento">Vento</option>
            <option value="neve">Neve</option>
          </select>
        </label>
      </div>
      <label>Sintesi attività giornaliere
        <textarea className="input" value={form.activities} onChange={setField('activities')} rows={3} placeholder="Breve riepilogo delle attività svolte..." />
      </label>
      <label>Note generali
        <textarea className="input" value={form.notes} onChange={setField('notes')} rows={2} placeholder="Osservazioni, comunicazioni, altro..." />
      </label>
    </div>
  );
}

function StepPresenze({ items, onAdd, onRemove, onUpdate }) {
  return (
    <div className="step">
      <h2 className="step-title">Presenze personale</h2>
      <p className="step-desc">Registra il personale presente per impresa, zona e attività svolta.</p>
      {items.map((p, i) => (
        <div key={i} className="list-item-card">
          <div className="list-item-card__header">
            <strong>Presenza {i + 1}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
          <div className="form-row">
            <label>Persona *
              <input className="input" value={p.persona} onChange={e => onUpdate(i, { persona: e.target.value })} placeholder="Nome e cognome" />
            </label>
            <label>Impresa
              <input className="input" value={p.impresa} onChange={e => onUpdate(i, { impresa: e.target.value })} placeholder="Fornitore / azienda" />
            </label>
          </div>
          <div className="form-row">
            <label>Zona di lavoro
              <input className="input" value={p.zona} onChange={e => onUpdate(i, { zona: e.target.value })} placeholder="Es. Piano 3, Area A" />
            </label>
            <label>Attività svolta
              <input className="input" value={p.attivita} onChange={e => onUpdate(i, { attivita: e.target.value })} placeholder="Es. Montaggio cucine" />
            </label>
          </div>
          <div className="form-row">
            <label>Ora entrata
              <input className="input" type="time" value={p.ora_entrata} onChange={e => onUpdate(i, { ora_entrata: e.target.value })} />
            </label>
            <label>Ora uscita
              <input className="input" type="time" value={p.ora_uscita} onChange={e => onUpdate(i, { ora_uscita: e.target.value })} />
            </label>
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={onAdd}>+ Aggiungi presenza</button>
    </div>
  );
}

function StepSpese({ items, onAdd, onRemove, onUpdate }) {
  const CAT = ['materiale', 'trasporto', 'vitto', 'attrezzatura', 'altro'];
  return (
    <div className="step">
      <h2 className="step-title">Spese di cantiere</h2>
      <p className="step-desc">Registra le spese sostenute oggi.</p>
      {items.map((s, i) => (
        <div key={i} className="list-item-card">
          <div className="list-item-card__header">
            <strong>Spesa {i + 1}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
          <div className="form-row">
            <label>Descrizione *
              <input className="input" value={s.descrizione} onChange={e => onUpdate(i, { descrizione: e.target.value })} placeholder="Descrizione spesa" />
            </label>
            <label>Importo (€)
              <input className="input" type="number" step="0.01" value={s.importo} onChange={e => onUpdate(i, { importo: e.target.value })} placeholder="0,00" />
            </label>
          </div>
          <div className="form-row">
            <label>Categoria
              <select className="input" value={s.categoria} onChange={e => onUpdate(i, { categoria: e.target.value })}>
                {CAT.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </label>
            <label>Fornitore
              <input className="input" value={s.fornitore} onChange={e => onUpdate(i, { fornitore: e.target.value })} placeholder="Nome fornitore" />
            </label>
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={onAdd}>+ Aggiungi spesa</button>
    </div>
  );
}

function StepMateriali({ items, onAdd, onRemove, onUpdate }) {
  return (
    <div className="step">
      <h2 className="step-title">Ricezione materiali</h2>
      <p className="step-desc">Registra i materiali ricevuti in cantiere oggi.</p>
      {items.map((m, i) => (
        <div key={i} className="list-item-card">
          <div className="list-item-card__header">
            <strong>Materiale {i + 1}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
          <div className="form-row">
            <label>Descrizione *
              <input className="input" value={m.descrizione} onChange={e => onUpdate(i, { descrizione: e.target.value })} placeholder="Descrizione materiale / arredo" />
            </label>
            <label>Fornitore
              <input className="input" value={m.fornitore} onChange={e => onUpdate(i, { fornitore: e.target.value })} placeholder="Fornitore" />
            </label>
          </div>
          <div className="form-row">
            <label>Quantità
              <input className="input" type="number" value={m.quantita} onChange={e => onUpdate(i, { quantita: e.target.value })} />
            </label>
            <label>Unità
              <input className="input" value={m.unita} onChange={e => onUpdate(i, { unita: e.target.value })} placeholder="pz, ml, kg..." />
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={m.conforme !== false} onChange={e => onUpdate(i, { conforme: e.target.checked })} />
            <span>Materiale conforme all'ordine</span>
          </label>
          {m.conforme === false && (
            <label>Note non conformità materiale
              <input className="input" value={m.note || ''} onChange={e => onUpdate(i, { note: e.target.value })} placeholder="Descrivere la difformità..." />
            </label>
          )}
        </div>
      ))}
      <button className="btn btn-primary" onClick={onAdd}>+ Aggiungi materiale</button>
    </div>
  );
}

function StepNC({ items, onAdd, onRemove, onUpdate }) {
  return (
    <div className="step">
      <h2 className="step-title">Riferimenti Non Conformità</h2>
      <p className="step-desc">Registra le NC aperte oggi nell'app dedicata. Inserisci codice e link di riferimento.</p>
      {items.map((nc, i) => (
        <div key={i} className="list-item-card">
          <div className="list-item-card__header">
            <strong>NC {i + 1}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
          <label>Descrizione *
            <input className="input" value={nc.descrizione} onChange={e => onUpdate(i, { descrizione: e.target.value })} placeholder="Breve descrizione della NC" />
          </label>
          <div className="form-row">
            <label>Codice NC
              <input className="input" value={nc.codice_nc} onChange={e => onUpdate(i, { codice_nc: e.target.value })} placeholder="Es. NC-2024-001" />
            </label>
            <label>Stato
              <select className="input" value={nc.stato} onChange={e => onUpdate(i, { stato: e.target.value })}>
                <option value="aperta">Aperta</option>
                <option value="in-lavorazione">In lavorazione</option>
                <option value="chiusa">Chiusa</option>
              </select>
            </label>
          </div>
          <label>Link app esterna
            <input className="input" value={nc.link_esterno} onChange={e => onUpdate(i, { link_esterno: e.target.value })} placeholder="URL riferimento nell'app NC" />
          </label>
        </div>
      ))}
      <button className="btn btn-primary" onClick={onAdd}>+ Aggiungi riferimento NC</button>
    </div>
  );
}

function StepTempi({ items, lavorazioni, onAdd, onRemove, onUpdate }) {
  return (
    <div className="step">
      <h2 className="step-title">Tempi di montaggio</h2>
      <p className="step-desc">Registra i tempi per tipologia di arredo. Alimentano il database KPI per le stime future.</p>
      {items.map((t, i) => (
        <div key={i} className="list-item-card">
          <div className="list-item-card__header">
            <strong>Rilevazione {i + 1}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
          <div className="form-row">
            <label>Tipo arredo *
              <input className="input" value={t.tipo_arredo} onChange={e => onUpdate(i, { tipo_arredo: e.target.value })} placeholder="Es. Armadio scorrevole, Cucina angolare" />
            </label>
            <label>Lavorazione
              <select className="input" value={t.lavorazione_id} onChange={e => onUpdate(i, { lavorazione_id: e.target.value })}>
                <option value="">— Nessuna —</option>
                {lavorazioni.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>Quantità pezzi
              <input className="input" type="number" min="1" value={t.quantita} onChange={e => onUpdate(i, { quantita: e.target.value })} />
            </label>
            <label>Durata totale (minuti) *
              <input className="input" type="number" min="1" value={t.durata_minuti} onChange={e => onUpdate(i, { durata_minuti: e.target.value })} placeholder="Es. 90" />
            </label>
          </div>
          {t.quantita && t.durata_minuti && (
            <p className="step-desc" style={{ color: 'var(--color-primary)' }}>
              → {Math.round(t.durata_minuti / t.quantita)} min/pezzo
            </p>
          )}
          <label>Note
            <input className="input" value={t.note} onChange={e => onUpdate(i, { note: e.target.value })} placeholder="Condizioni particolari, difficoltà..." />
          </label>
        </div>
      ))}
      <button className="btn btn-primary" onClick={onAdd}>+ Aggiungi rilevazione</button>
    </div>
  );
}

function StepRiepilogo({ form, cantieri }) {
  const cantiere = cantieri.find(c => String(c.id) === String(form.cantiere_id));
  const totaleSpese = form.spese.reduce((s, e) => s + (parseFloat(e.importo) || 0), 0);

  return (
    <div className="step">
      <h2 className="step-title">Riepilogo chiusura</h2>
      <div className="riepilogo-grid">
        <RiepilogoCard label="Cantiere" value={cantiere?.title || '—'} />
        <RiepilogoCard label="Data" value={form.date} />
        <RiepilogoCard label="Meteo" value={form.weather} />
        <RiepilogoCard label="Presenze" value={`${form.presenze.length} persone`} color="var(--color-presenze)" />
        <RiepilogoCard label="Spese" value={`${form.spese.length} voci — € ${totaleSpese.toFixed(2)}`} color="var(--color-spese)" />
        <RiepilogoCard label="Materiali ricevuti" value={`${form.materiali.length} voci`} color="var(--color-materiali)" />
        <RiepilogoCard label="NC registrate" value={`${form.nc_riferimenti.length} riferimenti`} color="var(--color-nc)" />
        <RiepilogoCard label="Tempi montaggio" value={`${form.tempi_montaggio.length} rilevazioni`} color="var(--color-tempi)" />
      </div>
      {form.activities && (
        <div className="riepilogo-note">
          <strong>Attività:</strong> {form.activities}
        </div>
      )}
      {form.notes && (
        <div className="riepilogo-note">
          <strong>Note:</strong> {form.notes}
        </div>
      )}
    </div>
  );
}

function RiepilogoCard({ label, value, color }) {
  return (
    <div className="riepilogo-card" style={{ borderLeftColor: color || 'var(--color-border)' }}>
      <div className="riepilogo-card__label">{label}</div>
      <div className="riepilogo-card__value">{value}</div>
    </div>
  );
}

function SuccessScreen({ onNew }) {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24 }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Giornata chiusa correttamente</h2>
      <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>Tutti i dati sono stati registrati.</p>
      <button className="btn btn-primary" onClick={onNew}>Nuova chiusura</button>
    </div>
  );
}
