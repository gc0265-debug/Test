// Annulla/ripeti ultima modifica — un solo livello, globale a tutta
// l'app. Copre i salvataggi (PUT) sui registri: ogni volta che api.put
// viene chiamata, registraModifica salva qui lo stato della riga COM'ERA
// prima di quel salvataggio (una sola riga alla volta, l'ultima).
//
// Annullare rimanda quello stato com'era al server con un nuovo PUT: che
// a sua volta, passando di nuovo da api.put, registra automaticamente lo
// stato precedente A QUELLA chiamata (cioè la modifica appena annullata)
// come nuova "ultima modifica" — per questo non serve una pila separata
// per il "ripeti": è lo stesso meccanismo, letto al contrario. Le due
// freccette in alto si limitano a mostrare in quale dei due versi ci si
// trova.
import { api } from '../api.js';

let ultimo = null; // { path, prima }
let annullato = false;
let inCorso = false;
const ascoltatori = [];

export function registraModifica(path, prima) {
  ultimo = { path, prima };
  annullato = inCorso ? !annullato : false;
  notifica();
}

export function haUndo() { return !!ultimo && !annullato; }
export function haRedo() { return !!ultimo && annullato; }

export async function annullaUltima() {
  if (!ultimo) return;
  const { path, prima } = ultimo;
  inCorso = true;
  try {
    const live = await api.get(path);
    await api.put(path, { ...prima, _versione: live._versione ?? live.updated_at });
  } finally {
    inCorso = false;
  }
}

export function onCambiamentoUndo(cb) { ascoltatori.push(cb); }
function notifica() { ascoltatori.forEach((cb) => cb()); }
