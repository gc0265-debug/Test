// Import in blocco da CSV: blocco riutilizzabile (pulsante "Modello CSV"
// + pulsante "Importa da CSV" + input file nascosto) wired dalle pagine
// dei vari registri verso il proprio endpoint /import lato server. La
// risposta attesa dall'endpoint è sempre nella stessa forma:
// { imported, skipped, dettaglioScarti: [...], avvisi?: [...] }.

import { api } from '../api.js';
import { state } from '../state.js';
import { el, toast } from './ui.js';

export function creaImportCsv({ endpoint, colonne, esempioRiga, nomeFile, onImported }) {
  const fileInput = el('input', { type: 'file', accept: '.csv,text/csv', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('commessa_id', state.commessaId);
    try {
      const res = await api.postForm(endpoint, fd);
      const messaggi = [`Importate ${res.imported} righe.`];
      if (res.skipped) {
        messaggi.push(`${res.skipped} righe scartate${res.dettaglioScarti?.length ? ': ' + res.dettaglioScarti.slice(0, 3).join('; ') + (res.dettaglioScarti.length > 3 ? '…' : '') : ''}`);
      }
      if (res.avvisi?.length) messaggi.push(`${res.avvisi.length} avvisi (es. WP non riconosciuto).`);
      toast(messaggi.join(' '), { error: !res.imported });
      await onImported();
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      fileInput.value = '';
    }
  });

  function scaricaModello() {
    const righe = [colonne, esempioRiga];
    const csv = righe.map((r) => r.map((v) => (/[,;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeFile;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const bottoneModello = el('button', {
    class: 'btn btn--sm', onclick: scaricaModello, title: 'Scarica un file CSV di esempio con le intestazioni attese',
  }, 'Modello CSV');
  const bottoneImporta = el('button', { class: 'btn btn--sm', onclick: () => fileInput.click() }, 'Importa da CSV');

  return { fileInput, bottoneModello, bottoneImporta };
}
