import { api } from './api.js';

export async function getCurrentUser() {
  try {
    return await api.get('/auth/me');
  } catch (_) {
    return null;
  }
}

export function login(email, password) {
  return api.post('/auth/login', { email, password });
}

export function verificaMfaLogin(codice) {
  return api.post('/auth/login/mfa', { codice });
}

export function logout() {
  return api.post('/auth/logout', {});
}

export function cambiaPassword(password_attuale, password_nuova) {
  return api.post('/auth/me/password', { password_attuale, password_nuova });
}

export function avviaMfaSetup() {
  return api.post('/auth/mfa/setup', {});
}

export function verificaMfaSetup(codice) {
  return api.post('/auth/mfa/verifica', { codice });
}

export function disattivaMfa(password) {
  return api.post('/auth/mfa/disattiva', { password });
}
