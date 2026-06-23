const LABELS = {
  'active': 'Attivo',
  'suspended': 'Sospeso',
  'completed': 'Completato',
  'da-fare': 'Da fare',
  'in-corso': 'In corso',
  'completata': 'Completata',
  'bloccata': 'Bloccata',
  'attivo': 'Attivo',
  'inattivo': 'Inattivo',
  'alta': 'Alta',
  'media': 'Media',
  'bassa': 'Bassa',
};

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
