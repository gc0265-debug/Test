const db = require('../db/database');

const WEATHER_LABEL = {
  sereno: 'Sereno',
  nuvoloso: 'Nuvoloso',
  pioggia: 'Pioggia',
  vento: 'Vento',
  neve: 'Neve',
};

const STATO_NC_LABEL = {
  aperta: 'APERTA',
  'in-lavorazione': 'IN LAVORAZIONE',
  chiusa: 'CHIUSA',
};

function dataIt(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function euro(n) {
  return Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function orario(entrata, uscita) {
  if (!entrata && !uscita) return '';
  return ` (${entrata || '—'}–${uscita || '—'})`;
}

function caricaGiornata(giornaleId) {
  const giornale = db.prepare(`
    SELECT g.*, c.title as cantiere_name
    FROM giornale g LEFT JOIN cantieri c ON g.cantiere_id = c.id
    WHERE g.id = ?
  `).get(giornaleId);
  if (!giornale) return null;

  return {
    giornale,
    presenze: db.prepare('SELECT * FROM presenze WHERE giornale_id = ? ORDER BY impresa, persona').all(giornaleId),
    spese: db.prepare('SELECT * FROM spese WHERE giornale_id = ? ORDER BY created_at').all(giornaleId),
    materiali: db.prepare('SELECT * FROM materiali WHERE giornale_id = ? ORDER BY created_at').all(giornaleId),
    nc: db.prepare('SELECT * FROM nc_riferimenti WHERE giornale_id = ? ORDER BY created_at').all(giornaleId),
    tempi: db.prepare('SELECT * FROM tempi_montaggio WHERE giornale_id = ? ORDER BY created_at').all(giornaleId),
  };
}

// Report presenze — quello che il preposto invia al capo preposti del GC.
// Contiene solo il dato di presenza: chi c'è, in quale zona, cosa sta facendo.
function reportPresenze(giornaleId) {
  const d = caricaGiornata(giornaleId);
  if (!d) return null;

  const righe = [];
  righe.push(`REPORT PRESENZE — ${dataIt(d.giornale.date)}`);
  if (d.giornale.cantiere_name) righe.push(d.giornale.cantiere_name);
  righe.push('');

  if (d.presenze.length === 0) {
    righe.push('Nessuna presenza registrata.');
  } else {
    const perImpresa = new Map();
    for (const p of d.presenze) {
      const k = p.impresa || 'Impresa non indicata';
      if (!perImpresa.has(k)) perImpresa.set(k, []);
      perImpresa.get(k).push(p);
    }

    for (const [impresa, persone] of perImpresa) {
      righe.push(`${impresa} — ${persone.length} ${persone.length === 1 ? 'persona' : 'persone'}`);
      for (const p of persone) {
        righe.push(`• ${p.persona}${p.zona ? ` — ${p.zona}` : ''}${orario(p.ora_entrata, p.ora_uscita)}`);
        if (p.attivita) righe.push(`  ${p.attivita}`);
      }
      righe.push('');
    }
    righe.push(`Totale presenti: ${d.presenze.length}`);
  }

  return righe.join('\n').trim();
}

// Giornale di fine giornata — il quadro completo della giornata.
function reportGiornale(giornaleId) {
  const d = caricaGiornata(giornaleId);
  if (!d) return null;

  const righe = [];
  righe.push(`GIORNALE DI CANTIERE — ${dataIt(d.giornale.date)}`);
  if (d.giornale.cantiere_name) righe.push(d.giornale.cantiere_name);
  righe.push(`Meteo: ${WEATHER_LABEL[d.giornale.weather] || d.giornale.weather}`);

  if (d.giornale.activities) {
    righe.push('', 'ATTIVITÀ', d.giornale.activities);
  }

  righe.push('', `PRESENZE (${d.presenze.length})`);
  if (d.presenze.length === 0) {
    righe.push('Nessuna presenza registrata.');
  } else {
    for (const p of d.presenze) {
      const dettagli = [p.impresa, p.zona].filter(Boolean).join(' — ');
      righe.push(`• ${p.persona}${dettagli ? ` — ${dettagli}` : ''}${orario(p.ora_entrata, p.ora_uscita)}`);
      if (p.attivita) righe.push(`  ${p.attivita}`);
    }
  }

  if (d.materiali.length > 0) {
    righe.push('', `MATERIALI RICEVUTI (${d.materiali.length})`);
    for (const m of d.materiali) {
      const qta = m.quantita ? ` — ${m.quantita}${m.unita ? ' ' + m.unita : ''}` : '';
      const stato = m.conforme ? 'conforme' : '*** NON CONFORME ***';
      righe.push(`• ${m.descrizione}${qta}${m.fornitore ? ` — ${m.fornitore}` : ''} — ${stato}`);
      if (m.note) righe.push(`  ${m.note}`);
    }
  }

  if (d.nc.length > 0) {
    righe.push('', `NON CONFORMITÀ (${d.nc.length})`);
    for (const nc of d.nc) {
      righe.push(`• ${nc.codice_nc ? nc.codice_nc + ' ' : ''}[${STATO_NC_LABEL[nc.stato] || nc.stato}] ${nc.descrizione}`);
      if (nc.note) righe.push(`  ${nc.note}`);
      if (nc.link_esterno) righe.push(`  ${nc.link_esterno}`);
    }
  }

  if (d.spese.length > 0) {
    const totale = d.spese.reduce((s, x) => s + Number(x.importo || 0), 0);
    righe.push('', `SPESE (${d.spese.length}) — totale € ${euro(totale)}`);
    for (const s of d.spese) {
      righe.push(`• ${s.descrizione} — € ${euro(s.importo)} — ${s.categoria}${s.fornitore ? ` — ${s.fornitore}` : ''}`);
    }
  }

  if (d.tempi.length > 0) {
    righe.push('', `TEMPI DI MONTAGGIO (${d.tempi.length})`);
    for (const t of d.tempi) {
      const perPezzo = t.quantita > 0 ? Math.round(t.durata_minuti / t.quantita) : t.durata_minuti;
      righe.push(`• ${t.tipo_arredo} — ${t.quantita} pz in ${t.durata_minuti} min (${perPezzo} min/pz)`);
      if (t.note) righe.push(`  ${t.note}`);
    }
  }

  if (d.giornale.notes) {
    righe.push('', 'NOTE', d.giornale.notes);
  }

  return righe.join('\n').trim();
}

module.exports = { reportPresenze, reportGiornale };
