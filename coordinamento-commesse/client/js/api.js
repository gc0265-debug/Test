const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, { credentials: 'same-origin', ...options });
  if (res.status === 204) return null;
  let body = null;
  try { body = await res.json(); } catch (_) { /* risposta vuota */ }
  if (!res.ok) {
    const message = (body && body.error) || `errore ${res.status}`;
    throw new Error(message);
  }
  return body;
}

// Prima di ogni PUT, legge lo stato attuale della riga (per poterlo
// ripristinare con "Annulla ultima modifica") e lo registra solo se il
// salvataggio va a buon fine. Un fallimento nella lettura di supporto
// (es. endpoint senza GET singolo) non deve bloccare il salvataggio:
// in quel caso l'azione resta semplicemente non annullabile.
async function putConUndo(path, data) {
  let prima = null;
  try { prima = await request(path); } catch (_) { /* vedi sopra */ }
  const risultato = await request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (prima) {
    const { registraModifica } = await import('./components/undo.js');
    registraModifica(path, prima);
  }
  return risultato;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  put: (path, data) => putConUndo(path, data),
  del: (path) => request(path, { method: 'DELETE' }),
  // multipart/form-data — usato dai Documenti per l'upload file. Niente
  // header Content-Type: lo imposta il browser con il boundary corretto.
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
  putForm: (path, formData) => request(path, { method: 'PUT', body: formData }),
};
