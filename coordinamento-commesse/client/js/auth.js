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

export function logout() {
  return api.post('/auth/logout', {});
}
