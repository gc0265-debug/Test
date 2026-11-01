// Schermata di accesso: sostituisce l'intero body finché non c'è una
// sessione valida. Al login riuscito ricarica la pagina così app.js
// riparte da zero con lo stato autenticato.

import { login, verificaMfaLogin } from '../auth.js';
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
  const card = el('div', { class: 'login-card' }, form);
  document.body.appendChild(el('div', { class: 'login-screen' }, [card]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    try {
      const esito = await login(form.email.value.trim(), form.password.value);
      if (esito && esito.mfa_richiesta) {
        renderMfaStep(card);
        return;
      }
      window.location.reload();
    } catch (err) {
      errBox.textContent = err.message === 'credenziali non valide' ? 'Email o password non corrette.' : err.message;
    }
  });
}

// Secondo passaggio, mostrato solo se l'account ha l'MFA attiva: la
// password da sola ha già aperto una sessione "in sospeso" sul server,
// qui si chiede solo il codice a 6 cifre dell'app authenticator.
function renderMfaStep(card) {
  const errBox = el('div', { class: 'login-card__error' });
  const codeInput = el('input', {
    type: 'text', name: 'codice', inputmode: 'numeric', autocomplete: 'one-time-code',
    maxlength: 6, autofocus: true, style: 'text-align:center;letter-spacing:.3em;font-size:1.3rem',
  });
  const form = el('form', {}, [
    el('div', { class: 'login-card__app' }, 'Verifica a due fattori'),
    el('p', { class: 'field__hint' }, 'Inserisci il codice a 6 cifre dalla tua app di autenticazione.'),
    el('div', { class: 'field' }, [el('label', {}, 'Codice'), codeInput]),
    errBox,
    el('button', { type: 'submit', class: 'btn btn--primary', style: 'width:100%;justify-content:center' }, 'Verifica'),
  ]);
  card.innerHTML = '';
  card.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    try {
      await verificaMfaLogin(codeInput.value.trim());
      window.location.reload();
    } catch (err) {
      errBox.textContent = err.message === 'codice non valido' ? 'Codice non valido o scaduto.' : err.message;
    }
  });
}
