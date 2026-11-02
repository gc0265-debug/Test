import { state, loadCommesse, setCommessa, setGruppo, gruppiDisponibili, subscribe } from './state.js';
import { route, startRouter, navigate } from './router.js';
import { getCurrentUser, logout } from './auth.js';
import { openSicurezzaAccount } from './pages/account.js';
import { renderLogin } from './pages/login.js';
import { el } from './components/ui.js';
import { initRicercaGlobale } from './components/ricercaGlobale.js';
import { initGuidaSupporto } from './components/guidaSupporto.js';
import { avviaLiveSync } from './components/liveSync.js';
import { renderCruscotto } from './pages/cruscotto.js';
import { renderCriticita } from './pages/criticita.js';
import { renderDecisioni } from './pages/decisioni.js';
import { renderAllert } from './pages/allert.js';
import { renderTimeline } from './pages/timeline.js';
import { renderLezioniApprese } from './pages/lezioniApprese.js';
import { renderRequisiti } from './pages/requisiti.js';
import { renderCapitolato } from './pages/capitolato.js';
import { renderApprovazioniDrawings } from './pages/approvazioniDrawings.js';
import { renderContratto } from './pages/contratto.js';
import { renderStakeholder } from './pages/stakeholder.js';
import { renderComunicazione } from './pages/comunicazione.js';
import { renderNote } from './pages/note.js';
import { renderDiario } from './pages/diario.js';
import { renderLavorazioni } from './pages/lavorazioni.js';
import { renderSal } from './pages/sal.js';
import { renderMaestranze } from './pages/maestranze.js';
import { renderDocumenti } from './pages/documenti.js';
import { renderReport } from './pages/report.js';
import { renderCommesse } from './pages/commesse.js';
import { renderUtenti } from './pages/utenti.js';
import { renderImpostazioni } from './pages/impostazioni.js';
import { renderFinanziaria } from './pages/finanziaria.js';

route('cruscotto', {
  title: 'Cruscotto', render: renderCruscotto,
  help: 'Home page della commessa: scadenze della settimana in cima, un box per ogni registro con i numeri chiave (clicca il titolo del box per aprire l\'elenco), cronologia delle ultime modifiche in fondo. Solo lettura: i dati arrivano dagli altri registri, qui non si inserisce nulla.',
});
route('criticita', {
  title: 'Registro Criticità', render: renderCriticita,
  help: 'Una criticità per Work Package, con urgenza "viola" (risposta a scadenza, tipicamente 3 giorni) o "verde" (risposta dovuta dalla controparte, senza termine fisso). Le viola scadute compaiono per prime in tabella.',
});
route('decisioni', {
  title: 'Registro Decisioni', render: renderDecisioni,
  help: 'Domande chiuse (SÌ/NO) rivolte a DL/SAC/GC, con anzianità in giorni e tasso di resa. Usa i filtri a tendina (WP, stato, urgenti) e l\'interruttore "Raggruppa per WP" per leggere rapidamente le pendenze di un singolo Work Package.',
});
route('allert', {
  title: 'Registro Allert', render: renderAllert,
  help: 'Classificazione di perimetro e azioni di tutela (funzione di presidio GC): puoi collegare un allert a una criticità o decisione già registrata. Struttura ispirata al Registro Allert del presidio GC, non una sincronizzazione automatica con quel fascicolo.',
});
route('timeline', {
  title: 'Timeline Montaggi', render: renderTimeline,
  help: 'Gantt per settimane/mesi su milestone e lavorazioni insieme, raggruppate per Piano. Ogni milestone congela una baseline alla creazione: se le date si spostano, la barra originale resta visibile in trasparenza accanto a quella attuale, per mostrare lo scostamento. Si possono collegare predecessori fra le attività (Fine-Inizio, con ritardo opzionale): le frecce nel Gantt mostrano i collegamenti, quelle rosse sul percorso critico, quelle tratteggiate in conflitto con le date attuali — senza mai spostare nessuna data da sola.',
});
route('lezioni', {
  title: 'Lezioni Apprese', render: renderLezioniApprese,
  help: 'Raccolte dalle altre sezioni (criticità, decisioni, allert) tramite collegamento opzionale, per non ripetere gli stessi errori sulla prossima commessa. Vista a righe cliccabili: numero, data e descrizione.',
});
route('requisiti', {
  title: 'Requisiti', render: renderRequisiti,
  help: 'Requisiti estratti da un capitolato, con codice WBS e fase di esecuzione. Ogni modifica a titolo/descrizione crea una nuova versione (pulsante "Versioni"); "Richiedi approvazione" crea una decisione collegata nel Registro Decisioni, dove confluiscono tutte le approvazioni.',
});
route('capitolato', {
  title: 'Capitolato Requisiti', render: renderCapitolato,
  help: 'Scrittura in stile tabella con codici WBS, raggruppata per contratto: ogni voce è una riga che si apre come un documento, con i Requisiti collegati come sottorighe modificabili senza uscire dalla vista.',
});
route('approvazioni-drawings', {
  title: 'Approvazioni Drawings', render: renderApprovazioniDrawings,
  help: 'Elenco elaborati (drawing) sottoposti ad approvazione, a mano o importati da Excel. Lo stato Emissione (IFA/IFC) segue la disciplina shop drawing — IFA = non valido per fabbricazione, IFC = emesso per costruzione dopo il visto formale — e la Data limite approvazione (cut-off) evidenzia in rosso i ritardi della Direzione Lavori rispetto al programma di consegna. Il pulsante "Matrice" apre la Response Matrix: i commenti ricevuti su una revisione, con la risposta data e un flag "Change Order" per le richieste che cambiano lo scope invece di un dettaglio grafico.',
});
route('contratto', {
  title: 'Contratti', render: renderContratto,
  help: 'Baseline del capitolato e procedura di change management concordata in fase di stipula. Per ogni contratto con una data di baseline, mostra le versioni di requisiti successive (variazioni da gestire) con un\'azione rapida per segnalarle nel Registro Allert.',
});
route('stakeholder', {
  title: 'Registro Stakeholder', render: renderStakeholder,
  help: 'Matrice interesse/influenza (prassi di project management), usata anche come base per le assegnazioni RACI del Piano Comunicazioni. I nomi qui registrati alimentano i menu a tendina di Impresa in Lavorazioni, Maestranze e Contratti.',
});
route('comunicazione', {
  title: 'Piano Comunicazioni', render: renderComunicazione,
  help: 'Un processo di gestione per riga (riunione, aggiornamento registro, approvazione...) con frequenza, canale, output e una matrice RACI verso gli stakeholder della commessa.',
});
route('note', {
  title: 'Note di Coordinamento', render: renderNote,
  help: 'Agenda numerata verso un interlocutore (es. SAC/ATI), generabile in automatico dalle criticità aperte (per WP, se filtrate) e poi modificabile a mano prima dell\'invio.',
});
route('diario', {
  title: 'Diario di Cantiere', render: renderDiario,
  help: 'Diario giornaliero: squadre presenti, attività svolte, eventi e criticità rilevate in cantiere, una voce per data.',
});
route('lavorazioni', {
  title: 'Lavorazioni', render: renderLavorazioni,
  help: 'Elenco lavorazioni con stato, priorità, Piano/Zona e impresa, con i grafici di avanzamento in cima. Una lavorazione può avere sotto-attività stile MPP (max 2 livelli) e misure rilevate in opera per confrontare quota di progetto e quota reale. La stampa include grafici e un\'introduzione pensata per la condivisione esterna.',
});
route('sal', {
  title: 'SAL — Stato Avanzamento Lavori', render: renderSal,
  help: 'Registro di avanzamento fisico delle Lavorazioni (% di completamento) per Work Package e per Impresa — non un SAL contabile: nessuna quantità o prezzo unitario. "+ Chiudi nuovo SAL" congela l\'avanzamento attuale con un numero progressivo, confrontandolo automaticamente con l\'ultimo SAL chiuso.',
});
route('maestranze', {
  title: 'Maestranze', render: renderMaestranze,
  help: 'Anagrafica delle squadre/preposti in cantiere, con i fornitori collegati scelti dal Registro Stakeholder invece che scritti a mano.',
});
route('documenti', {
  title: 'Documenti', render: renderDocumenti,
  help: 'Un documento può avere un link esterno e/o un file caricato dal browser — in aggiunta, non in alternativa: una riga può avere entrambi, uno solo, o nessuno.',
});
route('report', {
  title: 'Report', render: renderReport,
  help: 'Configura report salvati che aggregano una o più sezioni (Criticità, Decisioni, Lavorazioni, Timeline...), filtrabili per Work Package e periodo. Ogni report si può scaricare in PDF, Word o Excel, o inviare via email in allegato.',
});
route('commesse', {
  title: 'Commesse', render: renderCommesse,
  help: 'Anagrafica delle commesse e dei rispettivi Work Package. Dopo ogni modifica il menu a tendina della sidebar e tutte le altre pagine si aggiornano automaticamente.',
});
route('utenti', {
  title: 'Utenti', render: renderUtenti,
  help: 'Gestione utenti, visibile solo agli amministratori. Un utente "cliente" ha accesso in sola lettura, limitato alle sole sezioni che scegli di concedergli qui.',
});
route('impostazioni', {
  title: 'Impostazioni', render: renderImpostazioni,
  help: 'Liste a tendina personalizzabili. Le liste libere (es. Tipo documento) accettano nuove opzioni; le etichette di stato permettono di rinominare solo il testo mostrato, non di aggiungere o togliere stati, perché guidano calcoli e colori già fissati nell\'app.',
});
route('finanziaria', {
  title: 'Dashboard Finanziaria', render: renderFinanziaria,
  help: 'Unica vista multi-commessa dell\'app: valore contratti e atti aggiuntivi aggregati su TUTTE le commesse, non solo quella selezionata in sidebar. Accesso riservato agli amministratori, per la sensibilità dei dati economici.',
});

function setupSidebarResize() {
  const handle = document.getElementById('sideResize');
  if (!handle) return;
  const MIN = 180, MAX = 420;
  try {
    const saved = Number(localStorage.getItem('side-w'));
    if (saved >= MIN && saved <= MAX) document.documentElement.style.setProperty('--side-w', `${saved}px`);
  } catch (_) { /* privacy mode: niente ricordo tra sessioni, nessun problema */ }

  let dragging = false;
  handle.addEventListener('mousedown', () => { dragging = true; handle.classList.add('active'); document.body.style.userSelect = 'none'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.min(MAX, Math.max(MIN, e.clientX));
    document.documentElement.style.setProperty('--side-w', `${w}px`);
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('active');
    document.body.style.userSelect = '';
    try { localStorage.setItem('side-w', parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side-w'), 10)); } catch (_) { /* vedi sopra */ }
  });
}

// Oltre alle commesse singole, propone in cima un'opzione "<gruppo> —
// tutte (N)" per ogni gruppo progetto con 2+ commesse (es. RSW Roma):
// selezionandola si attiva la vista aggregata sui registri, con ogni
// riga etichettata dal proprio codice commessa.
function renderCommessaSelect() {
  const select = document.getElementById('commessaSelect');
  select.innerHTML = '';

  const gruppi = gruppiDisponibili();
  if (gruppi.length) {
    gruppi.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = `gruppo:${g.nome}`;
      opt.textContent = `${g.nome} — tutte (${g.n})`;
      if (state.gruppoAttivo === g.nome) opt.selected = true;
      select.appendChild(opt);
    });
  }
  state.commesse.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.codice} — ${c.nome}`;
    if (!state.gruppoAttivo && c.id === state.commessaId) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = async (e) => {
    const v = e.target.value;
    if (v.startsWith('gruppo:')) {
      await setGruppo(v.slice('gruppo:'.length));
    } else {
      await setCommessa(v);
    }
    navigate();
  };
}

function renderUserBadge(user) {
  const host = document.getElementById('sideUser');
  host.innerHTML = '';
  const etichetteRuolo = { admin: 'Amministratore', operatore: 'Operatore', cliente: 'Cliente' };
  host.appendChild(el('div', { class: 'side-user' }, [
    el('div', {}, [
      el('div', { class: 'side-user__nome' }, user.nome),
      el('div', { class: 'side-user__ruolo' }, etichetteRuolo[user.ruolo] || user.ruolo),
    ]),
    el('div', { class: 'side-user__azioni' }, [
      el('button', {
        class: 'btn btn--sm btn--ghost', title: 'Sicurezza account',
        onclick: () => openSicurezzaAccount(user),
      }, '🔒'),
      el('button', {
        class: 'btn btn--sm btn--ghost',
        onclick: async () => { await logout(); window.location.reload(); },
      }, 'Esci'),
    ]),
  ]));
}

// Un utente "cliente" vede in sidebar solo le sezioni a cui gli è stato
// dato accesso (sezioni_consentite), mai la Gestione (Commesse/Utenti/
// Impostazioni) né la Dashboard Finanziaria — a prescindere da cosa è
// stato eventualmente salvato, qui è una lista chiusa per sicurezza.
function applyClientNavRestrictions(user) {
  if (user.ruolo !== 'cliente') return;
  const consentite = new Set(user.sezioni_consentite || []);
  const semprenascoste = new Set(['commesse', 'utenti', 'impostazioni', 'finanziaria']);
  document.querySelectorAll('.side__nav a[data-route]').forEach((a) => {
    const route = a.dataset.route;
    const visibile = !semprenascoste.has(route) && consentite.has(route);
    a.style.display = visibile ? '' : 'none';
  });
  document.querySelectorAll('.side__group').forEach((group) => {
    let sib = group.nextElementSibling;
    let haVociVisibili = false;
    while (sib && !sib.classList.contains('side__group')) {
      if (sib.tagName === 'A' && sib.style.display !== 'none') { haVociVisibili = true; break; }
      sib = sib.nextElementSibling;
    }
    group.style.display = haVociVisibili ? '' : 'none';
  });
}

async function main() {
  const user = await getCurrentUser();
  if (!user) { renderLogin(); return; }

  state.currentUser = user;
  renderUserBadge(user);
  document.querySelectorAll('[data-admin-only]').forEach((n) => { n.style.display = user.ruolo === 'admin' ? '' : 'none'; });
  applyClientNavRestrictions(user);

  await loadCommesse();
  renderCommessaSelect();
  subscribe(renderCommessaSelect);
  setupSidebarResize();
  initRicercaGlobale();
  initGuidaSupporto();
  avviaLiveSync();
  startRouter();
}

main().catch((err) => {
  document.getElementById('content').textContent = `Errore di avvio: ${err.message}. Verifica che il server sia in esecuzione.`;
  console.error(err);
});
