// Canale interno per notificare in tempo reale le sessioni collegate
// (vedi routes/eventi.js, stream SSE) che qualcosa è cambiato: usato
// dal middleware globale in index.js, non dalle singole rotte — un
// nuovo registro non deve ricordarsi di "emettere l'evento", funziona
// già per qualunque scrittura che va a buon fine sotto /api.
const { EventEmitter } = require('events');

const bus = new EventEmitter();
// Molte connessioni SSE aperte in parallelo (una per scheda del browser
// di ogni utente collegato) sono normali, non una perdita di memoria.
bus.setMaxListeners(500);

function notificaCambiamento() {
  bus.emit('cambiamento');
}

module.exports = { bus, notificaCambiamento };
