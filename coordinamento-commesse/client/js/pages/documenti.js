import { createCrudPage } from './genericCrud.js';
import { el } from '../components/ui.js';

const TIPI = ['capitolato', 'elaborato', 'verbale', 'contratto', 'sicurezza', 'altro'];

export const renderDocumenti = createCrudPage({
  apiPath: '/documenti',
  titleSingular: 'Documento',
  emptyLabel: 'Nessun documento registrato per questa commessa.',
  fields: [
    { name: 'titolo', label: 'Titolo', required: true },
    { name: 'tipo', label: 'Tipo', type: 'select', options: TIPI.map(t => [t, t[0].toUpperCase() + t.slice(1)]), default: 'altro' },
    { name: 'url', label: 'Link', placeholder: 'https://…' },
    { name: 'note', label: 'Note', type: 'textarea' },
  ],
  columns: [
    { key: 'titolo', label: 'Titolo' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'url', label: 'Link', render: (r) => r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener' }, 'apri ↗') : '—' },
    { key: 'note', label: 'Note' },
  ],
});
