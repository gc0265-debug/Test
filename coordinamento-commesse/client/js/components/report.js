// Stampa un report formattato in una nuova finestra — stesso meccanismo
// già usato dalle Note di Coordinamento (printToWindow), generalizzato a
// più sezioni tabellari: scadenze della settimana, elenco milestone, ecc.

export function printReport(title, commessa, sections, { intro, chartsHtml } = {}) {
  const win = window.open('', '_blank');
  if (!win) return;

  const sectionsHtml = sections.map((s) => `
    <h2>${s.heading}</h2>
    <table>
      <thead><tr>${s.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${s.rows.length
        ? s.rows.map((r) => `<tr>${r.map((v) => `<td>${v ?? '—'}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${s.columns.length}" class="empty">Nessun elemento.</td></tr>`}
      </tbody>
    </table>
  `).join('');

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1A1A1A;}
      h1{font-size:18px;margin:0 0 4px;}
      .sub{color:#666;font-size:12px;margin-bottom:24px;}
      h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#4D4D4D;margin:26px 0 10px;}
      table{border-collapse:collapse;width:100%;font-size:12px;}
      th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:6px 10px;border-bottom:2px solid #1A1A1A;}
      td{padding:7px 10px;border-bottom:1px solid #eee;}
      .empty{color:#999;text-align:center;}
      .intro{font-size:13px;line-height:1.5;margin:0 0 20px;padding:12px 14px;background:#F7F7F7;border-left:3px solid #1A1A1A;}
      .charts-row{display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;margin-bottom:8px;}
      .chart-box{min-width:260px;}
      .chart-box__title{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:10px;}
      .chart-pie-wrap{display:flex;align-items:center;gap:18px;}
      .chart-legend{font-size:11.5px;}
      .chart-legend-item{display:flex;align-items:center;gap:6px;margin-bottom:5px;}
      .chart-legend-dot{width:9px;height:9px;border-radius:50%;flex:none;}
      @media print{ body{padding:0;} }
    </style></head><body>
    <h1>${title}</h1>
    <div class="sub">${commessa ? `${commessa.codice} — ${commessa.nome} · ` : ''}${new Date().toLocaleDateString('it-IT')}</div>
    ${intro ? `<p class="intro">${intro}</p>` : ''}
    ${chartsHtml || ''}
    ${sectionsHtml}
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
