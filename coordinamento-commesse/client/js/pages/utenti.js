// Gestione utenti — visibile e utilizzabile solo da un amministratore
// (server-side: /api/auth/users risponde 403 a chi non lo è).

import { api } from '../api.js';
import { getCurrentUser } from '../auth.js';
import { el, field, textInput, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, pill } from '../components/ui.js';

// Sezioni concedibili a un utente "cliente": accesso in sola lettura,
// scelto per ogni singolo utente. Coerente con l'elenco accettato dal
// server (server/routes/auth.js, SEZIONI_CLIENTE_VALIDE).
const SEZIONI_CLIENTE = [
  ['timeline', 'Timeline Montaggi'],
  ['lavorazioni', 'Lavorazioni'],
  ['approvazioni-drawings', 'Approvazioni Drawings'],
];

function openForm(existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true })));
  form.appendChild(field('Email', textInput('email', existing?.email ?? '', { required: true, type: 'email' })));
  form.appendChild(field(
    'Password',
    textInput('password', '', { type: 'password', placeholder: existing ? '••••••••' : '' }),
    existing ? 'Lascia vuoto per mantenere quella attuale.' : 'Password iniziale: l\'utente potrà cambiarla in seguito da qui.'
  ));
  const ruoloSelect = select('ruolo', [['operatore', 'Operatore'], ['admin', 'Amministratore'], ['cliente', 'Cliente (sola lettura)']], existing?.ruolo ?? 'operatore');
  form.appendChild(field('Ruolo', ruoloSelect));

  const sezioniHost = el('div');
  form.appendChild(sezioniHost);

  const sezioniCorrenti = new Set(existing?.sezioni_consentite || []);
  const checkboxes = SEZIONI_CLIENTE.map(([valore, etichetta]) => {
    const checkbox = el('input', { type: 'checkbox', value: valore, checked: sezioniCorrenti.has(valore) });
    return { valore, node: el('label', { class: 'checkbox-list__item' }, [checkbox, etichetta]), checkbox };
  });

  function drawSezioni() {
    sezioniHost.innerHTML = '';
    if (ruoloSelect.value !== 'cliente') return;
    sezioniHost.appendChild(el('label', {}, 'Sezioni visibili (sola lettura)'));
    sezioniHost.appendChild(el('div', { class: 'checkbox-list' }, checkboxes.map((c) => c.node)));
    sezioniHost.appendChild(el('div', { class: 'field__hint', style: 'margin:4px 0 14px' },
      'Il cliente vede solo queste sezioni, e solo in lettura: non può creare, modificare o eliminare nulla.'));
  }
  drawSezioni();
  ruoloSelect.addEventListener('change', drawSezioni);

  form.appendChild(field('Attivo', select('attivo', [[1, 'Sì'], [0, 'No']], existing ? (existing.attivo ? 1 : 0) : 1)));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.attivo = data.attivo === '1';
    if (!data.password) delete data.password;
    if (data.ruolo === 'cliente') {
      data.sezioni_consentite = checkboxes.filter((c) => c.checkbox.checked).map((c) => c.valore);
    } else {
      delete data.sezioni_consentite;
    }
    try {
      if (existing) await api.put(`/auth/users/${existing.id}`, data);
      else await api.post('/auth/users', data);
      closeModal();
      toast(existing ? 'Utente aggiornato.' : 'Utente creato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica utente' : 'Nuovo utente', form);
}

export async function renderUtenti(container) {
  const me = await getCurrentUser();
  if (!me || me.ruolo !== 'admin') {
    container.appendChild(el('p', { class: 'muted' }, 'Sezione riservata agli amministratori.'));
    return;
  }

  const toolbar = el('div', { class: 'section__head' }, [
    el('div'),
    el('button', { class: 'btn btn--primary', onclick: () => openForm(null, refresh) }, '+ Nuovo utente'),
  ]);
  container.appendChild(toolbar);
  const tableHost = el('div');
  container.appendChild(tableHost);

  async function refresh() {
    const res = await api.get('/auth/users');
    renderTable(tableHost, [
      { key: 'nome', label: 'Nome' },
      { key: 'email', label: 'Email' },
      {
        key: 'ruolo', label: 'Ruolo',
        render: (r) => pill(
          r.ruolo === 'admin' ? 'Amministratore' : (r.ruolo === 'cliente' ? 'Cliente' : 'Operatore'),
          r.ruolo === 'admin' ? 'rosso' : (r.ruolo === 'cliente' ? 'ambra' : 'outline')
        ),
      },
      { key: 'attivo', label: 'Stato', render: (r) => r.attivo ? pill('Attivo', 'verde') : pill('Disattivato', 'outline') },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openForm(row, refresh) }, 'Modifica'),
          row.id !== me.id ? el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(`Eliminare l'utente ${row.nome}?`)) return;
              try {
                await api.del(`/auth/users/${row.id}`);
                toast('Eliminato.');
                refresh();
              } catch (err) {
                toast(err.message, { error: true });
              }
            },
          }, 'Elimina') : null,
        ]),
      },
    ], res.data, {
      emptyLabel: 'Nessun utente.',
      onRowClick: (row) => openForm(row, refresh),
    });
  }

  await refresh();
}
