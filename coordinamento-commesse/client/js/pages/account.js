// Area personale "Sicurezza account", raggiunta dal pulsante nella sidebar:
// cambio password e attivazione/disattivazione MFA sul proprio account.
// Non è una scheda del menu (non ha una rotta) perché riguarda solo
// l'utente che ha fatto login, mai altri account — quello resta compito
// della pagina Utenti, riservata agli admin.

import { el, openModal, toast, field } from '../components/ui.js';
import { cambiaPassword, avviaMfaSetup, verificaMfaSetup, disattivaMfa } from '../auth.js';

export function openSicurezzaAccount(user) {
  const body = el('div', { class: 'account-sicurezza' }, [
    renderPasswordSection(),
    renderMfaSection(user),
  ]);
  openModal('Sicurezza account', body);
}

function renderPasswordSection() {
  const attuale = el('input', { type: 'password', autocomplete: 'current-password', required: true });
  const nuova = el('input', { type: 'password', autocomplete: 'new-password', required: true });
  const err = el('div', { class: 'login-card__error' });
  const form = el('form', {}, [
    el('h4', {}, 'Cambia password'),
    field('Password attuale', attuale),
    field('Nuova password', nuova, 'Almeno 10 caratteri, con una maiuscola, una minuscola e un numero.'),
    err,
    el('button', { type: 'submit', class: 'btn btn--primary btn--sm' }, 'Aggiorna password'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    try {
      await cambiaPassword(attuale.value, nuova.value);
      toast('Password aggiornata.');
      form.reset();
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
  return form;
}

function renderMfaSection(user) {
  const host = el('div', { class: 'account-mfa' });
  disegnaStatoMfa(host, user);
  return el('div', {}, [el('hr'), el('h4', {}, 'Autenticazione a due fattori (MFA)'), host]);
}

function disegnaStatoMfa(host, user) {
  host.innerHTML = '';
  if (user.mfa_enabled) {
    host.appendChild(el('p', {}, '✅ Attiva su questo account.'));
    const password = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Password per confermare' });
    const err = el('div', { class: 'login-card__error' });
    const btn = el('button', {
      class: 'btn btn--sm btn--danger',
      onclick: async () => {
        try {
          const esito = await disattivaMfa(password.value);
          user.mfa_enabled = esito.mfa_enabled ? 1 : 0;
          toast('MFA disattivata.');
          disegnaStatoMfa(host, user);
        } catch (ex) {
          err.textContent = ex.message;
        }
      },
    }, 'Disattiva MFA');
    host.appendChild(el('div', { class: 'field' }, [password, err]));
    host.appendChild(btn);
    return;
  }

  host.appendChild(el('p', {}, 'Non attiva. Protegge l\'accesso anche se la password viene scoperta: fortemente consigliata per gli account amministratore.'));
  host.appendChild(el('button', {
    class: 'btn btn--sm btn--primary',
    onclick: async () => {
      try {
        const { secret, qr } = await avviaMfaSetup();
        disegnaSetup(host, user, secret, qr);
      } catch (ex) {
        toast(ex.message, { error: true });
      }
    },
  }, 'Attiva MFA'));
}

function disegnaSetup(host, user, secret, qrDataUrl) {
  host.innerHTML = '';
  const codice = el('input', { type: 'text', inputmode: 'numeric', maxlength: 6, placeholder: '123456' });
  const err = el('div', { class: 'login-card__error' });
  host.appendChild(el('div', {}, [
    el('p', {}, 'Inquadra il QR con un\'app authenticator (Google Authenticator, Authy, Microsoft Authenticator…), oppure inserisci manualmente la chiave.'),
    el('img', { src: qrDataUrl, alt: 'QR configurazione MFA', style: 'width:180px;height:180px' }),
    el('div', { class: 'field__hint' }, `Chiave manuale: ${secret}`),
    field('Codice di verifica', codice, 'Inserisci il codice a 6 cifre generato ora dall\'app per confermare.'),
    err,
    el('button', {
      class: 'btn btn--sm btn--primary',
      onclick: async () => {
        err.textContent = '';
        try {
          await verificaMfaSetup(codice.value.trim());
          user.mfa_enabled = 1;
          toast('MFA attivata.');
          disegnaStatoMfa(host, user);
        } catch (ex) {
          err.textContent = ex.message;
        }
      },
    }, 'Conferma e attiva'),
  ]));
}
