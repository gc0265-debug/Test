// Editor di markup sui disegni (PDF o immagine) caricati in Documenti.
// Le forme sono vettoriali (vedi schema markup_disegni) e si ridisegnano
// sempre da zero su un canvas trasparente sopra il disegno, mai incise
// nel file originale: ogni "Salva" crea una nuova sessione storicizzata,
// mai una sovrascrittura. L'esportazione in PDF riusa la stessa funzione
// di disegno per comporre ogni pagina (disegno + markup) in un'immagine,
// che il server assembla in un PDF — niente doppia implementazione delle
// forme fra editor ed esportazione.

import { api } from '../api.js';
import { el, openModal, closeModal, toast, confirmDialog } from '../components/ui.js';

let workerConfigurato = false;
function assicuraWorkerPdf() {
  if (workerConfigurato) return;
  if (typeof window.pdfjsLib === 'undefined') return;
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
  workerConfigurato = true;
}

// Risoluzione fissa (pixel per punto PDF) usata per tutta la sessione di
// editing e per l'esportazione: tenerla costante evita di dover
// riconvertire le coordinate delle forme quando si passa dall'editor
// all'esportazione, che riusa gli stessi canvas già renderizzati.
const RENDER_SCALE = 2;

const STRUMENTI = [
  ['seleziona', 'Seleziona'],
  ['penna', 'Penna'],
  ['evidenziatore', 'Evidenziatore'],
  ['linea', 'Linea'],
  ['freccia', 'Freccia'],
  ['rettangolo', 'Rettangolo'],
  ['ellisse', 'Ellisse'],
  ['nuvola', 'Nuvola'],
  ['testo', 'Testo'],
];
const COLORI = ['#C0332B', '#1F3A4D', '#1E7A3B', '#E0A400', '#8E44AD', '#111111'];
const SPESSORI = [
  ['S', 2],
  ['M', 4],
  ['L', 7],
];

export function documentoSupportaMarkup(documento) {
  return !!documento.file_mime && (documento.file_mime === 'application/pdf' || documento.file_mime.startsWith('image/'));
}

export async function apriMarkup(documento) {
  if (!documentoSupportaMarkup(documento)) {
    toast('Il markup è disponibile solo su disegni PDF o immagine.', { error: true });
    return;
  }
  assicuraWorkerPdf();
  if (typeof window.pdfjsLib === 'undefined') {
    toast('Libreria PDF non disponibile: ricarica la pagina.', { error: true });
    return;
  }

  const fileUrl = `/api/documenti/${documento.id}/file`;
  const isPdf = documento.file_mime === 'application/pdf';

  // ---- stato dell'editor (vive per tutta l'apertura del modale) ----
  let pdfDoc = null;       // documento pdf.js, solo se isPdf
  let img = null;          // HTMLImageElement, solo se !isPdf
  let numPagine = 1;
  let paginaCorrente = 1;
  const canvasBasePerPagina = new Map();   // pagina -> canvas già renderizzato (cache)
  const shapesPerPagina = new Map();       // pagina -> array di forme correnti
  const cronologiaPerPagina = new Map();   // pagina -> { snapshot:[[...]], puntatore }
  const sessioniCaricatePerPagina = new Set(); // pagine per cui si è già interrogato il server

  let strumento = 'seleziona';
  let colore = COLORI[0];
  let spessore = SPESSORI[1][1];
  let zoom = 1;
  let selezionata = -1;
  let formaInCorso = null;

  // ---- DOM ----
  const canvasWrap = el('div', { class: 'markup-canvaswrap' });
  const baseCanvas = el('canvas', { class: 'markup-canvas markup-canvas--base' });
  const overlayCanvas = el('canvas', { class: 'markup-canvas markup-canvas--overlay' });
  canvasWrap.appendChild(baseCanvas);
  canvasWrap.appendChild(overlayCanvas);
  const canvasArea = el('div', { class: 'markup-area' }, canvasWrap);

  const strumentiHost = el('div', { class: 'markup-toolbar__gruppo' });
  const coloriHost = el('div', { class: 'markup-toolbar__gruppo' });
  const spessoriHost = el('div', { class: 'markup-toolbar__gruppo' });
  const paginaHost = el('div', { class: 'markup-toolbar__gruppo' });
  const cronologiaHost = el('div', { class: 'markup-toolbar__gruppo' });

  const btnAnnulla = el('button', { class: 'btn btn--sm btn--ghost', title: 'Annulla', onclick: () => annulla() }, '↶');
  const btnRipeti = el('button', { class: 'btn btn--sm btn--ghost', title: 'Ripeti', onclick: () => ripeti() }, '↷');
  const btnZoomMeno = el('button', { class: 'btn btn--sm btn--ghost', onclick: () => impostaZoom(zoom - 0.2) }, '−');
  const btnZoomPiu = el('button', { class: 'btn btn--sm btn--ghost', onclick: () => impostaZoom(zoom + 0.2) }, '+');
  const zoomLabel = el('span', { class: 'markup-zoom-label' }, '100%');
  const btnSalva = el('button', { class: 'btn btn--primary btn--sm', onclick: () => salvaPagina() }, 'Salva markup');
  const btnEsporta = el('button', { class: 'btn btn--sm', onclick: () => esportaPdf() }, 'Esporta PDF');

  const toolbar = el('div', { class: 'markup-toolbar' }, [
    strumentiHost, coloriHost, spessoriHost,
    el('div', { class: 'markup-toolbar__gruppo' }, [btnAnnulla, btnRipeti]),
    el('div', { class: 'markup-toolbar__gruppo' }, [btnZoomMeno, zoomLabel, btnZoomPiu]),
    paginaHost,
    cronologiaHost,
    el('div', { class: 'markup-toolbar__gruppo markup-toolbar__gruppo--destra' }, [btnSalva, btnEsporta]),
  ]);

  const root = el('div', { class: 'markup-editor' }, [toolbar, canvasArea]);
  openModal(`Markup — ${documento.titolo}`, root, { full: true });

  // ---- strumenti / colori / spessori ----
  function disegnaControlliStrumenti() {
    strumentiHost.innerHTML = '';
    STRUMENTI.forEach(([key, label]) => {
      strumentiHost.appendChild(el('button', {
        class: 'btn btn--sm btn--ghost' + (strumento === key ? ' is-active' : ''),
        onclick: () => { strumento = key; selezionata = -1; disegnaControlliStrumenti(); ridisegnaOverlay(); },
      }, label));
    });
  }
  function disegnaControlliColori() {
    coloriHost.innerHTML = '';
    COLORI.forEach((c) => {
      coloriHost.appendChild(el('button', {
        class: 'markup-swatch' + (colore === c ? ' is-active' : ''),
        style: `background:${c}`, title: c,
        onclick: () => { colore = c; disegnaControlliColori(); aggiornaColoreSelezionata(); },
      }));
    });
  }
  function disegnaControlliSpessori() {
    spessoriHost.innerHTML = '';
    SPESSORI.forEach(([label, val]) => {
      spessoriHost.appendChild(el('button', {
        class: 'btn btn--sm btn--ghost' + (spessore === val ? ' is-active' : ''),
        onclick: () => { spessore = val; disegnaControlliSpessori(); },
      }, label));
    });
  }
  function aggiornaColoreSelezionata() {
    if (selezionata < 0) return;
    const shapes = shapesPerPagina.get(paginaCorrente);
    if (shapes[selezionata]) { shapes[selezionata].colore = colore; pushCronologia(); ridisegnaOverlay(); }
  }
  disegnaControlliStrumenti();
  disegnaControlliColori();
  disegnaControlliSpessori();

  // ---- caricamento sorgente (PDF o immagine) ----
  if (isPdf) {
    pdfDoc = await window.pdfjsLib.getDocument({ url: fileUrl, withCredentials: true }).promise;
    numPagine = pdfDoc.numPages;
  } else {
    img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('immagine non leggibile'));
      i.src = fileUrl;
    });
    numPagine = 1;
  }
  disegnaControlliPagina();
  await vaiAllaPagina(1);

  function disegnaControlliPagina() {
    paginaHost.innerHTML = '';
    if (numPagine <= 1) return;
    paginaHost.appendChild(el('button', { class: 'btn btn--sm btn--ghost', onclick: () => vaiAllaPagina(paginaCorrente - 1) }, '‹'));
    paginaHost.appendChild(el('span', { class: 'markup-zoom-label' }, `Pagina ${paginaCorrente} di ${numPagine}`));
    paginaHost.appendChild(el('button', { class: 'btn btn--sm btn--ghost', onclick: () => vaiAllaPagina(paginaCorrente + 1) }, '›'));
  }

  // ---- render di una pagina sul canvas base (con cache) ----
  async function canvasPerPagina(n) {
    if (canvasBasePerPagina.has(n)) return canvasBasePerPagina.get(n);
    const c = document.createElement('canvas');
    if (isPdf) {
      const page = await pdfDoc.getPage(n);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      c.width = viewport.width;
      c.height = viewport.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
    } else {
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
    }
    canvasBasePerPagina.set(n, c);
    return c;
  }

  async function caricaUltimaSessione(n) {
    if (sessioniCaricatePerPagina.has(n)) return;
    sessioniCaricatePerPagina.add(n);
    try {
      const res = await api.get(`/documenti/${documento.id}/markup?pagina=${n}`);
      if (res.data.length) {
        const ultima = await api.get(`/documenti/${documento.id}/markup/${res.data[0].id}`);
        shapesPerPagina.set(n, ultima.shapes);
        return;
      }
    } catch (_) { /* nessuna sessione precedente, pagina vuota va bene */ }
    if (!shapesPerPagina.has(n)) shapesPerPagina.set(n, []);
  }

  async function vaiAllaPagina(n) {
    if (n < 1 || n > numPagine) return;
    paginaCorrente = n;
    selezionata = -1;
    disegnaControlliPagina();
    await caricaUltimaSessione(n);
    if (!cronologiaPerPagina.has(n)) {
      cronologiaPerPagina.set(n, { snapshot: [JSON.parse(JSON.stringify(shapesPerPagina.get(n)))], puntatore: 0 });
    }
    const base = await canvasPerPagina(n);
    baseCanvas.width = base.width; baseCanvas.height = base.height;
    baseCanvas.getContext('2d').drawImage(base, 0, 0);
    overlayCanvas.width = base.width; overlayCanvas.height = base.height;
    if (zoom === 1) adattaZoomIniziale(base);
    applicaZoom();
    ridisegnaOverlay();
    await aggiornaCronologiaDropdown();
  }

  function adattaZoomIniziale(base) {
    const areaRect = canvasArea.getBoundingClientRect();
    const fattore = Math.min((areaRect.width - 40) / base.width, (areaRect.height - 40) / base.height, 1.4);
    zoom = Math.max(0.2, fattore);
  }

  function impostaZoom(nuovo) {
    zoom = Math.min(3, Math.max(0.2, nuovo));
    applicaZoom();
  }
  function applicaZoom() {
    const w = baseCanvas.width * zoom, h = baseCanvas.height * zoom;
    [baseCanvas, overlayCanvas].forEach((c) => { c.style.width = `${w}px`; c.style.height = `${h}px`; });
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  // ---- cronologia (undo/redo) ----
  function pushCronologia() {
    const stato = cronologiaPerPagina.get(paginaCorrente);
    const shapes = shapesPerPagina.get(paginaCorrente);
    stato.snapshot = stato.snapshot.slice(0, stato.puntatore + 1);
    stato.snapshot.push(JSON.parse(JSON.stringify(shapes)));
    stato.puntatore = stato.snapshot.length - 1;
  }
  function annulla() {
    const stato = cronologiaPerPagina.get(paginaCorrente);
    if (!stato || stato.puntatore <= 0) return;
    stato.puntatore -= 1;
    shapesPerPagina.set(paginaCorrente, JSON.parse(JSON.stringify(stato.snapshot[stato.puntatore])));
    selezionata = -1;
    ridisegnaOverlay();
  }
  function ripeti() {
    const stato = cronologiaPerPagina.get(paginaCorrente);
    if (!stato || stato.puntatore >= stato.snapshot.length - 1) return;
    stato.puntatore += 1;
    shapesPerPagina.set(paginaCorrente, JSON.parse(JSON.stringify(stato.snapshot[stato.puntatore])));
    selezionata = -1;
    ridisegnaOverlay();
  }

  // ---- sessioni salvate (cronologia consultabile) ----
  async function aggiornaCronologiaDropdown() {
    cronologiaHost.innerHTML = '';
    const res = await api.get(`/documenti/${documento.id}/markup?pagina=${paginaCorrente}`);
    if (!res.data.length) return;
    const sel = el('select', {
      onchange: async (e) => {
        if (!e.target.value) return;
        if (!confirmDialog('Caricare questa sessione? Le forme attuali di questa pagina (se non salvate) andranno perse.')) { e.target.value = ''; return; }
        const sessione = await api.get(`/documenti/${documento.id}/markup/${e.target.value}`);
        shapesPerPagina.set(paginaCorrente, sessione.shapes);
        pushCronologia();
        selezionata = -1;
        ridisegnaOverlay();
        e.target.value = '';
      },
    }, [
      el('option', { value: '' }, 'Cronologia sessioni…'),
      ...res.data.map((s) => el('option', { value: s.id },
        `${new Date(s.created_at * 1000).toLocaleDateString('it-IT')} — ${s.autore_nome || '—'}${s.titolo ? ' · ' + s.titolo : ''}`)),
    ]);
    cronologiaHost.appendChild(sel);
  }

  async function salvaPagina() {
    try {
      await api.post(`/documenti/${documento.id}/markup`, { pagina: paginaCorrente, shapes: shapesPerPagina.get(paginaCorrente) });
      toast(`Markup della pagina ${paginaCorrente} salvato.`);
      await aggiornaCronologiaDropdown();
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  // ---- disegno delle forme ----
  function boundingBox(s) {
    switch (s.tipo) {
      case 'penna': case 'evidenziatore': {
        const xs = s.punti.map((p) => p.x), ys = s.punti.map((p) => p.y);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      }
      case 'linea': case 'freccia':
        return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
      case 'rettangolo': case 'ellisse': case 'nuvola':
        return { x: s.x, y: s.y, w: s.w, h: s.h };
      case 'testo':
        return { x: s.x, y: s.y - s.dimensione, w: Math.max(40, (s.testo || '').length * s.dimensione * 0.55), h: s.dimensione * 1.4 };
      default:
        return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  function disegnaNuvola(ctx, x, y, w, h) {
    const raggio = Math.max(8, Math.min(Math.abs(w), Math.abs(h)) / 8);
    const passo = raggio * 1.7;
    const angoli = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
    ctx.beginPath();
    let primo = true;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = angoli[i], [x2, y2] = angoli[i + 1];
      const dx = x2 - x1, dy = y2 - y1;
      const lunghezza = Math.hypot(dx, dy) || 1;
      const ux = dx / lunghezza, uy = dy / lunghezza;
      const nx = uy, ny = -ux; // normale verso l'esterno (poligono percorso in senso orario)
      const n = Math.max(1, Math.round(lunghezza / passo));
      for (let k = 0; k < n; k++) {
        const sx = x1 + ux * lunghezza * (k / n), sy = y1 + uy * lunghezza * (k / n);
        const ex = x1 + ux * lunghezza * ((k + 1) / n), ey = y1 + uy * lunghezza * ((k + 1) / n);
        const mx = (sx + ex) / 2 + nx * passo / 2, my = (sy + ey) / 2 + ny * passo / 2;
        if (primo) { ctx.moveTo(sx, sy); primo = false; }
        ctx.quadraticCurveTo(mx, my, ex, ey);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  function disegnaForma(ctx, s, evidenziata) {
    ctx.save();
    ctx.strokeStyle = s.colore; ctx.fillStyle = s.colore;
    ctx.lineWidth = s.spessore || 3;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (s.tipo === 'evidenziatore') { ctx.globalAlpha = 0.35; ctx.lineWidth = (s.spessore || 3) * 3; }

    switch (s.tipo) {
      case 'penna': case 'evidenziatore': {
        ctx.beginPath();
        s.punti.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        break;
      }
      case 'linea':
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        break;
      case 'freccia': {
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        const angolo = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        const lp = 10 + (s.spessore || 3) * 2.2, apertura = Math.PI / 7;
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 - lp * Math.cos(angolo - apertura), s.y2 - lp * Math.sin(angolo - apertura));
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 - lp * Math.cos(angolo + apertura), s.y2 - lp * Math.sin(angolo + apertura));
        ctx.stroke();
        break;
      }
      case 'rettangolo':
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        break;
      case 'ellisse':
        ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w) / 2, Math.abs(s.h) / 2, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'nuvola':
        disegnaNuvola(ctx, s.x, s.y, s.w, s.h);
        break;
      case 'testo': {
        ctx.font = `600 ${s.dimensione}px Montserrat, Arial, sans-serif`;
        const larghezza = ctx.measureText(s.testo).width;
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(s.x - 3, s.y - s.dimensione - 1, larghezza + 6, s.dimensione + 8);
        ctx.globalAlpha = 1; ctx.fillStyle = s.colore;
        ctx.fillText(s.testo, s.x, s.y);
        break;
      }
      default: break;
    }
    ctx.restore();

    if (evidenziata) {
      const b = boundingBox(s);
      ctx.save();
      ctx.strokeStyle = '#1F3A4D'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
      ctx.restore();
    }
  }

  function ridisegnaOverlay() {
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    const shapes = shapesPerPagina.get(paginaCorrente) || [];
    shapes.forEach((s, i) => disegnaForma(ctx, s, i === selezionata));
    if (formaInCorso) disegnaForma(ctx, formaInCorso, false);
  }

  function puntoNelBox(x, y, b, tolleranza = 8) {
    return x >= b.x - tolleranza && x <= b.x + b.w + tolleranza && y >= b.y - tolleranza && y <= b.y + b.h + tolleranza;
  }
  function formaAlPunto(x, y) {
    const shapes = shapesPerPagina.get(paginaCorrente) || [];
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (puntoNelBox(x, y, boundingBox(shapes[i]))) return i;
    }
    return -1;
  }

  function posizioneCanvas(evt) {
    const rect = overlayCanvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (overlayCanvas.width / rect.width),
      y: (evt.clientY - rect.top) * (overlayCanvas.height / rect.height),
    };
  }

  // ---- interazione ----
  let trascinamento = null; // { tipo:'nuova'|'sposta', ... }

  overlayCanvas.addEventListener('pointerdown', (evt) => {
    overlayCanvas.setPointerCapture(evt.pointerId);
    const { x, y } = posizioneCanvas(evt);

    if (strumento === 'seleziona') {
      const idx = formaAlPunto(x, y);
      selezionata = idx;
      if (idx >= 0) trascinamento = { tipo: 'sposta', idx, dx: 0, dy: 0, ultimoX: x, ultimoY: y };
      ridisegnaOverlay();
      return;
    }
    if (strumento === 'testo') {
      apriInputTesto(x, y);
      return;
    }
    if (strumento === 'penna' || strumento === 'evidenziatore') {
      formaInCorso = { tipo: strumento, colore, spessore, punti: [{ x, y }] };
    } else if (strumento === 'linea' || strumento === 'freccia') {
      formaInCorso = { tipo: strumento, colore, spessore, x1: x, y1: y, x2: x, y2: y };
    } else {
      formaInCorso = { tipo: strumento, colore, spessore, x, y, w: 0, h: 0, _ancoraX: x, _ancoraY: y };
    }
  });

  overlayCanvas.addEventListener('pointermove', (evt) => {
    const { x, y } = posizioneCanvas(evt);
    if (trascinamento?.tipo === 'sposta') {
      const shapes = shapesPerPagina.get(paginaCorrente);
      const s = shapes[trascinamento.idx];
      const dx = x - trascinamento.ultimoX, dy = y - trascinamento.ultimoY;
      spostaForma(s, dx, dy);
      trascinamento.ultimoX = x; trascinamento.ultimoY = y;
      ridisegnaOverlay();
      return;
    }
    if (!formaInCorso) return;
    if (formaInCorso.tipo === 'penna' || formaInCorso.tipo === 'evidenziatore') {
      formaInCorso.punti.push({ x, y });
    } else if (formaInCorso.tipo === 'linea' || formaInCorso.tipo === 'freccia') {
      formaInCorso.x2 = x; formaInCorso.y2 = y;
    } else {
      formaInCorso.x = Math.min(x, formaInCorso._ancoraX);
      formaInCorso.y = Math.min(y, formaInCorso._ancoraY);
      formaInCorso.w = Math.abs(x - formaInCorso._ancoraX);
      formaInCorso.h = Math.abs(y - formaInCorso._ancoraY);
    }
    ridisegnaOverlay();
  });

  overlayCanvas.addEventListener('pointerup', () => {
    if (trascinamento?.tipo === 'sposta') { trascinamento = null; pushCronologia(); return; }
    if (!formaInCorso) return;
    const shapes = shapesPerPagina.get(paginaCorrente);
    delete formaInCorso._ancoraX; delete formaInCorso._ancoraY;
    // scarta forme degeneri (click senza trascinamento su rettangolo/ellisse/nuvola/linea)
    const b = boundingBox(formaInCorso);
    const trascurabile = ['rettangolo', 'ellisse', 'nuvola'].includes(formaInCorso.tipo) && b.w < 3 && b.h < 3;
    const lineaTrascurabile = ['linea', 'freccia'].includes(formaInCorso.tipo) && Math.hypot(b.w, b.h) < 3;
    if (!trascurabile && !lineaTrascurabile) {
      shapes.push(formaInCorso);
      pushCronologia();
    }
    formaInCorso = null;
    ridisegnaOverlay();
  });

  function spostaForma(s, dx, dy) {
    switch (s.tipo) {
      case 'penna': case 'evidenziatore':
        s.punti.forEach((p) => { p.x += dx; p.y += dy; });
        break;
      case 'linea': case 'freccia':
        s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy;
        break;
      case 'rettangolo': case 'ellisse': case 'nuvola':
        s.x += dx; s.y += dy;
        break;
      case 'testo':
        s.x += dx; s.y += dy;
        break;
      default: break;
    }
  }

  // tasto Canc/Backspace elimina la forma selezionata; funziona solo
  // mentre l'editor di markup è aperto, rimosso alla chiusura del modale.
  function onKeydown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selezionata >= 0 && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
      const shapes = shapesPerPagina.get(paginaCorrente);
      shapes.splice(selezionata, 1);
      selezionata = -1;
      pushCronologia();
      ridisegnaOverlay();
    }
  }
  document.addEventListener('keydown', onKeydown);
  const osservaChiusura = new MutationObserver(() => {
    if (document.getElementById('modalLayer')?.hidden) {
      document.removeEventListener('keydown', onKeydown);
      osservaChiusura.disconnect();
    }
  });
  osservaChiusura.observe(document.getElementById('modalLayer'), { attributes: true, attributeFilter: ['hidden'] });

  function apriInputTesto(x, y) {
    const rect = overlayCanvas.getBoundingClientRect();
    const input = el('textarea', { class: 'markup-text-input' });
    input.style.left = `${rect.left + x * (rect.width / overlayCanvas.width)}px`;
    input.style.top = `${rect.top + (y - spessore * 6) * (rect.height / overlayCanvas.height)}px`;
    document.body.appendChild(input);
    // il focus va rimandato al tick successivo: chiamato subito dentro
    // l'handler di pointerdown verrebbe sovrascritto dal focus "di
    // default" che il browser assegna al termine dello stesso evento,
    // facendo perdere il focus alla textarea un istante dopo averlo
    // ottenuto (e quindi triggerando subito il suo "blur").
    setTimeout(() => input.focus(), 0);
    function commit() {
      const testo = input.value.trim();
      input.remove();
      if (!testo) return;
      const shapes = shapesPerPagina.get(paginaCorrente);
      shapes.push({ tipo: 'testo', colore, dimensione: 14 + spessore * 2, x, y, testo });
      pushCronologia();
      ridisegnaOverlay();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = ''; input.blur(); }
    });
  }

  // ---- esportazione PDF con markup incorporato ----
  async function esportaPdf() {
    btnEsporta.disabled = true;
    btnEsporta.textContent = 'Esportazione…';
    try {
      const pagine = [];
      for (let n = 1; n <= numPagine; n++) {
        const base = await canvasPerPagina(n);
        if (!shapesPerPagina.has(n)) await caricaUltimaSessione(n);
        const composito = document.createElement('canvas');
        composito.width = base.width; composito.height = base.height;
        const ctx = composito.getContext('2d');
        ctx.drawImage(base, 0, 0);
        (shapesPerPagina.get(n) || []).forEach((s) => disegnaForma(ctx, s, false));
        pagine.push({ pagina: n, scala: isPdf ? RENDER_SCALE : 1, immagine: composito.toDataURL('image/png') });
      }
      const nuovo = await api.post(`/documenti/${documento.id}/markup/esporta`, { pagine });
      toast(`PDF esportato: "${nuovo.titolo}".`);
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      btnEsporta.disabled = false;
      btnEsporta.textContent = 'Esporta PDF';
    }
  }
}
