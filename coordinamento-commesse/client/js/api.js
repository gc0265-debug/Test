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

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  del: (path) => request(path, { method: 'DELETE' }),
  // multipart/form-data — usato dai Documenti per l'upload file. Niente
  // header Content-Type: lo imposta il browser con il boundary corretto.
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
  putForm: (path, formData) => request(path, { method: 'PUT', body: formData }),
};
