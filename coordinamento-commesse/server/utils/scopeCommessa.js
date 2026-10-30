// Risolve il filtro commessa per le liste dei registri: o una singola
// commessa (commessa_id), o tutte le commesse che condividono lo stesso
// "gruppo progetto" (gruppo) — usato dalla vista aggregata che mostra più
// commesse collegate (es. 2514RW + 2593RW, entrambe RSW Roma) in un'unica
// tabella, ogni riga etichettata col proprio codice commessa.
const db = require('../db/database');

// Ritorna un array di id commessa da usare in un "IN (...)", oppure null
// se la richiesta non specifica alcun filtro (comportamento storico: nessun
// filtro = tutte le righe). Un gruppo senza commesse ritorna [] — il
// chiamante deve trattarlo come "nessun risultato", non come "nessun filtro".
function risolviCommessaIds(query) {
  const { commessa_id, gruppo } = query || {};
  if (gruppo) {
    return db.prepare('SELECT id FROM commesse WHERE gruppo = ?').all(gruppo).map((r) => r.id);
  }
  if (commessa_id) return [Number(commessa_id)];
  return null;
}

// Applica il filtro a una query SQL già costruita con "WHERE 1=1 ...":
// aggiunge "AND <colonna> IN (?, ?, ...)" e i relativi parametri. Se il
// gruppo risolve a zero commesse, forza "AND 0=1" per non restituire nulla
// invece di restituire (per errore) l'intera tabella.
function applicaFiltroCommessa(sql, params, query, colonna) {
  const ids = risolviCommessaIds(query);
  if (ids === null) return sql;
  if (ids.length === 0) return `${sql} AND 0=1`;
  params.push(...ids);
  return `${sql} AND ${colonna} IN (${ids.map(() => '?').join(',')})`;
}

module.exports = { risolviCommessaIds, applicaFiltroCommessa };
