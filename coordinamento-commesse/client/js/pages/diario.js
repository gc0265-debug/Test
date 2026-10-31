import { createCrudPage } from './genericCrud.js';
import { el, formatDate, todayISO } from '../components/ui.js';

const clamp = (text) => text ? el('div', { class: 'text-2lines' }, text) : '—';

export const renderDiario = createCrudPage({
  apiPath: '/diario',
  titleSingular: 'Voce di diario',
  emptyLabel: 'Nessuna voce di diario per questa commessa.',
  fields: [
    { name: 'data', label: 'Data', type: 'date', default: todayISO(), required: true, hint: 'Un\'unica voce per ogni giornata di cantiere.' },
    { name: 'squadre', label: 'Squadre o soggetti coinvolti', type: 'textarea', hint: 'Chi era presente in cantiere quel giorno.' },
    { name: 'attivita', label: 'Attività svolte o discusse', type: 'textarea', hint: 'Cosa è stato fatto o deciso in cantiere quel giorno.' },
    { name: 'eventi', label: 'Eventi', type: 'textarea', hint: 'Fatti rilevanti non riconducibili alle normali attività (es. sopralluoghi, consegne, interruzioni).' },
    { name: 'criticita_testo', label: 'Criticità rilevate', type: 'textarea', hint: 'Note libere — una criticità che richiede risposta formale va anche nel Registro Criticità.' },
  ],
  columns: [
    { key: 'data', label: 'Data', render: (r) => formatDate(r.data) },
    { key: 'squadre', label: 'Squadre', render: (r) => clamp(r.squadre) },
    { key: 'attivita', label: 'Attività', render: (r) => clamp(r.attivita) },
    { key: 'eventi', label: 'Eventi', render: (r) => clamp(r.eventi) },
    { key: 'criticita_testo', label: 'Criticità', render: (r) => clamp(r.criticita_testo) },
  ],
  printColumns: [
    { label: 'Data', get: (r) => formatDate(r.data) },
    { label: 'Squadre', get: (r) => r.squadre || '—' },
    { label: 'Attività', get: (r) => r.attivita || '—' },
    { label: 'Eventi', get: (r) => r.eventi || '—' },
    { label: 'Criticità', get: (r) => r.criticita_testo || '—' },
  ],
});
