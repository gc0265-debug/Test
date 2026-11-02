// Sincronizzazione in tempo reale fra schede/dispositivi diversi: una
// connessione SSE (vedi server/routes/eventi.js) resta aperta finché la
// sessione è autenticata; ad ogni scrittura andata a buon fine da
// qualunque utente, la pagina attualmente aperta si ricarica da sola —
// così chi la lascia aperta su un altro PC/tablet vede le modifiche
// fatte altrove senza dover premere F5. Un modulo aperto resta aperto
// (vive fuori da #content, vedi router.js): solo il contenuto dietro di
// esso si aggiorna.
import { navigate } from '../router.js';

let sorgente = null;
let timerDebounce = null;

// Più scritture ravvicinate (es. un import CSV di 50 righe) devono
// provocare un solo ricaricamento, non uno per riga.
function ricaricaConDebounce() {
  clearTimeout(timerDebounce);
  timerDebounce = setTimeout(() => { navigate(); }, 400);
}

export function avviaLiveSync() {
  if (sorgente || typeof EventSource === 'undefined') return;
  sorgente = new EventSource('/api/eventi/stream');
  sorgente.addEventListener('cambiamento', ricaricaConDebounce);
  // Niente gestione manuale di riconnessione: EventSource riprova da
  // solo (vedi "retry:" inviato dal server) finché la scheda resta aperta.
}
