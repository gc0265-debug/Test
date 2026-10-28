// Schermata di accesso: sostituisce l'intero body finché non c'è una
// sessione valida. Al login riuscito ricarica la pagina così app.js
// riparte da zero con lo stato autenticato.

import { login } from '../auth.js';
import { el } from '../components/ui.js';

export function renderLogin() {
  document.body.innerHTML = '';
  const errBox = el('div', { class: 'login-card__error' });
  const form = el('form', { id: 'loginForm' }, [
    el('div', { class: 'login-card__brand' }, [
      el('div', { class: 'side__logo' }, [el('span', {}, 'Field'), el('span', { class: 'p' }, 'Project'), el('span', { class: 's' }, 'SAS')]),
      el('div', { class: 'login-card__app' }, 'Coordinamento Commesse'),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Email'), el('input', { type: 'email', name: 'email', required: true, autofocus: true })]),
    el('div', { class: 'field' }, [el('label', {}, 'Password'), el('input', { type: 'password', name: 'password', required: true })]),
    errBox,
    el('button', { type: 'submit', class: 'btn btn--primary', style: 'width:100%;justify-content:center' }, 'Accedi'),
  ]);
  document.body.appendChild(el('div', { class: 'login-screen' }, [el('div', { class: 'login-card' }, form)]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    try {
      await login(form.email.value.trim(), form.password.value);
      window.location.reload();
    } catch (err) {
      errBox.textContent = err.message === 'credenziali non valide' ? 'Email o password non corrette.' : err.message;
    }
  });
}
