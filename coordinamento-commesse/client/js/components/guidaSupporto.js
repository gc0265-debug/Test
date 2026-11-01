// Guida e Supporto: la guida completa a tutte le funzioni dell'app, un
// solo pulsante raggiungibile da qualunque pagina (sidebar, sempre
// visibile) invece che un documento a parte. Diversa dalla guida in
// linea contestuale ("?" in alto in ogni scheda, e sotto ogni campo dei
// moduli): qui c'è la mappa intera, consultabile e cercabile mentre si
// lavora, organizzata nello stesso ordine della sidebar.
import { el, openModal } from './ui.js';

const GUIDA = [
  {
    gruppo: 'Introduzione',
    voci: [
      {
        id: 'guida-struttura', icona: '◉', titolo: 'Come è organizzata l\'app',
        punti: [
          'Ogni dato appartiene a una commessa: il menu in alto a sinistra sceglie la commessa attiva e tutte le pagine si aggiornano di conseguenza.',
          'Ogni commessa è divisa in Work Package (WP1, WP2...), usati come filtro e raggruppamento in quasi tutti i registri.',
          'Quando più commesse condividono lo stesso "Gruppo progetto", il menu propone anche una vista aggregata di sola lettura, con ogni riga etichettata dalla propria commessa di origine.',
        ],
      },
      {
        id: 'guida-ruoli', icona: '◎', titolo: 'Ruoli e accesso',
        punti: [
          'Amministratore: accesso completo, incluse Dashboard Finanziaria e Impostazioni.',
          'Operatore: accesso completo salvo Dashboard Finanziaria e Impostazioni.',
          'Cliente: sola lettura, limitato alle sole sezioni concesse singolarmente da un amministratore (pagina Utenti).',
        ],
      },
    ],
  },
  {
    gruppo: 'Commessa',
    voci: [
      {
        id: 'guida-cruscotto', icona: '◉', titolo: 'Cruscotto',
        intro: 'La home page della commessa: un colpo d\'occhio completo sullo stato del cantiere, senza entrare in ogni registro.',
        punti: [
          'In cima, "Scadenze della settimana" mostra senza bisogno di click le criticità urgenti, le milestone e i to-do con scadenza nei prossimi 7 giorni, con quelli scaduti in rosso.',
          'Il box "To-do e note veloci" permette di scrivere un promemoria rapido con una scadenza facoltativa, impostata a mano: avvicinandosi alla scadenza la nota si colora e compare tra le scadenze della settimana.',
          'Al centro, un box per ogni registro con i numeri chiave: cliccando il titolo si apre l\'elenco completo in una finestra, senza cambiare pagina.',
          'In fondo, "Attività recente" mostra la cronologia delle ultime modifiche su tutti i registri — è collassabile (clic sulla barra del titolo) e ricorda lo stato aperto/chiuso.',
        ],
      },
      {
        id: 'guida-finanziaria', icona: '€', titolo: 'Dashboard Finanziaria',
        intro: 'Riservata agli amministratori: l\'unica vista multi-commessa dell\'app.',
        punti: [
          'Aggrega il valore dei contratti e degli atti aggiuntivi su tutte le commesse, non solo quella selezionata in sidebar.',
          'Una scheda dedicata raccoglie i contratti con i fornitori, pescati dal Registro Contratti, con righe cliccabili per aprirne il dettaglio e riassegnarli rapidamente a un\'altra commessa.',
        ],
      },
      {
        id: 'guida-sal', icona: '◈', titolo: 'SAL — Stato Avanzamento Lavori',
        intro: 'Avanzamento fisico del cantiere, costruito sui dati di Lavorazioni — non un SAL contabile (niente quantità o prezzi unitari).',
        punti: [
          'Calcola la percentuale di completamento delle lavorazioni per Work Package e per Impresa, aggiornata in tempo reale.',
          '"+ Chiudi nuovo SAL" congela l\'avanzamento attuale con un numero progressivo e lo confronta con l\'ultimo SAL chiuso, mostrando il delta.',
          'Lo storico resta consultabile, stampabile ed eliminabile in caso di errore.',
        ],
      },
      {
        id: 'guida-documenti', icona: '▣', titolo: 'Documenti',
        intro: 'L\'archivio della commessa, con cartelle nidificate a piacere e markup sui disegni.',
        punti: [
          'Ogni documento può avere un link esterno e/o un file caricato — in aggiunta, non in alternativa.',
          'Sui disegni in PDF o immagine, cliccare direttamente la riga apre l\'anteprima con gli strumenti di markup (penna, evidenziatore, nuvola di revisione, testo...) e le note, senza passare da un pulsante separato.',
          '"Segnala criticità" su una o più annotazioni selezionate crea righe nel Registro Criticità già collegate al disegno e alla pagina.',
          'Ogni "Salva markup" crea una nuova sessione datata, senza mai sovrascrivere le precedenti: tutte restano consultabili (e singolarmente eliminabili) dal menu "Cronologia sessioni".',
        ],
      },
      {
        id: 'guida-report', icona: '▥', titolo: 'Report',
        intro: 'Report salvati che aggregano una o più sezioni, da rigenerare invece di ricostruire a mano lo stesso export.',
        punti: [
          'Si configurano scegliendo le sezioni (Criticità, Decisioni, Lavorazioni, Timeline...), filtrabili per Work Package e periodo.',
          'Ogni report si scarica in PDF, Word o Excel, o si invia via email in allegato.',
        ],
      },
    ],
  },
  {
    gruppo: 'Coordinamento',
    voci: [
      {
        id: 'guida-timeline', icona: '▬', titolo: 'Timeline Montaggi',
        intro: 'Il Gantt della commessa, in stile MS Project: milestone e lavorazioni insieme sulla stessa linea del tempo.',
        punti: [
          'Una barra sempre visibile in cima mostra le lavorazioni attualmente in corso, senza dover scorrere il Gantt per trovarle.',
          'Ogni riga ha una numerazione WBS (1, 1.1, 1.1.1...), la Durata in giorni, il codice dei Predecessori (es. "2.1FS+2gg") e una colonna Avanzamento % mostrata come barra scura sovrapposta a quella di stato.',
          'Le attività si raggruppano per Piano, con barra riassuntiva comprimibile; una lavorazione può avere sotto-attività (fino a 2 livelli), con la madre che diventa una riga di riepilogo.',
          'Ogni milestone congela una baseline alla creazione: se le date si spostano, la barra originale resta visibile in trasparenza, sovrapposta per metà a quella attuale, con le relative colonne "Base. inizio"/"Base. fine" a confronto con "Inizio"/"Fine".',
          'Si trascina direttamente la barra per spostare le date (un clic senza trascinare apre il modulo di modifica); zoom continuo e vista Settimane/Mesi/Trimestri/Semestri; colori delle barre personalizzabili dal pulsante "Colori".',
        ],
      },
      {
        id: 'guida-lavorazioni', icona: '⚙', titolo: 'Lavorazioni',
        intro: 'L\'elenco operativo delle lavorazioni di montaggio, con stato di avanzamento.',
        punti: [
          'Stato (Da fare/In corso/Completata/Bloccata), priorità, Piano/Zona, date, impresa (da Contratto o da Registro Stakeholder) e un\'Avanzamento % modificabile a mano, indipendente dallo stato.',
          'Filtri a bottone per Work Package e per stato in alto, un clic per applicarli.',
          '"Misure rilevate in opera" confronta quota di progetto e quota misurata, calcola lo scostamento e permette di segnalarlo nel Registro Criticità con un click.',
          'Due grafici (barre e torta) mostrano la distribuzione per stato; la stampa include i grafici e un\'introduzione pensata per la condivisione con il cliente.',
        ],
      },
      {
        id: 'guida-criticita', icona: '▲', titolo: 'Registro Criticità',
        intro: 'Le richieste aperte verso la Direzione Lavori o altre controparti, con scadenza di risposta quando serve.',
        punti: [
          'Urgenza "Urgente (3gg)" impone una scadenza ed entra tra le scadenze della settimana sul Cruscotto; "Dovuta da controparte" è un sollecito senza termine fisso; "Normale" non ha scadenza.',
          'Le urgenti scadute compaiono sempre per prime in tabella, evidenziate in rosso. Filtri a bottone per stato e Work Package in alto.',
          'Supporta import ed esportazione Excel.',
        ],
      },
      {
        id: 'guida-decisioni', icona: '◆', titolo: 'Registro Decisioni',
        intro: 'Domande a risposta chiusa (SÌ/NO) verso DL, SAC o GC, con l\'attesa tracciata automaticamente.',
        punti: [
          'Anzianità in giorni dalla prima richiesta, tasso di resa della commessa e conferma scritta o meno, calcolati automaticamente.',
          'Filtri a tendina per Work Package, stato e urgenza (oltre 21 giorni), combinabili; "Raggruppa per WP" divide la tabella per Work Package.',
        ],
      },
      {
        id: 'guida-allert', icona: '⚠', titolo: 'Registro Allert',
        intro: 'Funzione di presidio: classifica il perimetro di un evento e traccia l\'azione di tutela messa in atto.',
        punti: [
          'Perimetro (interno/esterno) e classificazione (Informativo/Attenzione/Critico): i critici ancora aperti sono evidenziati in rosso.',
          'Può collegarsi a una criticità, decisione o requisito già registrato.',
        ],
      },
      {
        id: 'guida-note', icona: '▤', titolo: 'Note di Coordinamento',
        intro: 'L\'agenda numerata da inviare a un interlocutore esterno (tipicamente SAC/ATI).',
        punti: [
          'Si genera automaticamente dalle criticità ancora aperte, eventualmente filtrate per Work Package: ogni criticità diventa un punto numerato, restando comunque modificabile prima dell\'invio.',
        ],
      },
      {
        id: 'guida-diario', icona: '≡', titolo: 'Diario di Cantiere',
        intro: 'Una voce per ogni giornata: squadre presenti, attività svolte, eventi e criticità rilevate.',
        punti: [
          'Controllo quotidiano informale, complementare ai registri formali: se serve una risposta formale, da qui si apre poi una vera criticità.',
        ],
      },
    ],
  },
  {
    gruppo: 'Requisiti & Contratti',
    voci: [
      {
        id: 'guida-requisiti', icona: '§', titolo: 'Requisiti',
        intro: 'I requisiti estratti dal capitolato, con codice WBS e fase di esecuzione.',
        punti: [
          'Ogni modifica a titolo o descrizione crea una nuova versione, consultabile dal pulsante "Versioni".',
          '"Richiedi approvazione" crea in automatico una decisione collegata nel Registro Decisioni.',
        ],
      },
      {
        id: 'guida-capitolato', icona: '▦', titolo: 'Capitolato Requisiti',
        intro: 'Scrittura del capitolato in stile tabellare, con codici WBS, raggruppata per contratto.',
        punti: [
          'Ogni voce si apre come un documento: i Requisiti collegati compaiono come sottorighe, modificabili senza mai lasciare la vista.',
        ],
      },
      {
        id: 'guida-drawings', icona: '✎', titolo: 'Approvazioni Drawings',
        intro: 'Gli elaborati (shop drawing) sottoposti ad approvazione, con la disciplina IFA/IFC.',
        punti: [
          'IFA = non valido per fabbricazione, finché non arriva il visto formale e si passa manualmente a IFC.',
          'La Data limite approvazione (cut-off) evidenzia in rosso i ritardi della Direzione Lavori.',
          'La Response Matrix (pulsante "Matrice") raccoglie i commenti ricevuti su una revisione, uno per riga, con un flag "Change Order" per chi cambia lo scope invece di un dettaglio grafico.',
          'Import da Excel, anche nel formato dell\'Elenco Deliverable usato da GILI.',
        ],
      },
      {
        id: 'guida-contratto', icona: '▭', titolo: 'Contratti',
        intro: 'Il contratto stipulato, con baseline di capitolato e procedura di change management.',
        punti: [
          'Ogni modifica a un requisito successiva alla baseline è segnalata come "variazione da gestire", con un\'azione rapida verso il Registro Allert.',
          'Gli atti aggiuntivi si sommano automaticamente al valore base nel totale mostrato.',
        ],
      },
    ],
  },
  {
    gruppo: 'Stakeholder',
    voci: [
      {
        id: 'guida-stakeholder', icona: '⊙', titolo: 'Registro Stakeholder',
        intro: 'L\'anagrafica di persone e organizzazioni coinvolte, con la matrice interesse/influenza.',
        punti: [
          'I nomi registrati qui alimentano i menu "Impresa" di Lavorazioni, Maestranze e Contratti — un solo punto di verità.',
          'È anche la base delle assegnazioni RACI nel Piano Comunicazioni.',
        ],
      },
      {
        id: 'guida-maestranze', icona: '◈', titolo: 'Maestranze',
        intro: 'L\'anagrafica delle squadre e dei preposti presenti in cantiere.',
        punti: [
          'I fornitori collegati si scelgono con selezione multipla dal Registro Stakeholder, non a mano.',
        ],
      },
      {
        id: 'guida-comunicazione', icona: '↔', titolo: 'Piano Comunicazioni',
        intro: 'I processi di comunicazione ricorrenti della commessa.',
        punti: [
          'Frequenza, canale, output atteso e ruolo responsabile per ogni processo.',
          'Matrice RACI (Responsible/Accountable/Consulted/Informed) verso gli stakeholder.',
        ],
      },
    ],
  },
  {
    gruppo: 'Gestione',
    voci: [
      {
        id: 'guida-commesse', icona: '⌂', titolo: 'Commesse',
        intro: 'L\'anagrafica delle commesse e dei rispettivi Work Package.',
        punti: ['Ogni modifica si propaga subito a tutta l\'app, menu della sidebar incluso.'],
      },
      {
        id: 'guida-utenti', icona: '◎', titolo: 'Utenti',
        intro: 'Gestione degli accessi, riservata agli amministratori.',
        punti: [
          'Un utente Cliente è sempre in sola lettura e vede solo le sezioni concesse singolarmente.',
          'L\'MFA (autenticazione a due fattori) e una policy di password minima sono disponibili per gli account — attivabili dall\'icona lucchetto accanto al proprio nome in sidebar.',
        ],
      },
      {
        id: 'guida-impostazioni', icona: '⚙', titolo: 'Impostazioni',
        intro: 'Personalizzazione delle liste a tendina usate in tutta l\'app, riservata agli amministratori.',
        punti: [
          'Le liste libere (es. Tipo documento) accettano nuove opzioni liberamente.',
          'Le etichette di stato permettono di rinominare solo il testo mostrato, non di aggiungere o togliere stati.',
        ],
      },
      {
        id: 'guida-lezioni', icona: '✓', titolo: 'Lezioni Apprese',
        intro: 'Quanto imparato da criticità, decisioni e allert già chiusi, per non ripetere gli errori sulla prossima commessa.',
        punti: ['Può collegarsi opzionalmente a una criticità, decisione o allert già registrato.'],
      },
    ],
  },
  {
    gruppo: 'Funzioni trasversali',
    voci: [
      {
        id: 'guida-trasversali', icona: '✦', titolo: 'Funzioni che attraversano tutta l\'app',
        punti: [
          'Ricerca cross-registro: la casella "Cerca in tutti i registri…" in alto in ogni pagina interroga insieme i registri principali della commessa (o del gruppo in vista aggregata) e apre direttamente il risultato scelto.',
          'Blocco sulle modifiche concorrenti: se due persone salvano la stessa riga quasi nello stesso momento, il secondo salvataggio viene rifiutato con un avviso invece di sovrascrivere in silenzio il lavoro del primo.',
          'Guida in linea ovunque: un "?" accanto al titolo di ogni pagina spiega la scheda, e sotto quasi ogni campo dei moduli c\'è una riga che spiega cosa significa e come compilarlo.',
          'Storico delle modifiche: ogni creazione, modifica o eliminazione sui registri principali lascia una traccia con utente, data e un riassunto di cosa è cambiato.',
          'Stampa ed esportazione: la maggior parte dei registri si stampa in un formato pulito, e i principali supportano anche l\'esportazione/importazione Excel.',
          'Backup automatico cifrato del database, con verifica periodica che il ripristino funzioni davvero.',
          'Accesso per ruolo (Amministratore/Operatore/Cliente) e vista aggregata di gruppo in sola lettura per le commesse collegate.',
        ],
      },
    ],
  },
];

function testoRicercabile(voce) {
  return [voce.titolo, voce.intro, ...(voce.punti || [])].join(' ').toLowerCase();
}

export function initGuidaSupporto() {
  const btn = document.getElementById('guidaSupportoBtn');
  if (!btn) return;
  btn.addEventListener('click', apriGuidaSupporto);
}

function apriGuidaSupporto() {
  const nav = el('div', { class: 'guida-supporto__nav' });
  const content = el('div', { class: 'guida-supporto__content' });
  const cercaInput = el('input', { type: 'search', placeholder: 'Cerca nella guida…' });

  const voceBlocchi = [];
  GUIDA.forEach((sezione) => {
    nav.appendChild(el('div', { class: 'guida-supporto__nav-gruppo' }, sezione.gruppo));
    sezione.voci.forEach((voce) => {
      nav.appendChild(el('button', {
        type: 'button', class: 'guida-supporto__nav-link',
        onclick: () => document.getElementById(voce.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
      }, `${voce.icona ? voce.icona + ' ' : ''}${voce.titolo}`));

      const blocco = el('div', { class: 'guida-supporto__voce', id: voce.id }, [
        el('h4', {}, `${voce.icona ? voce.icona + ' ' : ''}${voce.titolo}`),
        voce.intro ? el('p', { class: 'muted' }, voce.intro) : null,
        el('ul', {}, (voce.punti || []).map((p) => el('li', {}, p))),
      ]);
      blocco.dataset.testo = testoRicercabile(voce);
      voceBlocchi.push(blocco);
      content.appendChild(blocco);
    });
  });

  cercaInput.addEventListener('input', () => {
    const q = cercaInput.value.trim().toLowerCase();
    voceBlocchi.forEach((blocco) => { blocco.hidden = q.length > 0 && !blocco.dataset.testo.includes(q); });
  });

  const root = el('div', { class: 'guida-supporto' }, [
    el('div', { class: 'guida-supporto__search' }, [cercaInput]),
    el('div', { class: 'guida-supporto__body' }, [nav, content]),
  ]);
  openModal('Guida e Supporto', root, { full: true });
}
