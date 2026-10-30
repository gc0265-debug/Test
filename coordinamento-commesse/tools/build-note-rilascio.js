// Genera Note_di_Rilascio_Coordinamento_Commesse.docx replicando lo stile
// scelto dall'utente (colori, dimensioni testo, bordi, impaginazione):
// titolo centrato su pagina propria, una sezione per versione con riga
// "Versione X.X  <titolo>" in rosso/blu sopra un filetto, data in corsivo
// grigio, elenco puntato piatto (nessun grassetto nel corpo dei punti),
// chiusura con filetto sottile e payoff aziendale.
//
// Da riusare ad ogni round: aggiungere una voce in cima a SECTIONS
// (l'array è in ordine "più recente prima") e aggiornare
// VERSIONE_ATTUALE/DATA_ATTUALE. Uso: node tools/build-note-rilascio.js
//
// Nota: la prima versione di questo file ricevuta dall'utente aveva un
// bug — l'etichetta "VERSIONE ATTUALE" era scritta in bianco (FFFFFF)
// senza alcuno sfondo, quindi invisibile sulla pagina. Qui è corretta
// usando lo stesso rosso degli altri accenti (C0332B) invece del bianco,
// a parità di tutto il resto dello stile.
let docx;
try { docx = require('docx'); } catch { docx = require('/opt/node-tools/node_modules/docx'); }
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, PageBreak,
} = docx;
const fs = require('fs');

const NAVY = '1F3A4D';
const RED = 'C0332B';
const BODY = '262626';
const GRAY = '666666';
const RULE = 'CCCCCC';

const VERSIONE_ATTUALE = '1.11';
const DATA_ATTUALE = '30 ottobre 2026';

// Più recente prima, come nel documento di riferimento.
const SECTIONS = [
  {
    v: '1.11', title: 'Vista aggregata per gruppo di commesse', date: '30 ottobre 2026', attuale: true,
    points: [
      'Nuovo campo "Gruppo progetto" nella scheda di ogni commessa (es. "RSW Roma"): commesse diverse che fanno parte dello stesso progetto (es. 2514RW e 2593RW) possono condividere lo stesso gruppo, pur restando commesse distinte con il proprio codice.',
      'Quando due o più commesse condividono un gruppo, nel menu a tendina in alto a sinistra compare una nuova opzione "‹gruppo› — tutte (N)": selezionandola si vedono in un’unica vista, per tutti i registri, i dati di tutte le commesse del gruppo insieme — ogni riga mostra una colonna "Commessa" per sapere a quale commessa appartiene.',
      'La vista aggregata è di sola lettura: per creare o modificare una riga serve tornare a selezionare una singola commessa dal menu.',
      'Il Cruscotto e la Dashboard Finanziaria restano legati a una singola commessa e mostrano un avviso quando è selezionata la vista di gruppo.',
    ],
  },
  {
    v: '1.10', title: 'Correzione import Excel di Approvazioni Drawings', date: '30 ottobre 2026',
    points: [
      'Risolto il problema per cui il pulsante "Importa da Excel" nella scheda Approvazioni Drawings non importava alcuna riga con l’elenco deliverable reale: le intestazioni si trovavano su una riga diversa da quella attesa e i nomi di colonna non corrispondevano a quelli del modello generico.',
      'L’importazione ora riconosce sia il modello semplice sia il formato reale dell’Elenco Deliverable, individuando da sola la riga di intestazione.',
      'Quando un elaborato non ha ancora un "Nome elaborato" assegnato, viene usato come titolo provvisorio il nome dell’ambiente, dell’area o della zona, così da non perdere elaborati ancora privi di un file formale.',
      'Lo stato riportato nella colonna "Status" (OK, temi minori, in approvazione, da rilevare, e così via) viene convertito automaticamente nei 4 stati dell’applicazione, mantenendo il testo originale in nota quando la corrispondenza non è diretta.',
      'Livello, Area, Ambiente, Project Manager e le altre annotazioni della maschera GILI vengono riportati in nota, così da non perdere il contesto di ogni riga importata.',
    ],
  },
  {
    v: '1.9', title: 'Sezione Misure in Lavorazioni', date: '29 ottobre 2026',
    points: [
      'Ogni lavorazione ha ora una sezione Misure, per registrare le quote rilevate in cantiere a confronto con quelle di progetto, tratta per tratta — ad esempio un segmento di boiserie o un vano scala.',
      'Per ogni misura si indicano la quota di progetto e la quota effettivamente rilevata in opera: l’applicazione calcola da sola il delta e la percentuale di scostamento, evidenziandoli quando superano la soglia di attenzione del 3% — una soglia visiva, non una tolleranza contrattuale, che resta sempre una valutazione del Direttore di Cantiere.',
      'Da una misura fuori soglia è possibile segnalare una criticità con un clic: viene creata una nuova riga nel Registro Criticità, già precompilata con i dati della misura e collegata ad essa.',
      'Aggiunta una guida in linea, richiamabile direttamente dalla sezione Misure, con la procedura in 5 fasi da seguire per l’aggiornamento delle misure in cantiere.',
    ],
  },
  {
    v: '1.8', title: 'Accesso cliente a sola lettura', date: '29 ottobre 2026',
    points: [
      'Nuovo ruolo utente Cliente: un accesso a sola lettura, pensato per dare a GILI Creations, o ad altri soggetti esterni, la possibilità di vedere alcuni dati senza poter modificare nulla.',
      'Per ogni utente cliente si scelgono, da Impostazioni → Utenti, quali sezioni può vedere tra Timeline Montaggi, Lavorazioni e Approvazioni Drawings: tutte le altre sezioni restano completamente invisibili e inaccessibili a quell’utente.',
      'In quelle sezioni il cliente vede tutto ma non trova pulsanti per creare, modificare, eliminare o importare: è una vetrina, non un accesso operativo.',
    ],
  },
  {
    v: '1.7', title: 'Affidabilità e sicurezza del server', date: '29 ottobre 2026',
    points: [
      'Backup automatico cifrato: ogni notte il database viene copiato, cifrato e salvato in una cartella a scelta (tipicamente iCloud Drive), con una verifica automatica ogni domenica che l’ultimo backup sia davvero recuperabile.',
      'Gli accessi non vengono più persi ad ogni riavvio del server, ad esempio dopo un aggiornamento: restano validi come prima.',
      'Troppi tentativi di accesso falliti di fila dallo stesso indirizzo vengono ora bloccati temporaneamente, a protezione della password.',
      'Rinforzate le protezioni standard del server contro gli attacchi più comuni ai siti web.',
      'Aggiunta una prima serie di controlli automatici sulle parti più delicate dell’applicazione — accesso, etichette personalizzabili, aggiornamenti del database — così un errore si scopre prima di essere pubblicato.',
    ],
  },
  {
    v: '1.6', title: 'Capitolato Requisiti, Approvazioni Drawings, Timeline unificata', date: '29 ottobre 2026',
    points: [
      'Il Capitolato è stato rinominato Capitolato Requisiti: ogni voce si apre ora come un documento, con i Requisiti collegati visibili e modificabili senza uscire dalla scheda.',
      'Nuova sezione Approvazioni Drawings: l’elenco degli elaborati sottoposti a DL/GC per approvazione, compilabile a mano o importando un elenco deliverable direttamente da un file Excel.',
      'Timeline Montaggi: il pulsante "+ Nuova riga" permette ora di scegliere se si sta creando una Milestone o una Lavorazione, con la possibilità di modificare una lavorazione direttamente da qui.',
      'Lavorazioni: il campo Impresa/squadra è ora un menu a tendina collegato al Registro Stakeholder, al posto di un campo di testo libero.',
      'Commesse: il modulo di modifica mostra ora i Work Package collegati, gestibili senza uscire dalla scheda.',
    ],
  },
  {
    v: '1.5', title: 'Etichette di stato personalizzabili', date: '29 ottobre 2026',
    points: [
      'In Impostazioni è ora possibile rinominare il testo mostrato per gli stati più usati nell’app — ad esempio "Aperta / In attesa / Chiusa" per le criticità, "Da fare / In corso / Completata / Bloccata" per le lavorazioni — e lo stesso vale per decisioni, allert, milestone, requisiti, contratti, Registro Stakeholder, maestranze e note di coordinamento.',
      'La personalizzazione riguarda solo il nome visualizzato: i colori, i conteggi del cruscotto e le regole di avanzamento restano invariati, per garantire la piena coerenza dei dati.',
      'Maestranze: nel modulo di modifica i fornitori si collegano ora selezionandoli direttamente dal Registro Stakeholder, con una selezione multipla, eliminando l’inserimento manuale.',
      'Timeline Montaggi: un unico pulsante "Stampa" apre una finestra dove si sceglie il periodo da stampare e, con una semplice spunta, se includere anche l’immagine del grafico Gantt.',
    ],
  },
  {
    v: '1.4', title: 'Capitolato collegato ai contratti, Timeline più leggibile', date: 'ottobre 2026',
    points: [
      'Le voci di Capitolato si possono ora raggruppare per contratto e per data, per una lettura più immediata.',
      'Timeline: la colonna "Attività" si ridimensiona automaticamente in base al testo più lungo, ed è possibile stampare solo il periodo visualizzato a schermo.',
      'Il menu laterale è stato riorganizzato per seguire meglio il flusso di lavoro quotidiano in cantiere.',
      'I Work Package possono ora essere collegati a più commesse contemporaneamente.',
      'Il tipo di documento nella sezione Documenti è configurabile direttamente da Impostazioni.',
    ],
  },
  {
    v: '1.3', title: 'Avvio automatico su Mac', date: 'ottobre 2026',
    points: [
      'L’applicazione può ora avviarsi automaticamente all’accensione del Mac, senza più la necessità di operazioni manuali da terminale.',
      'Introdotta una guida dedicata, sempre aggiornata, con la procedura di installazione e con i passaggi per caricare i futuri aggiornamenti in autonomia.',
    ],
  },
  {
    v: '1.2', title: 'Righe cliccabili, stampa mirata, Cruscotto a riquadri', date: 'ottobre 2026',
    points: [
      'In quasi tutte le tabelle dell’applicazione, un click sulla riga apre direttamente la scheda di modifica.',
      'È ora possibile selezionare una singola riga e stamparla singolarmente, invece di dover stampare sempre l’elenco completo.',
      'Cruscotto: nuova veste grafica con riquadri compatti e cliccabili, per raggiungere subito la sezione di interesse.',
      'Timeline: aggiunto il controllo dello zoom e l’integrazione delle Lavorazioni nel grafico, insieme alle milestone di progetto.',
      'Lavorazioni, Maestranze e Piano Comunicazioni arricchiti con nuovi campi (piano, zona, date, contratto collegato, Work Package, responsabile).',
    ],
  },
  {
    v: '1.1', title: 'Impostazioni e Dashboard Finanziaria', date: 'ottobre 2026',
    points: [
      'Nuova pagina Impostazioni: le liste a tendina utilizzate nelle varie sezioni dell’applicazione (categorie, fasi, tipi) si possono ora personalizzare autonomamente, senza bisogno di intervento tecnico.',
      'Nuova Dashboard Finanziaria: una vista d’insieme su contratti e importi, trasversale a tutte le commesse gestite.',
    ],
  },
  {
    v: '1.0', title: 'Prima versione — Coordinamento Commesse', date: 'ottobre 2026',
    points: [
      'Rilascio iniziale dell’applicazione Coordinamento Commesse: Registro Criticità, Registro Decisioni, Registro Allert, Requisiti versionati, Contratti con gestione delle varianti, Registro Stakeholder, Piano Comunicazioni con matrice RACI, Timeline Montaggi (diagramma di Gantt), Note di Coordinamento, Lezioni Apprese, sezione Documenti con caricamento file.',
      'Gestione utenti con accesso riservato, storico completo delle modifiche, esportazione dei dati in Excel e promemoria automatici delle scadenze.',
    ],
  },
];

function centered(children, after) {
  return new Paragraph({ children, alignment: AlignmentType.CENTER, spacing: after !== undefined ? { after } : undefined });
}

const children = [
  // --- Pagina del titolo ---
  new Paragraph({ spacing: { before: 2200 } }),
  centered([new TextRun({ text: 'FIELD PROJECT SAS', bold: true, allCaps: true, color: GRAY, size: 22 })]),
  centered([new TextRun({ text: 'Note di Rilascio', bold: true, color: NAVY, size: 56 })], 120),
  centered([new TextRun({ text: 'Coordinamento Commesse', bold: true, color: RED, size: 34 })], 400),
  centered([new TextRun({ text: `Versione attuale: ${VERSIONE_ATTUALE}`, color: BODY, size: 22 })], 60),
  centered([new TextRun({ text: DATA_ATTUALE, color: GRAY, size: 20 })], 1600),
  centered([new TextRun({ text: 'Documento riservato agli utenti dell’applicazione.', italics: true, color: GRAY, size: 18 })], 40),
  centered([new TextRun({ text: 'Riepiloga, in linguaggio semplice, le novità introdotte ad ogni aggiornamento.', italics: true, color: GRAY, size: 18 })]),
  new Paragraph({ children: [new PageBreak()] }),

  // --- Introduzione ---
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 160 },
    children: [new TextRun({ text: 'Introduzione', bold: true, color: NAVY, size: 30 })],
  }),
  new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({
      text: 'Questo documento raccoglie, in ordine cronologico inverso, le novità introdotte nelle versioni rilasciate di Coordinamento Commesse. È pensato per essere letto da chi usa l’applicazione ogni giorno: le descrizioni evitano volutamente i dettagli tecnici e si concentrano su cosa cambia nel lavoro quotidiano.',
      color: BODY, size: 22,
    })],
  }),
  new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({
      text: 'Per le istruzioni su come scaricare un aggiornamento sul proprio Mac, fare riferimento alla Guida agli Aggiornamenti fornita separatamente.',
      italics: true, color: BODY, size: 22,
    })],
  }),
];

SECTIONS.forEach((s) => {
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY } },
    spacing: { before: 420, after: 60 },
    children: [
      new TextRun({ text: `Versione ${s.v}  `, bold: true, color: RED, size: 26 }),
      new TextRun({ text: s.title, bold: true, color: NAVY, size: 26 }),
    ],
  }));
  const dateRuns = [new TextRun({ text: s.date, italics: true, color: GRAY, size: 20 })];
  if (s.attuale) {
    dateRuns.push(new TextRun({ text: '   ' }));
    dateRuns.push(new TextRun({ text: 'VERSIONE ATTUALE', bold: true, color: RED, size: 18 }));
  }
  children.push(new Paragraph({ spacing: { after: 160 }, children: dateRuns }));
  children.push(new Paragraph({
    spacing: { before: 60, after: 90 },
    children: [new TextRun({ text: 'Novità e miglioramenti', bold: true, allCaps: true, color: NAVY, size: 20 })],
  }));
  s.points.forEach((p) => {
    children.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 110 },
      children: [new TextRun({ text: p, color: BODY, size: 22 })],
    }));
  });
});

// --- Chiusura ---
children.push(new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE } },
  spacing: { before: 500 },
  children: [new TextRun({ text: ' ', size: 2 })],
}));
children.push(new Paragraph({
  spacing: { before: 160 },
  children: [new TextRun({
    text: 'Field Project SAS — Coordinamento di cantiere per l’arredo contract di lusso.',
    italics: true, color: GRAY, size: 18,
  })],
}));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri' } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/Test/coordinamento-commesse/Note_di_Rilascio_Coordinamento_Commesse.docx', buf);
  console.log('Scritto — versione', VERSIONE_ATTUALE);
});
