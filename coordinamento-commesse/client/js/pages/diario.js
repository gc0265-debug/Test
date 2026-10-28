import { createCrudPage } from './genericCrud.js';
import { formatDate, todayISO } from '../components/ui.js';

export const renderDiario = createCrudPage({
  apiPath: '/diario',
  titleSingular: 'Voce di diario',
  emptyLabel: 'Nessuna voce di diario per questa commessa.',
  fields: [
    { name: 'data', label: 'Data', type: 'date', default: todayISO(), required: true },
    { name: 'squadre', label: 'Squadre o soggetti coinvolti', type: 'textarea' },
    { name: 'attivita', label: 'Attività svolte o discusse', type: 'textarea' },
    { name: 'eventi', label: 'Eventi', type: 'textarea' },
    { name: 'criticita_testo', label: 'Criticità rilevate', type: 'textarea', hint: 'Note libere — una criticità che richiede risposta formale va anche nel Registro Criticità.' },
  ],
  columns: [
    { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
    { key: 'squadre', label: 'Squadre' },
    { key: 'attivita', label: 'Attività' },
    { key: 'eventi', label: 'Eventi' },
    { key: 'criticita_testo', label: 'Criticità' },
  ],
});
