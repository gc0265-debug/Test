const db = require('../db/database');

const insertStmt = db.prepare(`
  INSERT INTO audit_log (commessa_id, entity_type, entity_id, azione, utente, dettaglio)
  VALUES (@commessa_id, @entity_type, @entity_id, @azione, @utente, @dettaglio)
`);

function logAudit({ commessa_id, entity_type, entity_id, azione, utente, dettaglio }) {
  insertStmt.run({
    commessa_id: commessa_id || null,
    entity_type,
    entity_id,
    azione,
    utente: utente || null,
    dettaglio: dettaglio || null,
  });
}

// Confronta due righe su un elenco di campi tracciati e produce un
// riassunto leggibile tipo "Stato: aperta → chiusa; Urgenza: viola → normale".
function diffFields(before, after, fields) {
  const parts = [];
  fields.forEach(({ key, label }) => {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (String(a) !== String(b)) parts.push(`${label}: ${a ?? '—'} → ${b ?? '—'}`);
  });
  return parts.join('; ');
}

module.exports = { logAudit, diffFields };
