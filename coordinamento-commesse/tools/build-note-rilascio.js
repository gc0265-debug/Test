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

const VERSIONE_ATTUALE = '1.44';
const DATA_ATTUALE = '1 novembre 2026';

// Verifiche critiche indipendenti sull'applicazione (il "verdetto del
// giudice" chiesto a più riprese): un log che cresce ad ogni round,
// separato dal changelog per versione perché non descrive una singola
// release ma un giudizio complessivo, con i rilievi che restano aperti
// finché non vengono chiusi da una versione successiva.
const VALUTAZIONI_CRITICHE = [
  {
    data: '31 ottobre 2026',
    ambito: 'Verifica indipendente dell\'applicazione rispetto agli strumenti equivalenti del mercato (scheduling e coordinamento di cantiere)',
    sintesi: 'Confronto diretto con gli strumenti di scheduling e coordinamento in uso nel settore, con l\'obiettivo di capire cosa non avrebbe retto il confronto di fronte a un cliente reale.',
    rilievi: [
      {
        testo: 'La Timeline Montaggi mostrava solo un calendario di barre indipendenti, senza alcun legame di sequenza fra le attività: non era possibile definire che una lavorazione dovesse attendere la fine di un\'altra, né calcolare un percorso critico. Senza questo, lo strumento non è scheduling in senso proprio — è la funzione che un GC o una Direzione Lavori si aspettano di vedere appena aprono la pagina.',
        stato: 'Risolta in v1.36',
      },
      {
        testo: 'Gli account amministratore erano protetti dalla sola password, senza autenticazione a due fattori né un requisito minimo di robustezza: il buco di sicurezza più vistoso dell\'applicazione, da chiudere prima che un cliente reale vi acceda.',
        stato: 'Risolta in v1.37',
      },
    ],
    nota: 'Il giudizio è stato espresso in forma di conversazione; questa voce ne riporta fedelmente i due rilievi che hanno guidato gli sviluppi successivi, verificabili nei punti "Novità e miglioramenti" delle rispettive versioni.',
  },
  {
    data: '1 novembre 2026',
    ambito: 'Autovalutazione critica del sistema MFA e della policy password appena introdotti (v1.37)',
    sintesi: 'Applicando lo stesso metro di giudizio a quanto appena realizzato: l\'assenza più vistosa è chiusa, ma l\'implementazione resta un primo livello, non equivalente a quanto offerto da una piattaforma SaaS matura.',
    rilievi: [
      { testo: 'L\'MFA resta facoltativa anche per gli account amministratore: nulla nell\'interfaccia la richiede o la sollecita attivamente. Il buco si chiude solo quando chi amministra l\'app la attiva di persona.', stato: 'Aperta' },
      { testo: 'Non esistono codici di recupero: se l\'app authenticator viene persa, l\'unica via di rientro è un intervento diretto sul database da parte di chi ha accesso al server, non una procedura pensata per l\'utente.', stato: 'Aperta' },
      { testo: 'La disattivazione dell\'MFA richiede solo la password dell\'account: se la password fosse già compromessa, un estraneo potrebbe disattivarla senza che l\'MFA frapponga resistenza aggiuntiva in quel momento.', stato: 'Aperta' },
      { testo: 'La policy minima si applica solo alla creazione o al cambio password: un account amministratore già esistente con una password debole continua a funzionare finché non la cambia volontariamente.', stato: 'Aperta' },
    ],
  },
  {
    data: '1 novembre 2026',
    ambito: 'Autovalutazione critica di cartelle e markup sui disegni (v1.38)',
    sintesi: 'Il markup chiude la lacuna più visibile rispetto agli strumenti di cantiere concorrenti (nessun modo di annotare un disegno restava il limite più citato): resta però uno strumento visivo a sé, non ancora collegato ai registri che tracciano davvero il seguito di un\'osservazione.',
    rilievi: [
      { testo: 'Un markup su un disegno (es. una nuvola di revisione con "verificare quota") resta solo visivo: non genera una riga nel Registro Criticità come già avviene dalla sezione Misure di Lavorazioni. Chi annota un disegno deve ancora aprire a mano una criticità se vuole che quel rilievo abbia una scadenza e un responsabile.', stato: 'Risolta in v1.39' },
      { testo: 'Le sessioni di markup salvate restano tutte, per sempre: non c\'è modo dall\'interfaccia di eliminarne una creata per errore (la rotta esiste lato server ma non è ancora richiamata da nessun pulsante).', stato: 'Risolta in v1.39' },
      { testo: 'Su un elaborato PDF con molte pagine, l\'editor tiene in memoria il rendering di ogni pagina visitata per tutta la sessione: utile per non ridisegnarle ad ogni cambio pagina, ma su un fascicolo molto lungo può appesantire il browser. Non c\'è ancora un limite o un avviso.', stato: 'Risolta in v1.39' },
    ],
  },
  {
    data: '1 novembre 2026',
    ambito: 'Autovalutazione critica del collegamento markup → Registro Criticità (v1.39)',
    sintesi: 'I tre rilievi aperti sul markup (v1.38) sono chiusi in questo stesso round. Applicando lo stesso metro al collegamento appena costruito, restano due limiti minori, non bloccanti.',
    rilievi: [
      { testo: '"Segnala criticità" copre una sola annotazione alla volta: su un disegno con molti rilievi da aprire insieme non c\'è un\'azione cumulativa.', stato: 'Risolta in v1.40' },
      { testo: 'La criticità nasce sempre con urgenza "Normale" e senza Work Package assegnato: va comunque riaperta e completata a mano per scadenza, destinatario e WP — lo stesso comportamento già in uso da Misure di Lavorazioni, qui non ancora perfezionato per il caso specifico del disegno.', stato: 'Risolta in v1.40' },
    ],
  },
  {
    data: '1 novembre 2026',
    ambito: 'Verifica indipendente a tutto campo, non solo sull\'ultima funzione: l\'applicazione nel suo complesso contro gli strumenti equivalenti del mercato',
    sintesi: 'Dall\'ultima verifica a tutto campo (31 ottobre) l\'app ha chiuso i due buchi più vistosi, scheduling e sicurezza degli accessi, e ha aggiunto il markup sui disegni. Qui il giudizio riparte da zero sull\'insieme, non sull\'ultimo round: i rilievi che seguono riguardano soprattutto l\'infrastruttura e il lavoro in team, non più singole funzioni mancanti.',
    rilievi: [
      { testo: 'Nessun blocco ottimistico sulle modifiche: se due persone salvano la stessa riga (es. la stessa criticità) quasi nello stesso momento, l\'ultimo salvataggio sovrascrive il primo senza alcun avviso. Con più account operatore attivi è lo scenario concreto più probabile di perdita silenziosa di dati di tutta l\'applicazione, non un\'ipotesi remota.', stato: 'Risolta in v1.41' },
      { testo: 'Nessuna ricerca che attraversi più registri insieme: ogni scheda cerca solo al proprio interno. Ritrovare "di cosa avevamo parlato sul controsoffitto del bar" significa indovinare se era una criticità, una decisione, una nota o un documento, e cercare in ognuno separatamente.', stato: 'Risolta in v1.41' },
      { testo: 'Lo "Storico" esiste solo riga per riga: non c\'è un registro eventi unico della commessa ("cosa è cambiato questa settimana, ovunque") da scorrere per tenere il controllo d\'insieme senza riaprire ogni scheda una per una.', stato: 'Aperta' },
      { testo: 'L\'app gira come singola istanza su un Mac con un database SQLite a scrittore unico: adeguato al team attuale, ma senza ridondanza, senza un vero monitoraggio (solo un health-check minimale) e con un solo punto di guasto — chi altro dovesse usarla in modo continuativo dipende interamente da quel singolo Mac acceso e raggiungibile.', stato: 'Aperta' },
      { testo: 'Nessuna interfaccia pensata per sistemi esterni (API, webhook): tutti i dati restano raggiungibili solo dall\'interno dell\'app stessa, senza alcuna via per collegarla in futuro ad altri strumenti di GILI, SAC o di Field Project SAS.', stato: 'Aperta' },
      { testo: 'Il layout si adatta allo schermo dello smartphone solo in modo generico (un solo breakpoint, non pensato per il telefono): tabelle e Gantt restano scomodi da consultare sul cellulare, proprio il dispositivo più a portata di mano in cantiere.', stato: 'Aperta' },
      { testo: 'Non esiste un\'esportazione completa dei propri dati: solo export per singolo registro (Excel) o per report configurato. Chi volesse un archivio integrale di una commessa, per un passaggio di consegne o per smettere di usare l\'app, non ha un pulsante unico per ottenerlo.', stato: 'Aperta' },
      { testo: 'I permessi restano a tre soli livelli (admin/operatore/cliente): un operatore ha accesso in scrittura a tutti i Work Package di ogni commessa a cui è assegnato, senza possibilità di restringerlo, ad esempio, al solo WP di cui è effettivamente responsabile.', stato: 'Aperta' },
      { testo: 'Nessun supporto per altre lingue: testi, date ed etichette sono scritti direttamente in italiano in ogni punto dell\'app, senza un livello di traduzione. Non è un problema oggi, ma blocca sul nascere il coinvolgimento di un fornitore o un cliente che non legga l\'italiano.', stato: 'Aperta' },
    ],
    nota: 'A differenza delle verifiche precedenti, qui il giudizio riguarda l\'applicazione nel suo complesso: non singole funzioni mancanti, ma scelte strutturali (concorrenza, infrastruttura, permessi) che pesano di più quanto più l\'app viene usata da un team reale nel tempo.',
  },
];

// Più recente prima, come nel documento di riferimento.
const SECTIONS = [
  {
    v: '1.44', title: 'Timeline in stile MS Project: WBS, durata, predecessori, avanzamento, trascinamento e colori a scelta', date: '1 novembre 2026', attuale: true,
    points: [
      'La Timeline Montaggi assomiglia ora più da vicino a un vero foglio MPP: numerazione gerarchica WBS (1, 1.1, 1.1.1...) a sinistra di ogni riga, colonna "Durata" in giorni, colonna "Pred." con il codice del predecessore (es. "2.1FS+2gg" = dopo la fine dell\'attività 2.1 più 2 giorni di ritardo) e righe più dense per vedere più attività senza scorrere.',
      'Ogni lavorazione ha ora un campo "Avanzamento (%)", modificabile a mano indipendentemente dallo stato: viene mostrato come una sottile barra scura sovrapposta alla barra del Gantt, in proporzione.',
      'Si trascina direttamente la barra di un\'attività nel Gantt per spostarla avanti o indietro nel tempo (snap al giorno): un semplice clic, senza trascinare, continua ad aprire il modulo di modifica come prima. Le righe di riepilogo (lavorazioni madre con sotto-attività) non si trascinano, perché le loro date derivano dalle sotto-attività.',
      'In vista "Settimane" e "Mesi" compaiono ora delle righe verticali sottili ad ogni confine di periodo, per leggere a colpo d\'occhio su quale settimana o mese cade una barra.',
      'Nuovo pulsante "Colori" nella Timeline: permette di scegliere liberamente il colore delle barre per ciascuno stato (Pianificata, In corso, Completata, In ritardo), con anteprima immediata. La scelta resta salvata nel browser; "Ripristina predefiniti" torna ai colori di tema.',
    ],
  },
  {
    v: '1.43', title: 'To-do e note veloci sul Cruscotto, lavorazioni in corso sempre in vista nella Timeline', date: '1 novembre 2026',
    points: [
      'Nuovo box "To-do e note veloci" sul Cruscotto: appunti rapidi con una scadenza facoltativa impostata a mano da chi scrive la nota. Una nota con scadenza vicina (entro 3 giorni) o già scaduta è evidenziata in ambra/rosso e compare anche tra le "Scadenze della settimana" in cima, lo stesso promemoria già in uso per criticità urgenti e milestone.',
      'Le note completate si spuntano con una casella e restano nascoste di default (pulsante "Mostra completati" per rivederle), per tenere il box compatto.',
      'La Timeline Montaggi mostra ora in cima una barra sempre visibile con le lavorazioni attualmente in corso (oggi compreso nel loro intervallo, o marcate "In corso" a mano): non serve più scorrere il Gantt per sapere cosa è in lavorazione in questo momento.',
    ],
  },
  {
    v: '1.42', title: 'Cruscotto collassabile, sidebar riordinata, filtri a bottone su Criticità e Lavorazioni', date: '1 novembre 2026',
    points: [
      'Il box "Attività recente" in fondo al Cruscotto è ora collassabile (clic sulla barra del titolo): lo stato aperto/chiuso resta ricordato tra una visita e l\'altra.',
      'Corretta la prima colonna dell\'elenco attività recente, che su un\'etichetta lunga (es. "Processo comunicazione") poteva sovrapporsi al testo della riga accanto.',
      'La voce "Dashboard Finanziaria" in sidebar è stata spostata sotto il gruppo "Commessa", invece che sopra di esso.',
      'Registro Criticità e Lavorazioni hanno ora, in alto, un filtro a bottoni per Work Package (un clic per WP, come già avviene per lo stato in Criticità): la stessa possibilità di filtrare per WP già offerta dal Registro Decisioni con un menu a tendina, qui come pulsanti diretti. Lavorazioni guadagna anche il filtro a bottoni per stato, prima assente.',
    ],
  },
  {
    v: '1.41', title: 'Blocco sulle modifiche concorrenti e ricerca cross-registro', date: '1 novembre 2026',
    points: [
      'Ogni modulo di modifica dei registri principali (Criticità, Decisioni, Allert, Requisiti, Contratti, Stakeholder, Piano Comunicazioni, Lavorazioni, Misure, Approvazioni Drawings, Response Matrix, Capitolato Requisiti, Note di Coordinamento, Diario, Lezioni Apprese, Maestranze, Timeline/Milestone, Documenti) porta con sé la versione della riga caricata: se nel frattempo qualcun altro ha già salvato quella stessa riga, il salvataggio viene rifiutato con un avviso ("questa riga è stata modificata da qualcun altro nel frattempo: ricarica la pagina...") invece di sovrascrivere in silenzio il lavoro del primo.',
      'Una nuova casella "Cerca in tutti i registri…" in alto in ogni pagina interroga insieme tutti i registri della commessa selezionata (o del gruppo progetto, in vista aggregata): i risultati compaiono raggruppati per registro con un estratto del testo trovato, e cliccandone uno si apre direttamente la pagina giusta — con la riga trovata già aperta in modifica per i registri principali (Criticità, Decisioni, Allert, Requisiti, Contratti, Stakeholder, Piano Comunicazioni, Lavorazioni, Diario).',
      'Un utente Cliente vede nella ricerca solo i registri delle sezioni a cui ha già accesso altrove nell\'app, mai quelli delle sezioni non concesse — anche se il testo cercato combacerebbe.',
    ],
  },
  {
    v: '1.40', title: 'Markup: selezione multipla e criticità già complete di WP/urgenza', date: '1 novembre 2026',
    points: [
      'Nell\'editor di markup lo strumento "Seleziona" supporta ora la selezione multipla: Shift+click aggiunge o toglie un\'annotazione dalla selezione corrente, e trascinandone una tutte le altre selezionate si spostano insieme.',
      'Il pulsante "Segnala criticità" copre ora tutte le annotazioni selezionate in un\'unica azione (es. "Segnala criticità (3)"), aprendo un modulo dove si sceglie Work Package, urgenza, destinatario ed eventuale scadenza comuni prima di creare le criticità — una per annotazione, tutte già complete invece di nascere "Normale" e senza WP da riaprire e integrare a mano.',
      'Anche il tasto Canc/Backspace ora elimina tutte le forme selezionate insieme, non più una sola alla volta.',
    ],
  },
  {
    v: '1.39', title: 'Markup collegato al Registro Criticità, cronologia gestibile, PDF lunghi più leggeri', date: '1 novembre 2026',
    points: [
      'Nell\'editor di markup, selezionando un\'annotazione (con lo strumento "Seleziona") compare il pulsante "Segnala criticità": crea una nuova riga nel Registro Criticità collegata al disegno e alla pagina, pronta da completare con scadenza, destinatario e Work Package — sullo stesso modello già in uso da Misure di Lavorazioni.',
      'Un\'annotazione già diventata una criticità resta riconoscibile da un piccolo bollino sul disegno, per non segnalarla due volte; nel Registro Criticità la riga mostra un link "📎 disegno collegato" per riaprire il disegno originale.',
      'Il pulsante "Cronologia sessioni" apre ora un pannello con tutte le sessioni di markup salvate per la pagina corrente, ciascuna caricabile oppure eliminabile singolarmente — prima erano consultabili ma non si potevano più rimuovere.',
      'Su un fascicolo PDF molto lungo, l\'editor ora tiene in memoria solo le ultime pagine visitate (il rendering si ricalcola al bisogno tornando su una pagina più vecchia): un avviso informa quando il documento supera questa soglia, così il browser resta leggero anche su elaborati di decine di pagine.',
    ],
  },
  {
    v: '1.38', title: 'Documenti: cartelle nidificate e markup sui disegni', date: '1 novembre 2026',
    points: [
      'La scheda Documenti ha ora delle cartelle, nidificabili a piacere (cartelle dentro cartelle): un pulsante "+ Nuova cartella", una barra di navigazione in stile Documenti › Disegni › Piano 3 e un campo "Cartella" nel modulo di ogni documento per archiviarlo o spostarlo.',
      'Sui disegni in PDF o immagine (JPG, PNG...) è ora disponibile un pulsante "Markup": un editor con gli strumenti classici di revisione — penna, evidenziatore, linea, freccia, rettangolo, ellisse, nuvola di revisione, testo — con colori, spessore del tratto, selezione/spostamento, annulla/ripeti e zoom.',
      'Ogni "Salva markup" crea una nuova sessione datata e firmata da chi l\'ha fatta, senza mai sovrascrivere le precedenti: restano tutte consultabili dal menu "Cronologia sessioni" della pagina, utile per tenere traccia dei round di commenti del DL o del GC su revisioni successive dello stesso disegno.',
      'Il pulsante "Esporta PDF" genera un nuovo documento PDF con tutti i markup incorporati nel disegno stesso, pronto da scaricare, stampare o allegare a un\'email a chi non ha accesso all\'app — il disegno originale caricato non viene mai modificato.',
      'Sui PDF a più pagine (un fascicolo di elaborati) l\'editor naviga pagina per pagina, con un markup indipendente per ciascuna.',
    ],
  },
  {
    v: '1.37', title: 'MFA e policy password minima sugli account', date: '1 novembre 2026',
    points: [
      'Ogni utente può ora attivare l\'autenticazione a due fattori (MFA) sul proprio account, dalla nuova icona "Sicurezza account" accanto al proprio nome in fondo al menu laterale: un QR da inquadrare con un\'app authenticator (Google Authenticator, Authy, Microsoft Authenticator...) e un codice di conferma, dopodiché il login richiede anche il codice a 6 cifre oltre alla password.',
      'Nuova policy minima di robustezza, applicata a ogni nuova password e ad ogni cambio password, per qualunque ruolo: almeno 10 caratteri, con una maiuscola, una minuscola e un numero.',
      'Ogni utente può ora cambiare la propria password direttamente dalla stessa area "Sicurezza account", senza dover passare dalla pagina Utenti riservata agli amministratori.',
    ],
    bugfix: [
      'Corretta l\'etichetta del ruolo mostrata in fondo al menu laterale: indicava sempre "Amministratore" oppure "Operatore", senza mai riportare "Cliente" per gli utenti con quell\'accesso.',
    ],
  },
  {
    v: '1.36', title: 'Timeline: dipendenze fra attività e percorso critico', date: '1 novembre 2026',
    points: [
      'Da ogni milestone o lavorazione si possono collegare uno o più predecessori — l\'attività che deve finire (più un eventuale ritardo in giorni) prima che questa possa iniziare: niente più solo un calendario, un vero vincolo di sequenza come in uno strumento di scheduling.',
      'Le frecce nel Gantt mostrano i collegamenti: in rosso quelle sul percorso critico (la catena di attività che, se rallenta, fa slittare l\'intera commessa), tratteggiate in ambra quelle in conflitto con le date attualmente impostate.',
      'Un collegamento non sposta mai nessuna data da solo: segnala soltanto, restando sempre una scelta del Direttore di Cantiere. Un collegamento che chiuderebbe un ciclo (es. A dipende da B che dipende già, anche indirettamente, da A) viene rifiutato subito, con un messaggio chiaro.',
    ],
  },
  {
    v: '1.35', title: 'Report: sei sezioni in più', date: '31 ottobre 2026',
    points: [
      'La scheda Report copre ora tutti i registri della commessa: aggiunte Documenti, Note di Coordinamento, Diario di Cantiere, Capitolato Requisiti, Maestranze e Piano Comunicazioni alle sezioni già disponibili — 18 in totale.',
      'Nessuna modifica ai report già configurati: le nuove sezioni compaiono tra quelle disponibili la prossima volta che se ne crea o modifica uno.',
    ],
  },
  {
    v: '1.34', title: 'Nuova scheda Report: configurabili, in PDF/Word/Excel', date: '31 ottobre 2026',
    points: [
      'Nuova voce "Report" in sidebar, sotto Commessa: si configura un report scegliendo quali sezioni includere (Criticità, Decisioni, Lavorazioni, SAL, Timeline, Approvazioni Drawings, Response Matrix, Requisiti, Contratti, Stakeholder, Lezioni Apprese...), con filtro opzionale per Work Package e per periodo.',
      'Ogni report salvato si scarica in un click in PDF, Word o Excel — tre formati, stessi dati, sempre coerenti fra loro.',
      'Pulsante "Email" per inviarlo come allegato (uno o più formati insieme) a uno o più indirizzi, usando lo stesso server SMTP già configurato per le notifiche di scadenza (file .env).',
      'Pensato per sostituire gli export ricostruiti a mano ogni volta: una volta configurato, un report si rigenera sempre aggiornato con i dati correnti, senza rifare la selezione.',
    ],
  },
  {
    v: '1.33', title: 'Documenti: scrivere un Word direttamente in app', date: '31 ottobre 2026',
    points: [
      'Nuovo pulsante "+ Scrivi documento Word" in Documenti: un editor di testo con titoli, grassetto/corsivo/sottolineato, elenchi puntati e numerati, citazioni — niente di più di quanto serve a una nota o un verbale, ma abbastanza per scriverlo senza uscire dall\'app.',
      'Il documento scritto qui è un vero file .docx: si scarica e si apre normalmente in Word, esattamente come un documento caricato da file.',
      'Resta anche modificabile da dentro l\'app: riaprendolo si ritrova il testo con tutta la formattazione, pronto per essere corretto e risalvato — un documento caricato da fuori invece si sostituisce sempre con un nuovo file, perché l\'app non ne conosce il contenuto.',
    ],
  },
  {
    v: '1.32', title: 'Cruscotto: riquadro Response Matrix', date: '31 ottobre 2026',
    points: [
      'Nuovo riquadro "Response Matrix" sul Cruscotto, accanto agli altri registri: commenti aperti, Change Order ancora aperti e commenti totali su tutte le revisioni di Approvazioni Drawings della commessa.',
      'I Change Order aperti sono evidenziati in rosso: segnalano richieste che cambiano lo scope concordato, da congelare in attesa di una variante economica approvata.',
    ],
  },
  {
    v: '1.31', title: 'Notifiche email sulle scadenze', date: '31 ottobre 2026',
    points: [
      'Oltre all\'evidenza visiva già presente in app, le scadenze critiche (cut-off Approvazioni Drawings, criticità urgenti) possono ora essere notificate via email: un avviso immediato appena una scadenza viene superata, più un riepilogo giornaliero di quelle nei prossimi 7 giorni.',
      'Nuovo campo "Email notifiche scadenze" nella scheda di ogni commessa (uno o più indirizzi, separati da virgola) e pulsante "Invia notifica di prova" per verificare subito che l\'invio funzioni.',
      'Richiede un server SMTP configurato nel file .env (vedi .env.example) e, sul Mac, l\'installazione di un controllo orario (deploy/macos/installa-notifiche-scadenze.command) — vedi GUIDA_AGGIORNAMENTI.md. Senza questi passaggi l\'app continua a funzionare come prima, semplicemente non invia email.',
    ],
  },
  {
    v: '1.30', title: 'Lezioni Apprese: ragionamento IA e stampa filtrabile', date: '31 ottobre 2026',
    points: [
      'Il pulsante "+ Genera da registri" ora chiede al modello di linguaggio di ragionare sui dati della criticità, decisione o allert chiuso, invece di limitarsi a ricopiarne i campi: scrive una proposta di "Cosa è successo", "Cosa abbiamo imparato" e "Azione per il futuro", che restano comunque modificabili prima di confermare.',
      'Se sul server non è configurata la chiave del servizio IA (file .env, vedi .env.example), il generatore lo segnala chiaramente invece di inventare un testo finto: titolo e collegamento restano precompilati dai registri, gli altri campi si completano a mano.',
      'Nuovo pulsante "Stampa" in Lezioni Apprese: produce un documento strutturato con tutte le lezioni apprese, filtrabile per commessa (anche "tutte le commesse" insieme) e per Work Package — pensato per essere riletto prima di avviare una nuova commessa, non solo come elenco interno.',
    ],
  },
  {
    v: '1.29', title: 'Lezioni Apprese: generazione automatica dai registri', date: '31 ottobre 2026',
    points: [
      'Nuovo pulsante "+ Genera da registri" in Lezioni Apprese: propone una bozza di lezione per ogni criticità chiusa, decisione presa e allert chiuso non ancora collegato a una lezione esistente, con titolo, Work Package, data e collegamento all\'origine già precompilati.',
      'Ogni proposta si può accettare o scartare singolarmente, con la categoria scelta al volo prima di generarla: nessuna lezione viene creata senza conferma.',
      '"Cosa abbiamo imparato" e "Azione per il futuro" restano volutamente da scrivere dopo, voce per voce: l\'automatismo raccoglie la materia prima dai registri, non inventa la lezione al posto del Direttore di Cantiere.',
      'Una volta generata, una lezione non viene mai riproposta una seconda volta: il generatore ignora le criticità, decisioni e allert già collegati a una lezione esistente.',
    ],
  },
  {
    v: '1.28', title: 'Guida in linea su ogni campo di ogni maschera', date: '31 ottobre 2026',
    points: [
      'Tutti i campi di inserimento dati di tutti i registri — circa 200 in totale — hanno ora una riga di spiegazione sotto l\'etichetta: cosa significa il campo e, dove serve, come usarlo.',
      'Non sostituisce il "?" già introdotto accanto al titolo di ogni scheda: quello spiega la pagina nel suo insieme, questo entra nel dettaglio di ogni singolo campo mentre si compila una maschera.',
    ],
  },
  {
    v: '1.27', title: 'Response Matrix su Approvazioni Drawings', date: '31 ottobre 2026',
    points: [
      'Nuovo pulsante "Matrice" su ogni elaborato: una Response Matrix che raccoglie i commenti ricevuti su una revisione (da Interior Designer, impiantisti, GC...), uno per riga, con la risposta data e lo stato (Aperto/Chiuso) — invece di lasciarli sparsi fra email e PDF.',
      'Un commento può essere qualificato come "Change Order": segnala una richiesta che cambia lo scope concordato (quote, essenze, ferramenta, impiantistica) invece di un semplice dettaglio grafico, da congelare in attesa di una variante economica approvata.',
      'Stampando un singolo elaborato selezionato, la Response Matrix viene inclusa automaticamente nel documento — pronta da portare in riunione di coordinamento con il GC.',
    ],
  },
  {
    v: '1.26', title: 'Timeline: intestazione corretta, colori più chiari, elimina milestone', date: '31 ottobre 2026',
    points: [
      'Le settimane in intestazione mostrano ora l\'etichetta abbreviata (es. "S44") invece di "Sett. 44", più leggibile quando lo zoom è ridotto.',
      'Colori più distinguibili nel Gantt: le barre dei gruppi Piano sono ora viola (prima un grigio simile a quello già usato per baseline e riepiloghi), la barra di baseline è ambra per richiamare il pallino di scostamento già in uso altrove nell\'app. La legenda distingue ora "Gruppo Piano" da "Riepilogo sotto-attività", prima accorpati in una sola voce.',
      'Una milestone può ora essere eliminata direttamente dal suo modulo di modifica nella Timeline, con lo stesso pulsante "Elimina" già presente per le altre schede.',
    ],
    bugfix: [
      'Risolto il difetto per cui, con i gruppi Piano espansi, la barra riassuntiva del gruppo finiva nascosta dietro la riga delle settimane: l\'intestazione ora si aggancia correttamente in cima al grafico, senza sovrapposizioni.',
    ],
  },
  {
    v: '1.25', title: 'Guida in linea e cut-off/IFC su Approvazioni Drawings', date: '31 ottobre 2026',
    points: [
      'Ogni scheda ha ora un pulsante "?" accanto al titolo, in alto: un balloon che spiega a cosa serve la pagina e come si usa, senza dover uscire dal lavoro in corso.',
      'Approvazioni Drawings: nuovo stato Emissione IFA/IFC (emesso per approvazione / emesso per costruzione) e nuova Data limite approvazione (cut-off), con evidenza in rosso automatica quando l\'approvazione formale arriva dopo quella data — il programma di fabbricazione slitta e il ritardo è documentato.',
      'L\'import da Excel riconosce già la colonna "Approvazione (data ultima attesa)" dell\'Elenco Deliverable GILI e la usa direttamente come cut-off, invece di lasciarla solo in nota.',
    ],
  },
  {
    v: '1.24', title: 'Nuova scheda SAL — Stato Avanzamento Lavori', date: '31 ottobre 2026',
    points: [
      'Nuova scheda SAL al posto di Maestranze (ora sotto Stakeholder): un registro di avanzamento fisico delle Lavorazioni, con percentuale di completamento aggregata per Work Package e per Impresa.',
      'Non è un SAL contabile — non calcola quantità, prezzi unitari o acconti, dati che l\'app non traccia ancora — ma un avanzamento operativo, utile per condividere lo stato dei montaggi senza dover aprire un foglio a parte.',
      'Ogni SAL si chiude con un numero progressivo e una data: resta congelato così com\'era, e viene confrontato automaticamente con il SAL precedente mostrando il delta percentuale di avanzamento.',
      'Lo storico dei SAL chiusi è consultabile, stampabile (con gli stessi grafici per stato di Lavorazioni) ed eliminabile in caso di errore.',
    ],
  },
  {
    v: '1.23', title: 'Stampa Lavorazioni con grafici, Maestranze sotto Stakeholder', date: '31 ottobre 2026',
    points: [
      'La stampa di Lavorazioni ("Stato avanzamento dei montaggi") ora include anche i due grafici per stato (barre e torta) e un breve testo introduttivo pensato per la condivisione esterna con il cliente.',
      'La voce Maestranze in menu è stata spostata dal gruppo Commessa al gruppo Stakeholder, insieme al Registro Stakeholder e al Piano Comunicazioni.',
    ],
  },
  {
    v: '1.22', title: 'Registro Decisioni: raggruppamento per WP e filtri rapidi', date: '31 ottobre 2026',
    points: [
      'Nuova riga di filtri a tendina sopra la tabella del Registro Decisioni: per Work Package, per stato (Pendenti / Decise) e per urgenza (solo le decisioni oltre 21 giorni di anzianità), combinabili tra loro.',
      'Nuovo interruttore "Raggruppa per WP": attivandolo, la tabella viene divisa in un blocco separato per ciascun Work Package (con un blocco "Senza WP" per le decisioni non ancora assegnate a un WP), sullo stesso modello già usato in Capitolato Requisiti per il raggruppamento per contratto.',
      'Filtri e raggruppamento sono disponibili con una singola commessa selezionata; nella vista aggregata di gruppo restano solo i filtri per stato e urgenza.',
    ],
  },
  {
    v: '1.21', title: 'Cruscotto ridisegnato: più compatto e immediato', date: '31 ottobre 2026',
    points: [
      '"Scadenze della settimana" è ora una fascia a tutta larghezza in cima al Cruscotto, con l\'elenco delle scadenze subito visibile (non più dietro un click) in una fila di schede scorrevole, evidenziando in rosso quelle già scadute.',
      '"Attività recente" è ora una fascia a tutta larghezza in fondo al Cruscotto, con la cronologia delle ultime modifiche mostrata come elenco scorrevole, anch\'essa subito visibile.',
      'La griglia centrale con i numeri per registro (Criticità, Milestone, Decisioni, Lavorazioni, Requisiti & Contratti, Stakeholder, Allert) è più compatta, per una pagina d\'insieme più immediata da leggere in un unico colpo d\'occhio.',
    ],
  },
  {
    v: '1.20', title: 'Intestazione delle tabelle sempre visibile durante lo scorrimento', date: '31 ottobre 2026',
    points: [
      'In tutte le schede con un elenco (Criticità, Decisioni, Allert, Requisiti, Approvazioni Drawings, Registro Stakeholder, Maestranze, Capitolato Requisiti, Documenti, Diario, Lezioni Apprese, Note di Coordinamento, Commesse, Utenti...), la riga con i nomi delle colonne ora resta visibile in alto mentre si scorre l\'elenco, invece di sparire scorrendo verso il basso.',
      'Approvazioni Drawings: la colonna unica "Invio → Approvazione" è stata divisa in due colonne distinte, "Data invio" e "Data approvazione".',
    ],
  },
  {
    v: '1.19', title: 'Timeline Montaggi: raggruppamento per Piano e sotto-attività stile MPP', date: '31 ottobre 2026',
    points: [
      'La Timeline Montaggi raggruppa ora automaticamente le attività per Piano (es. tutte le voci "P+5" insieme): ogni gruppo è un\'intestazione comprimibile, con una barra riassuntiva che copre l\'intero periodo del piano e il conteggio delle attività al suo interno.',
      'Una lavorazione può avere delle sotto-attività, in stile MS Project: dal pulsante "+ sotto-attività" che compare passando sul nome di una lavorazione, o scegliendo una "Lavorazione madre" dal modulo di Lavorazioni o della Timeline stessa.',
      'Una lavorazione con sotto-attività diventa una riga di riepilogo: la sua barra copre da sola l\'intervallo minimo-massimo di tutte le sue sotto-attività, mostrate rientrate subito sotto di essa e comprimibili singolarmente col proprio triangolino, indipendentemente dal gruppo Piano.',
      'La gerarchia resta volutamente a due soli livelli (lavorazione → sotto-attività), per restare semplice da leggere: una lavorazione che ha già delle sotto-attività non può a sua volta diventare sotto-attività di un\'altra.',
      'Nella scheda Lavorazioni, ogni sotto-attività mostra sotto il titolo a quale lavorazione madre appartiene.',
    ],
  },
  {
    v: '1.18', title: 'Storico con dettaglio delle modifiche, Dashboard Finanziaria per fornitore', date: '31 ottobre 2026',
    points: [
      'Lo storico di Approvazioni Drawings, Capitolato Requisiti e Registro Stakeholder mostra ora esattamente cosa è cambiato ad ogni modifica (es. "Stato: In attesa → Approvato"), come già avveniva per Criticità, Decisioni e Allert — prima si vedeva solo che una modifica era avvenuta, non il dettaglio.',
      'Dashboard Finanziaria: aggiunta una nuova tabella "Contratti fornitori" con ogni singolo contratto registrato, su tutte le commesse — fornitore, stato, data di stipula, valore e atti aggiuntivi già sommati — accanto al riepilogo già esistente per commessa.',
    ],
  },
  {
    v: '1.17', title: 'Maestranze: nome scelto dal Registro Stakeholder', date: '31 ottobre 2026',
    points: [
      'Nella scheda Maestranze, il campo "Nome" è ora un menu a tendina che pesca dal Registro Stakeholder della commessa, invece di un testo libero — coerente con "Controparte" nei Contratti, "Impresa" in Lavorazioni e i fornitori collegati già presenti in questa stessa scheda.',
      'Una maestranza già registrata in precedenza con un nome non presente nel Registro Stakeholder resta visibile e selezionata com\'era, segnalata con la dicitura "(non più nel Registro Stakeholder)": nessun dato storico viene perso passando al menu a tendina.',
    ],
  },
  {
    v: '1.16', title: 'Contratti: controparte dal Registro Stakeholder, collegamento a più voci di Capitolato', date: '31 ottobre 2026',
    points: [
      'Nella scheda Contratto, il campo "Controparte" è ora un menu a tendina che pesca dal Registro Stakeholder della commessa, invece di un testo libero — coerente con quanto già fatto per "Impresa" in Lavorazioni e per i fornitori in Maestranze.',
      'Un contratto può ora essere collegato a più voci di Capitolato Requisiti insieme, tramite una selezione multipla nella scheda di modifica: non più una sola voce come prima.',
      'Ogni voce di capitolato resta collegata a un solo contratto alla volta: selezionandola su un contratto diverso, viene spostata da quello precedente — lo stesso vincolo già in vigore nella scheda Capitolato Requisiti, qui gestito per più voci in un solo salvataggio.',
      'La card di ogni contratto mostra ora l\'elenco delle voci di capitolato collegate. Il vecchio campo "Riferimento capitolato" resta disponibile come nota libera separata, per non perdere quanto già scritto in precedenza.',
    ],
  },
  {
    v: '1.15', title: 'Menu laterale fisso durante lo scorrimento', date: '30 ottobre 2026',
    points: [],
    bugfix: [
      'Corretto un refuso nel foglio di stile che annullava l\'effetto "fisso" del menu a sinistra: scorrendo una pagina lunga (es. un elenco con molte righe), il menu ora resta sempre visibile e nella stessa posizione, invece di scorrere via insieme al contenuto.',
    ],
  },
  {
    v: '1.14', title: 'Righe modificabili nella vista aggregata di gruppo', date: '30 ottobre 2026',
    points: [
      'Finora, selezionando la vista aggregata di gruppo (es. "RSW Roma — tutte"), tutti i registri diventavano di sola lettura: ora si può cliccare una riga e modificarla direttamente, senza dover prima tornare a selezionare una singola commessa dal menu a sinistra.',
      'La modifica resta sempre sulla commessa a cui la riga appartiene, mostrata nella colonna "Commessa": non è possibile spostare per errore un dato da una commessa all\'altra semplicemente modificandolo dalla vista di gruppo.',
      'Registro Criticità: anche il pulsante "Importa da Excel" torna disponibile in vista di gruppo, dato che ogni riga importata viene già assegnata alla commessa corretta in base al nome del PM.',
      'Restano riservate a una singola commessa solo le operazioni che richiedono di scegliere a quale commessa appartengono: creare una nuova riga, eliminarla, esportare in Excel e i cruscotti numerici che sommano i dati di una sola commessa.',
      'Per gli utenti con accesso Cliente non cambia nulla: restano a sola lettura come prima, in vista singola o di gruppo.',
    ],
  },
  {
    v: '1.13', title: 'Correzione pannello Work Package, sidebar con più profondità', date: '30 ottobre 2026',
    points: [
      'La sidebar a sinistra ha ora una leggera profondità: una sfumatura verso un tono più scuro e un’ombra sul bordo, per staccarla meglio dal contenuto della pagina — invariata nella sostanza, solo nell’aspetto, e coerente sia nel tema chiaro sia in quello scuro.',
    ],
    bugfix: [
      'Corretto un problema per cui, con la vista aggregata di gruppo attiva (es. "RSW Roma — tutte"), il pannello "Work package della commessa selezionata" nella scheda Commesse restava vuoto anche selezionando una riga della tabella. Ora il pannello segue sempre la riga selezionata nell’elenco commesse, mostrando il codice della commessa scelta nel titolo ("Work package di 2514RW"), sia in vista singola commessa sia in vista aggregata di gruppo.',
    ],
  },
  {
    v: '1.12', title: 'Import Excel del Registro Criticità PM', date: '30 ottobre 2026',
    points: [
      'Nuovo pulsante "Importa da Excel" nella scheda Registro Criticità, sullo stesso modello già disponibile per Decisioni e Approvazioni Drawings: permette di caricare direttamente il Registro Criticità aggiornato dai PM di GILI, senza doverlo ricopiare a mano.',
      'L’importazione riconosce da sola la riga di intestazione reale del file (anche quando sopra ci sono righe di titolo o legenda) e i nomi di colonna usati dai PM: PM, Piano/Area, Tipo, Criticità, Cosa serve, Urgenza, Data limite, Impatto PL, Stato, Note dal DDC, Risposta dei PM.',
      'Ogni riga viene assegnata in automatico al Work Package corretto in base alla colonna "PM": PM FOH → WP1 FOH, PM Corridoi → WP2 CORRIDOI, PM Suite → WP3 SUITE, PM Scala B → WP4 SCALA B, tutti all’interno della commessa 2514RW — coerentemente con il fatto che FOH, Corridoi, Suite e Scala B sono i quattro Work Package della stessa commessa, e non commesse separate.',
      'Le righe con un valore nella colonna "PM" non riconosciuto (ad esempio relativo a una commessa non ancora presente in Coordinamento Commesse) vengono saltate e segnalate con il motivo esatto, così nessun dato viene perso o assegnato per errore: l’app non crea mai in automatico una nuova commessa.',
      'Piano/Area, Tipo di criticità, Note dal DDC e Risposta dei PM vengono riportati in nota sulla criticità creata, per mantenere la piena tracciabilità di ogni riga importata rispetto al file originale.',
    ],
  },
  {
    v: '1.11', title: 'Vista aggregata per gruppo di commesse', date: '30 ottobre 2026',
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
      'Livello, Area, Ambiente, Project Manager e le altre annotazioni della maschera GILI vengono riportati in nota, così da non perdere il contesto di ogni riga importata.',
    ],
    bugfix: [
      'Risolto il problema per cui il pulsante "Importa da Excel" nella scheda Approvazioni Drawings non importava alcuna riga con l’elenco deliverable reale: le intestazioni si trovavano su una riga diversa da quella attesa e i nomi di colonna non corrispondevano a quelli del modello generico. L’importazione ora riconosce sia il modello semplice sia il formato reale dell’Elenco Deliverable, individuando da sola la riga di intestazione.',
      'Quando un elaborato non ha ancora un "Nome elaborato" assegnato, veniva perso: ora viene usato come titolo provvisorio il nome dell’ambiente, dell’area o della zona.',
      'Lo stato riportato nella colonna "Status" (OK, temi minori, in approvazione, da rilevare, e così via) non veniva riconosciuto: viene ora convertito automaticamente nei 4 stati dell’applicazione, mantenendo il testo originale in nota quando la corrispondenza non è diretta.',
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

  // --- Valutazioni critiche ---
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'Valutazioni critiche', bold: true, color: NAVY, size: 30 })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({
      text: 'Registro delle verifiche indipendenti condotte sull\'applicazione, a confronto con gli strumenti equivalenti disponibili sul mercato. Un rilievo resta aperto finché non viene chiuso da una versione successiva, richiamata esplicitamente.',
      italics: true, color: GRAY, size: 20,
    })],
  }),
];

VALUTAZIONI_CRITICHE.forEach((v) => {
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } },
    spacing: { before: 260, after: 50 },
    children: [new TextRun({ text: v.ambito, bold: true, color: NAVY, size: 22 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: v.data, italics: true, color: GRAY, size: 18 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: v.sintesi, color: BODY, size: 21 })],
  }));
  v.rilievi.forEach((r) => {
    const risolta = r.stato !== 'Aperta';
    children.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [
        new TextRun({ text: r.testo + '  ', color: BODY, size: 21 }),
        new TextRun({ text: `[${r.stato}]`, bold: true, color: risolta ? NAVY : RED, size: 19 }),
      ],
    }));
  });
  if (v.nota) {
    children.push(new Paragraph({
      spacing: { before: 40, after: 60 },
      children: [new TextRun({ text: v.nota, italics: true, color: GRAY, size: 18 })],
    }));
  }
});

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
  if (s.points.length) {
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
  }
  if (s.bugfix && s.bugfix.length) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 90 },
      children: [new TextRun({ text: 'Bug risolti', bold: true, allCaps: true, color: RED, size: 20 })],
    }));
    s.bugfix.forEach((p) => {
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 110 },
        children: [new TextRun({ text: p, color: BODY, size: 22 })],
      }));
    });
  }
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
