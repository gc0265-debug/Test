// Blocco ottimistico sulle modifiche concorrenti. Ogni riga arriva al
// client con "updated_at" (colonna già presente su tutte le tabelle);
// il modulo di modifica la riporta indietro come "_versione" al
// salvataggio. Se nel frattempo qualcun altro ha già salvato quella
// stessa riga, updated_at sul server nel frattempo è cambiato: qui si
// rifiuta il salvataggio con 409 invece di sovrascrivere in silenzio —
// che l'ultimo che salva vinca senza nemmeno saperlo è il modo più
// subdolo di perdere dati in un'app usata da più persone insieme.
//
// Retrocompatibile: se il chiamante non invia _versione (es. una
// chiamata API fatta da fuori, o un payload costruito a mano), il
// controllo viene saltato invece di bloccare per un campo mancante.
function verificaVersione(req, res, existing) {
  const versioneClient = req.body._versione;
  if (versioneClient === undefined || versioneClient === null || versioneClient === '') return true;
  if (Number(versioneClient) !== Number(existing.updated_at)) {
    res.status(409).json({
      error: 'questa riga è stata modificata da qualcun altro nel frattempo: ricarica la pagina per vedere le modifiche più recenti prima di salvare di nuovo',
      conflitto: true,
    });
    return false;
  }
  return true;
}

module.exports = { verificaVersione };
