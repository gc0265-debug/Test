// Impostazioni — admin-only. Due tipi di liste:
// 1) liste a tendina libere (categorie): valore ed etichetta entrambi
//    modificabili, si possono aggiungere/togliere opzioni.
// 2) etichette di stato (LISTE_BLOCCATE): lo stesso meccanismo, ma il
//    valore resta fisso (guida cruscotti, colori, CHECK a DB) — si può
//    rinominare solo il testo mostrato, non aggiungere o togliere stati.

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

const LISTE_BLOCCATE = [
  { lista: 'criticita_stato', titolo: 'Registro Criticità — Stato' },
  { lista: 'criticita_urgenza', titolo: 'Registro Criticità — Urgenza' },
  { lista: 'decisioni_stato', titolo: 'Registro Decisioni — Stato' },
  { lista: 'allert_stato', titolo: 'Registro Allert — Stato' },
  { lista: 'allert_classificazione', titolo: 'Registro Allert — Classificazione' },
  { lista: 'milestone_stato', titolo: 'Timeline Montaggi — Stato milestone' },
  { lista: 'lavorazioni_stato', titolo: 'Lavorazioni — Stato' },
  { lista: 'lavorazioni_priorita', titolo: 'Lavorazioni — Priorità' },
  { lista: 'requisiti_stato', titolo: 'Requisiti — Stato' },
  { lista: 'contratti_stato', titolo: 'Contratti — Stato' },
  { lista: 'stakeholder_stato', titolo: 'Registro Stakeholder — Stato' },
  { lista: 'maestranze_stato', titolo: 'Maestranze — Stato' },
  { lista: 'note_stato', titolo: 'Note di Coordinamento — Stato' },
];

function openOptionForm(lista, existing, onSaved, { locked = false } = {}) {
  const form = el('form', {});
  form.appendChild(field(
    'Valore (codice interno)', textInput('valore', existing?.valore ?? '', { required: true, placeholder: 'es. interno', disabled: locked }),
    locked ? 'Fisso: questo valore è usato nel codice e non si può cambiare qui.'
      : (existing ? 'Attenzione: cambiare il valore non aggiorna i record che lo usano già.' : 'Solo lettere minuscole, numeri e trattini, senza spazi.')
  ));
  form.appendChild(field('Etichetta visualizzata', textInput('etichetta', existing?.etichetta ?? '', { required: true, placeholder: 'es. Interno Field Project' })));
  if (!locked) {
    form.appendChild(field('Ordine', textInput('ordine', existing?.ordine ?? 0, { type: 'number' }), 'Determina la posizione nelle liste a tendina.'));
  }
  form.appendChild(el('div', { class: 'modal__actions' }, [
    el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Annulla'),
    el('button', { type: 'submit', class: 'btn btn--primary' }, existing ? 'Salva' : 'Crea'),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    data.lista = lista;
    if (locked) { data.valore = existing.valore; data.ordine = existing.ordine; }
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
  openModal(existing ? (locked ? 'Rinomina etichetta' : 'Modifica opzione') : 'Nuova opzione', form);
}

async function renderListaSection(host, def, { locked = false } = {}) {
  async function refresh() {
    host.innerHTML = '';
    host.appendChild(el('div', { class: 'section__head' }, [
      el('div', { class: 'section-title' }, def.titolo),
      locked ? null : el('button', { class: 'btn btn--sm btn--primary', onclick: () => openOptionForm(def.lista, null, refresh) }, '+ Nuova opzione'),
    ]));
    const res = await api.get(`/categorie?lista=${def.lista}`);
    const tableHost = el('div');
    host.appendChild(tableHost);
    const columns = [
      { key: 'valore', label: 'Valore' },
      { key: 'etichetta', label: 'Etichetta' },
    ];
    if (!locked) columns.push({ key: 'ordine', label: 'Ordine', numeric: true });
    columns.push({
      key: 'actions', label: '', className: 'actions',
      render: (row) => el('div', {}, [
        el('button', { class: 'btn btn--sm btn--ghost', onclick: () => openOptionForm(def.lista, row, refresh, { locked }) }, locked ? 'Rinomina' : 'Modifica'),
        locked ? null : el('button', {
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
    });
    renderTable(tableHost, columns, res.data, { emptyLabel: 'Nessuna opzione configurata per questa lista.' });
  }
  await refresh();
}

export async function renderImpostazioni(container) {
  container.appendChild(el('p', { class: 'muted', style: 'margin:-6px 0 14px' },
    'Liste a tendina configurabili senza intervento tecnico: si possono aggiungere, modificare ed eliminare le opzioni.'));

  for (const def of LISTE) {
    const host = el('div', { class: 'section' });
    container.appendChild(host);
    await renderListaSection(host, def);
  }

  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'eyebrow' }, 'Etichette di stato'),
    el('p', { class: 'muted', style: 'margin:4px 0 0' },
      'Gli stati sotto restano fissi — guidano cruscotti, colori e workflow di approvazione in tutta l\'app — ma si può rinominare il testo mostrato per ciascuno, senza toccarne il funzionamento.'),
  ]));
  for (const def of LISTE_BLOCCATE) {
    const host = el('div', { class: 'section' });
    container.appendChild(host);
    await renderListaSection(host, def, { locked: true });
  }
}
