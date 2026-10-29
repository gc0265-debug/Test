// Helper DOM minimi, senza framework. `el` costruisce elementi con
// attributi e figli in una chiamata; il resto sono i widget condivisi
// (toast, modale, conferma) usati da tutte le pagine.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ---------- toast ----------
export function toast(message, { error = false } = {}) {
  const layer = document.getElementById('toastLayer');
  const node = el('div', { class: 'toast' + (error ? ' toast--error' : '') }, message);
  layer.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

// ---------- modale ----------
let closeCurrent = null;

export function openModal(title, bodyNode, { onClose } = {}) {
  const layer = document.getElementById('modalLayer');
  const box = document.getElementById('modalBox');
  const scrim = document.getElementById('modalScrim');
  box.innerHTML = '';
  box.appendChild(el('div', { class: 'modal__head' }, [
    el('h3', {}, title),
    el('button', { class: 'modal__close', 'aria-label': 'Chiudi', onclick: () => close() }, '×'),
  ]));
  box.appendChild(bodyNode);
  layer.hidden = false;

  function close() {
    layer.hidden = true;
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
    closeCurrent = null;
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  scrim.onclick = close;
  closeCurrent = close;
  return close;
}

export function closeModal() {
  if (closeCurrent) closeCurrent();
}

export function confirmDialog(message) {
  return window.confirm(message);
}

// ---------- form ----------
export function field(labelText, inputNode, hint) {
  return el('div', { class: 'field' }, [
    el('label', {}, labelText),
    inputNode,
    hint ? el('div', { class: 'field__hint' }, hint) : null,
  ]);
}

export function textInput(name, value = '', attrs = {}) {
  return el('input', { type: 'text', name, value, ...attrs });
}

export function dateInput(name, value = '', attrs = {}) {
  return el('input', { type: 'date', name, value, ...attrs });
}

export function textarea(name, value = '', attrs = {}) {
  const t = el('textarea', { name, ...attrs });
  t.value = value || '';
  return t;
}

export function select(name, options, value, attrs = {}) {
  const s = el('select', { name, ...attrs });
  options.forEach(([optValue, label]) => {
    const o = el('option', { value: optValue }, label);
    if (String(optValue) === String(value)) o.selected = true;
    s.appendChild(o);
  });
  return s;
}

export function formData(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v === '' ? null : v; });
  return data;
}

// ---------- tabella ----------
// columns: [{ key, label, render?: (row) => Node|string, numeric?: bool }]
// onRowClick(row): se presente, rende cliccabili le celle non-azioni/non-selezione
// (apre tipicamente il form di modifica). selection: { selectedId, onSelect(id|null) }
// aggiunge una colonna con radio button, per stampare una sola riga alla volta.
export function renderTable(container, columns, rows, { rowClass, emptyLabel = 'Nessun elemento.', onRowClick, selection } = {}) {
  container.innerHTML = '';
  const wrap = el('div', { class: 'tw' });
  const table = el('table');
  const headCells = [
    selection ? el('th', {}, '') : null,
    ...columns.map((c) => el('th', {}, c.label)),
  ].filter(Boolean);
  const thead = el('thead', {}, el('tr', {}, headCells));
  const tbody = el('tbody');

  if (!rows.length) {
    tbody.appendChild(el('tr', { class: 'empty-row' }, el('td', { colspan: columns.length + (selection ? 1 : 0) }, emptyLabel)));
  } else {
    rows.forEach((row) => {
      const tr = el('tr', { class: rowClass ? rowClass(row) || '' : '' });
      if (selection) {
        const checked = String(row.id) === String(selection.selectedId);
        tr.appendChild(el('td', { class: 'select' }, el('input', {
          type: 'radio', name: 'tw-select', checked,
          onclick: (e) => { e.stopPropagation(); selection.onSelect(checked ? null : row.id); },
        })));
      }
      columns.forEach((c) => {
        const content = c.render ? c.render(row) : (row[c.key] ?? '—');
        const isActions = c.className === 'actions';
        const td = el('td', { class: [c.numeric ? 'num' : (c.className || ''), (onRowClick && !isActions) ? 'tw-clickable' : ''].filter(Boolean).join(' ') });
        if (onRowClick && !isActions) td.addEventListener('click', () => onRowClick(row));
        if (content instanceof Node) td.appendChild(content); else td.textContent = content;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}

// ---------- impostazioni ----------
// Pulsante a rotella nel toolbar di una scheda, verso la pagina Impostazioni
// (liste configurabili). Lettura aperta a tutti; chi non è admin vede le
// liste ma non può modificarle (coerente con /api/categorie).
export function settingsGear(hint = 'Impostazioni') {
  return el('a', { href: '#/impostazioni', class: 'btn btn--sm btn--ghost btn--icon', title: hint, 'aria-label': hint }, '⚙');
}

export function pill(text, variant = 'normale') {
  return el('span', { class: `pill pill--${variant}` }, text);
}
