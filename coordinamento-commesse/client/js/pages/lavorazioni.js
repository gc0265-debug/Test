import { state } from '../state.js';
import { createCrudPage } from './genericCrud.js';
import { pill, formatDate } from '../components/ui.js';

const STATO = { 'da-fare': ['Da fare', 'outline'], 'in-corso': ['In corso', 'ambra'], completata: ['Completata', 'verde'], bloccata: ['Bloccata', 'rosso'] };
const PRIORITA = { alta: ['Alta', 'rosso'], media: ['Media', 'ambra'], bassa: ['Bassa', 'outline'] };

export const renderLavorazioni = createCrudPage({
  apiPath: '/lavorazioni',
  titleSingular: 'Lavorazione',
  emptyLabel: 'Nessuna lavorazione registrata per questa commessa.',
  fields: [
    { name: 'titolo', label: 'Titolo', required: true },
    { name: 'wp_id', label: 'Work package', type: 'select', options: () => [['', '—'], ...state.workPackages.map(w => [w.id, `${w.codice} ${w.nome}`])] },
    { name: 'descrizione', label: 'Descrizione', type: 'textarea' },
    { name: 'stato', label: 'Stato', type: 'select', options: Object.entries(STATO).map(([k, v]) => [k, v[0]]), default: 'da-fare' },
    { name: 'priorita', label: 'Priorità', type: 'select', options: Object.entries(PRIORITA).map(([k, v]) => [k, v[0]]), default: 'media' },
    { name: 'scadenza', label: 'Scadenza', type: 'date' },
    { name: 'impresa', label: 'Impresa / squadra' },
  ],
  columns: [
    { key: 'titolo', label: 'Titolo' },
    { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
    { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
    { key: 'priorita', label: 'Priorità', render: (r) => pill(PRIORITA[r.priorita][0], PRIORITA[r.priorita][1]) },
    { key: 'scadenza', label: 'Scadenza', render: (r) => formatDate(r.scadenza) },
    { key: 'impresa', label: 'Impresa' },
  ],
});
