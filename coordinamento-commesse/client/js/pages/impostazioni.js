// Impostazioni — admin-only. Editor delle liste a tendina configurabili
// (categorie): solo i valori che NON guidano logica applicativa (dashboard,
// colori, macchine a stati) sono qui; gli "stato" delle varie schede
// restano fissi e vincolati da CHECK a livello di database.

import { api } from '../api.js';
import {
  el, field, textInput, formData, openModal, closeModal, toast, confirmDialog, renderTable,
} from '../components/ui.js';
import { invalidateCategorie } from '../components/categorie.js';

const LISTE = [
  { lista: 'stakeholder_categoria', titolo: 'Registro Stakeholder — Categorie' },
  { lista: 'allert_perimetro', titolo: 'Registro Allert — Perimetro' },
  { lista: 'comunicazione_frequenza', titolo: 'Piano Comunicazioni — Frequenza' },
  { lista: 'requisiti_fase', titolo: 'Requisiti — Fase di esecuzione' },
  { lista: 'documenti_tipo', titolo: 'Documenti — Tipo' },
];

function openOptionForm(lista, existing, onSaved) {
  const form = el('form', {});
  form.appendChild(field(
    'Valore (codice interno)', textInput('valore', existing?.valore ?? '', { required: true, placeholder: 'es. interno' }),
    existing ? 'Attenzione: cambiare il valore non aggiorna i record che lo usano già.' : 'Solo lettere minuscole, numeri e trattini, senza spazi.'
  ));
  form.appendChild(field('Etichetta visualizzata', textInput('etichetta', existing?.etichetta ?? '', { required: true, placeholder: 'es. Interno Field Project' })));
  form.appendChild(field('Ordine', textInput('ordine', existing?.ordine ?? 0, { type: 'number' }), 'Determina la posizione nelle liste a tendina.'));
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.lista = lista;
    try {
      if (existing) await api.put(`/categorie/${existing.id}`, data);
      else await api.post('/categorie', data);
      invalidateCategorie(lista);
      closeModal();
      toast(existing ? 'Opzione aggiornata.' : 'Opzione creata.');
      onSaved();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  openModal(existing ? 'Modifica opzione' : 'Nuova opzione', form);
}

async function renderListaSection(host, def) {
  async function refresh() {
    host.innerHTML = '';
    host.appendChild(el('div', { class: 'section__head' }, [
      el('div', { class: 'section-title' }, def.titolo),
      el('button', { class: 'btn btn--sm btn--primary', onclick: () => openOptionForm(def.lista, null, refresh) }, '+ Nuova opzione'),
    ]));
    const res = await api.get(`/categorie?lista=${def.lista}`);
    const tableHost = el('div');
    host.appendChild(tableHost);
    renderTable(tableHost, [
      { key: 'valore', label: 'Valore' },
      { key: 'etichetta', label: 'Etichetta' },
      { key: 'ordine', label: 'Ordine', numeric: true },
      {
        key: 'actions', label: '', className: 'actions',
        render: (row) => el('div', {}, [
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openOptionForm(def.lista, row, refresh) }, 'Modifica'),
          el('button', {
            class: 'btn btn--sm btn--ghost btn--danger',
            onclick: async () => {
              if (!confirmDialog(`Eliminare l'opzione "${row.etichetta}"? Le schede che la usano già mostreranno il codice grezzo.`)) return;
              await api.del(`/categorie/${row.id}`);
              invalidateCategorie(def.lista);
              toast('Eliminata.');
              refresh();
            },
          }, 'Elimina'),
        ]),
      },
    ], res.data, { emptyLabel: 'Nessuna opzione configurata per questa lista.' });
  }
  await refresh();
}

export async function renderImpostazioni(container) {
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Liste a tendina configurabili senza intervento tecnico. Non comprende gli "stato" delle varie schede, che restano fissi perché guidano la logica dell\'app (cruscotti, colori, workflow di approvazione).'));

  for (const def of LISTE) {
    const host = el('div', { class: 'section' });
    container.appendChild(host);
    await renderListaSection(host, def);
  }
}
