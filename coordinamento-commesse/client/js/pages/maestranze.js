import { createCrudPage } from './genericCrud.js';
import { pill } from '../components/ui.js';
import { state } from '../state.js';

const STATO = { attivo: ['Attivo', 'verde'], 'non-attivo': ['Non attivo', 'outline'] };

export const renderMaestranze = createCrudPage({
  apiPath: '/maestranze',
  titleSingular: 'Maestranza',
  emptyLabel: 'Nessuna maestranza registrata per questa commessa.',
  fields: [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'ruolo', label: 'Ruolo' },
    { name: 'azienda', label: 'Azienda' },
    { name: 'telefono', label: 'Telefono' },
    { name: 'wp_id', label: 'Work package', type: 'select', options: () => [['', '—'], ...state.workPackages.map((w) => [w.id, `${w.codice} ${w.nome}`])] },
    { name: 'stato', label: 'Stato', type: 'select', options: Object.entries(STATO).map(([k, v]) => [k, v[0]]), default: 'attivo' },
    { name: 'qualifiche', label: 'Qualifiche', type: 'textarea', hint: 'Attestati, abilitazioni, scadenze note.' },
  ],
  columns: [
    { key: 'nome', label: 'Nome' },
    { key: 'ruolo', label: 'Ruolo' },
    { key: 'azienda', label: 'Azienda' },
    { key: 'wp', label: 'WP', render: (r) => r.wp_codice ? `${r.wp_codice} ${r.wp_nome}` : '—' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'stato', label: 'Stato', render: (r) => pill(STATO[r.stato][0], STATO[r.stato][1]) },
  ],
  printColumns: [
    { label: 'Nome', get: (r) => r.nome },
    { label: 'Ruolo', get: (r) => r.ruolo || '—' },
    { label: 'Azienda', get: (r) => r.azienda || '—' },
    { label: 'WP', get: (r) => r.wp_codice || '—' },
    { label: 'Telefono', get: (r) => r.telefono || '—' },
    { label: 'Stato', get: (r) => STATO[r.stato][0] },
  ],
});
