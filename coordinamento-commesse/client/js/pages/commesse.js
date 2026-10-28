// Gestione commesse e dei rispettivi work package. Dopo ogni modifica
// ricarica lo stato condiviso (state.js) così il menu a tendina della
// sidebar e tutte le altre pagine restano allineati.

import { api } from '../api.js';
import { state, loadCommesse, setCommessa } from '../state.js';
import { el, field, textInput, textarea, select, formData, openModal, closeModal, toast, confirmDialog, renderTable, pill } from '../components/ui.js';

function openCommessaForm(existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field('Codice', textInput('codice', existing?.codice ?? '', { required: true, placeholder: 'es. 2514RW' })));
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true, placeholder: 'es. Hotel Rosewood Roma' })));
  form.appendChild(field('Cliente', textInput('cliente', existing?.cliente ?? '')));
  form.appendChild(field('Committente finale', textInput('committente_finale', existing?.committente_finale ?? '')));
  form.appendChild(field('General Contractor', textInput('gc', existing?.gc ?? '')));
  form.appendChild(field('Direzione Lavori', textInput('dl', existing?.dl ?? '')));
  form.appendChild(field('Advisor', textInput('advisor', existing?.advisor ?? '')));
  form.appendChild(field('Direttore di Cantiere', textInput('direttore_cantiere', existing?.direttore_cantiere ?? '')));
  form.appendChild(field('Data apertura', textInput('data_apertura', existing?.data_apertura ?? '', { type: 'date' })));
  form.appendChild(field('Stato', select('stato', [['attiva', 'Attiva'], ['sospesa', 'Sospesa'], ['chiusa', 'Chiusa']], existing?.stato ?? 'attiva')));
  form.appendChild(field('Note', textarea('note', existing?.note ?? '')));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    try {
      if (existing) await api.put(`/commesse/${existing.id}`, data);
      else await api.post('/commesse', data);
      closeModal();
      toast(existing ? 'Commessa aggiornata.' : 'Commessa creata.');
      await loadCommesse();
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica commessa' : 'Nuova commessa', form);
}

function openWpForm(commessaId, existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field('Codice', textInput('codice', existing?.codice ?? '', { required: true, placeholder: 'es. WP1' })));
  form.appendChild(field('Nome', textInput('nome', existing?.nome ?? '', { required: true, placeholder: 'es. FOH' })));
  form.appendChild(field('PM responsabile', textInput('pm_responsabile', existing?.pm_responsabile ?? '')));
  form.appendChild(field('Ordine', textInput('ordine', existing?.ordine ?? 0, { type: 'number' })));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.ordine = Number(data.ordine) || 0;
    try {
      if (existing) await api.put(`/commesse/wp/${existing.id}`, data);
      else await api.post(`/commesse/${commessaId}/wp`, data);
      closeModal();
      toast('Work package salvato.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica work package' : 'Nuovo work package', form);
}

export async function renderCommesse(container) {
  const toolbar = el('div', { class: 'section__head' }, [
    el('h2', {}, 'Commesse'),
    el('button', { class: 'btn btn--primary', onclick: () => openCommessaForm(null, refreshCommesse) }, '+ Nuova commessa'),
  ]);
  container.appendChild(toolbar);
  const commesseHost = el('div');
  container.appendChild(commesseHost);

  container.appendChild(el('div', { class: 'section__head', style: 'margin-top:30px' }, [
    el('h2', {}, 'Work package della commessa selezionata'),
    el('button', { class: 'btn btn--primary', onclick: () => { if (state.commessaId) openWpForm(state.commessaId, null, refreshWp); } }, '+ Nuovo WP'),
  ]));
  const wpHost = el('div');
  container.appendChild(wpHost);

  async function refreshCommesse() {
    const res = await api.get('/commesse');
    renderTable(commesseHost, [
      { key: 'codice', label: 'Codice' },
      { key: 'nome', label: 'Nome' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'stato', label: 'Stato', render: (r) => pill(r.stato, r.stato === 'attiva' ? 'verde' : (r.stato === 'chiusa' ? 'outline' : 'ambra')) },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openCommessaForm(row, refreshCommesse) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(`Eliminare la commessa ${row.codice} e tutti i suoi dati? L'operazione non è reversibile.`)) return;
              await api.del(`/commesse/${row.id}`);
              toast('Commessa eliminata.');
              await loadCommesse();
              refreshCommesse();
              refreshWp();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessuna commessa. Creane una per iniziare.' });
  }

  async function refreshWp() {
    if (!state.commessaId) {
      wpHost.innerHTML = '';
      wpHost.appendChild(el('p', { class: 'muted' }, 'Seleziona una commessa dal menu a sinistra.'));
      return;
    }
    const res = await api.get(`/commesse/${state.commessaId}/wp`);
    renderTable(wpHost, [
      { key: 'codice', label: 'Codice' },
      { key: 'nome', label: 'Nome' },
      { key: 'pm_responsabile', label: 'PM responsabile' },
      { key: 'ordine', label: 'Ordine', numeric: true },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openWpForm(state.commessaId, row, refreshWp) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog('Eliminare questo work package?')) return;
              await api.del(`/commesse/wp/${row.id}`);
              toast('Eliminato.');
              await loadCommesse();
              refreshWp();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessun work package per questa commessa.' });
  }

  await refreshCommesse();
  await refreshWp();
}
