// Guida e Supporto: la guida completa a tutte le funzioni dell'app, un
// solo pulsante raggiungibile da qualunque pagina (topbar, sempre
// visibile) invece che un documento a parte. Diversa dalla guida in
// linea contestuale ("?" in alto in ogni scheda, e sotto ogni campo dei
// moduli): qui c'è la mappa intera, consultabile e cercabile mentre si
// lavora, organizzata nello stesso ordine della sidebar. Ogni voce
// nell'indice a sinistra apre, cliccandoci sopra, una pagina di
// dettaglio dedicata con l'elenco di tutte le funzioni attive di quella
// scheda e come si usano — non più un unico lungo elenco scorrevole.
import { el, openModal } from './ui.js';

const GUIDA = [
  {
    gruppo: 'Introduzione',
    voci: [
      {
        id: 'guida-struttura', icona: '◉', titolo: 'Come è organizzata l\'app',
        intro: 'La logica che regge tutte le pagine: commessa, Work Package, e come si passa dall\'una all\'altra.',
        funzioni: [
          { nome: 'Selettore Commessa (sidebar)', testo: 'Ogni dato dell\'app appartiene a una commessa. Il menu a tendina in cima alla sidebar sceglie la commessa attiva: cambiandola, ogni pagina aperta ricarica subito i propri dati su quella commessa.' },
          { nome: 'Work Package (WP1, WP2…)', testo: 'Ogni commessa è divisa in Work Package, gestiti dalla pagina Commesse. Quasi tutti i registri li usano come filtro (pulsanti o tendina in alto) e come raggruppamento.' },
          { nome: 'Vista aggregata di gruppo', testo: 'Quando più commesse condividono lo stesso "Gruppo progetto" (impostato in Commesse), il selettore propone anche una vista che le mostra tutte insieme, in sola lettura, con ogni riga etichettata dalla propria commessa di origine. Per creare o modificare una riga occorre tornare a selezionare una singola commessa.' },
          { nome: 'Sidebar ridimensionabile', testo: 'Il bordo destro della sidebar si trascina per allargarla o stringerla; la larghezza scelta resta memorizzata nel browser.' },
          { nome: 'Ricerca in tutti i registri', testo: 'Il campo di ricerca in cima a ogni pagina interroga insieme i registri principali della commessa (o del gruppo) e apre direttamente il risultato scelto, senza dover sapere in quale scheda si trova.' },
          { nome: 'Pulsante "Guida" in alto', testo: 'Accanto al campo di ricerca, su ogni pagina: apre questa stessa guida.' },
        ],
      },
      {
        id: 'guida-ruoli', icona: '◎', titolo: 'Ruoli e accesso',
        intro: 'Chi può vedere e modificare cosa.',
        funzioni: [
          { nome: 'Amministratore', testo: 'Accesso completo a tutte le sezioni, incluse quelle riservate: Dashboard Finanziaria, Utenti, Impostazioni.' },
          { nome: 'Operatore', testo: 'Accesso completo in lettura e scrittura a tutti i registri operativi, eccetto Dashboard Finanziaria e Impostazioni.' },
          { nome: 'Cliente', testo: 'Sempre in sola lettura, e per difetto non vede nessuna sezione: un amministratore gli concede le singole sezioni visibili dalla pagina Utenti, scheda per scheda.' },
          { nome: 'Autenticazione a due fattori (MFA)', testo: 'Attivabile dall\'icona lucchetto accanto al proprio nome in fondo alla sidebar: genera un codice QR da collegare a un\'app authenticator (Google Authenticator, Authy…), dopodiché il login richiede anche il codice a 6 cifre.' },
          { nome: 'Policy password', testo: 'Una password minima richiesta in fase di creazione o cambio account, applicata dalla stessa pagina di sicurezza.' },
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
        funzioni: [
          { nome: 'Scadenze della settimana', testo: 'In cima, senza bisogno di click: criticità urgenti, milestone e to-do con scadenza nei prossimi 7 giorni, con quelli già scaduti evidenziati in rosso.' },
          { nome: 'To-do e note veloci', testo: 'Un campo per scrivere un promemoria rapido, con una scadenza facoltativa impostata a mano. Avvicinandosi alla scadenza la nota cambia colore e compare anche fra le "Scadenze della settimana". Si elimina con un click una volta completata.' },
          { nome: 'Box per registro', testo: 'Un riquadro per ogni registro principale (Criticità, Decisioni, Allert, Timeline…) con i numeri chiave (es. "3 criticità urgenti scadute"). Cliccando il titolo del box si apre l\'elenco completo in una finestra, senza cambiare pagina.' },
          { nome: 'Attività recente', testo: 'In fondo alla pagina: la cronologia delle ultime modifiche fatte su tutti i registri (chi, cosa, quando). Il riquadro è collassabile cliccando sulla sua barra del titolo, e ricorda lo stato aperto/chiuso scelto.' },
        ],
      },
      {
        id: 'guida-finanziaria', icona: '€', titolo: 'Dashboard Finanziaria',
        intro: 'Riservata agli amministratori: l\'unica vista multi-commessa dell\'app, pensata per chi segue il quadro economico di tutte le commesse insieme.',
        funzioni: [
          { nome: 'Totale aggregato', testo: 'Somma il valore dei contratti e dei relativi atti aggiuntivi su tutte le commesse esistenti, non solo quella selezionata in sidebar.' },
          { nome: 'Scheda Contratti fornitori', testo: 'Elenca tutti i contratti con i fornitori, pescati dal Registro Contratti di ciascuna commessa. Una riga cliccabile apre il dettaglio del contratto.' },
          { nome: 'Riassegna commessa', testo: 'Dal dettaglio di un contratto, un\'azione rapida permette di spostarlo su un\'altra commessa senza doverlo ricreare da zero.' },
        ],
      },
      {
        id: 'guida-sal', icona: '◈', titolo: 'SAL — Stato Avanzamento Lavori',
        intro: 'Avanzamento fisico del cantiere, costruito sui dati già inseriti in Lavorazioni — non un SAL contabile: non calcola quantità né prezzi unitari.',
        funzioni: [
          { nome: 'Percentuale di avanzamento', testo: 'Calcolata in tempo reale dalla media delle percentuali di completamento delle lavorazioni, sia per Work Package sia per Impresa.' },
          { nome: '"+ Chiudi nuovo SAL"', testo: 'Congela l\'avanzamento del momento con un numero progressivo (SAL 1, SAL 2…) e lo confronta automaticamente con l\'ultimo SAL chiuso, mostrando il delta percentuale.' },
          { nome: 'Storico SAL', testo: 'Ogni SAL chiuso resta consultabile e stampabile; è anche eliminabile, in caso sia stato chiuso per errore.' },
        ],
      },
      {
        id: 'guida-documenti', icona: '▣', titolo: 'Documenti',
        intro: 'L\'archivio della commessa, con cartelle nidificate a piacere, markup sui disegni ed editor di testo integrato.',
        funzioni: [
          { nome: '"+ Nuovo documento"', testo: 'Crea una riga con un link esterno (es. una cartella condivisa) e/o un file caricato dal computer (PDF, immagine, Word, Excel… fino a 25 MB) — i due modi si possono combinare sulla stessa riga.' },
          { nome: '"+ Scrivi documento Word"', testo: 'Apre un editor di testo (grassetto, corsivo, elenchi, titoli) direttamente nell\'app: il risultato è un vero file .docx salvato nell\'archivio, scaricabile e riapribile qui per modificarlo ancora. La stessa funzione è richiamabile anche da Note di Coordinamento.' },
          { nome: '"+ Nuova cartella"', testo: 'Le cartelle si annidano a piacere (una cartella dentro un\'altra); si rinominano o si spostano col pulsante ✎ sulla cartella, si eliminano col 🗑 solo se vuote.' },
          { nome: 'Markup sui disegni', testo: 'Cliccando direttamente la riga di un PDF o di un\'immagine si apre l\'anteprima con gli strumenti di markup (penna, evidenziatore, nuvola di revisione, testo). "Salva markup" crea una nuova sessione datata, senza mai sovrascrivere le precedenti: tutte restano consultabili — e singolarmente eliminabili — dal menu "Cronologia sessioni".' },
          { nome: '"Segnala criticità" (dal markup)', testo: 'Su una o più annotazioni selezionate, crea righe nel Registro Criticità già collegate al disegno e alla pagina esatta.' },
          { nome: 'Data creazione e Ultima modifica', testo: 'Aprendo un documento esistente, il modulo mostra quando è stato creato e quando modificato l\'ultima volta (sola lettura).' },
          { nome: 'Pulsante "Storico"', testo: 'Per riga: elenca ogni creazione o modifica di quel documento, con data e utente responsabile.' },
        ],
      },
      {
        id: 'guida-report', icona: '▥', titolo: 'Report',
        intro: 'Report salvati che aggregano una o più sezioni, da rigenerare con un click invece di ricostruire a mano lo stesso export ogni volta.',
        funzioni: [
          { nome: 'Configurazione report', testo: 'Si scelgono le sezioni da includere (Criticità, Decisioni, Lavorazioni, Timeline…), filtrabili per Work Package e per periodo.' },
          { nome: 'Esportazione', testo: 'Ogni report configurato si scarica in PDF, Word o Excel, oppure si invia via email in allegato direttamente dall\'app.' },
        ],
      },
    ],
  },
  {
    gruppo: 'Coordinamento',
    voci: [
      {
        id: 'guida-timeline', icona: '▬', titolo: 'Timeline Montaggi',
        intro: 'Il Gantt della commessa, in stile MS Project: milestone e lavorazioni insieme sulla stessa linea del tempo, con baseline, dipendenze e predecessori.',
        funzioni: [
          { nome: 'Cantieri e sotto cantieri attivi', testo: 'Una barra sempre visibile in cima mostra le lavorazioni attualmente in corso, senza dover scorrere il Gantt per trovarle.' },
          { nome: 'Granularità e zoom', testo: 'Pulsanti Settimane/Mesi/Trimestri/Semestri cambiano l\'unità della scala temporale; lo slider "Zoom" la comprime o espande in continuo.' },
          { nome: 'Colonne della tabella', testo: 'Numerazione WBS (1, 1.1, 1.1.1…), Durata in giorni, Baseline inizio/fine, Inizio/Fine correnti, e i Predecessori con il codice di dipendenza (es. "2.1FS+2gg").' },
          { nome: 'Raggruppamento per Piano', testo: 'Le attività si raggruppano per Piano con una barra blu scuro riassuntiva, comprimibile cliccando il simbolo ▾ accanto al nome del gruppo.' },
          { nome: 'Sotto-attività e riepilogo', testo: 'Una lavorazione può avere sotto-attività (fino a 2 livelli di profondità): la lavorazione madre diventa automaticamente una riga di riepilogo, con la barra che copre l\'intervallo minimo-massimo delle sotto-attività.' },
          { nome: 'Baseline della milestone', testo: 'Ogni milestone congela una baseline alla creazione: se le date si spostano, la barra originale resta visibile in trasparenza, sovrapposta per il 70% a quella attuale. Aprendo la milestone, i campi "Baseline inizio" e "Baseline fine" nel modulo sono modificabili indipendentemente — utile per allineare il riferimento a un nuovo piano concordato senza perdere la scadenza reale.' },
          { nome: 'Flag di scostamento', testo: 'Un pallino ambra accanto al titolo segnala qualunque scostamento dalla baseline; un flag rosso ⚑ segnala in più uno slittamento vero e proprio (la fine attuale supera quella di baseline).' },
          { nome: 'Milestone a rombo', testo: 'Rappresentate col simbolo classico a rombo (non una barra), centrato sulla data di scadenza; un anello rosso indica una milestone in ritardo.' },
          { nome: 'Trascinamento e modulo di modifica', testo: 'Si trascina direttamente la barra o il rombo per spostare le date; un clic senza trascinare apre invece il modulo completo di modifica.' },
          { nome: 'Predecessori e dipendenze', testo: 'Dal modulo di un\'attività già salvata, "+ Aggiungi predecessore" collega un\'altra riga con un ritardo opzionale (fine-inizio). Le frecce a gomito nel Gantt mostrano i collegamenti: rosse se sul percorso critico, tratteggiate se in conflitto con le date attuali.' },
          { nome: 'Colonne ridimensionabili', testo: 'La linea che separa le colonne delle attività dal grafico a barre si trascina col mouse, esattamente come il bordo della sidebar; la larghezza scelta resta memorizzata.' },
          { nome: 'Pulsante "Colori"', testo: 'Personalizza il colore di ogni stato, della baseline, del riepilogo, del gruppo Piano e delle milestone — salvato nel browser.' },
          { nome: 'Legenda sempre visibile', testo: 'La legenda dei colori resta fissa in fondo allo schermo durante lo scorrimento, non più nascosta sotto al bordo della finestra.' },
          { nome: 'Stampa', testo: 'Il modulo "Stampa Timeline" consente di stampare l\'elenco per un periodo scelto e, spuntando "Includi anche la vista Gantt", anche il grafico — con un\'intestazione "Crono di cantiere - Rev N - [data]" ed "Emesso da: Giovanni Cazzola - Direttore di cantiere"; il numero di revisione è proposto in automatico ma resta modificabile.' },
        ],
      },
      {
        id: 'guida-lavorazioni', icona: '⚙', titolo: 'Lavorazioni',
        intro: 'L\'elenco operativo delle lavorazioni di montaggio, con stato di avanzamento — la stessa fonte dati che alimenta la Timeline.',
        funzioni: [
          { nome: 'Campi principali', testo: 'Stato (Da fare/In corso/Completata/Bloccata), priorità, Piano/Zona, Data inizio/fine, impresa (scelta dal Registro Stakeholder) e un\'Avanzamento % modificabile a mano, indipendente dallo stato.' },
          { nome: 'Filtri a bottone', testo: 'In alto, per Work Package e per stato: un clic per applicarli, un secondo per toglierli.' },
          { nome: 'Misure rilevate in opera', testo: 'Dentro una lavorazione, confronta la quota di progetto con quella misurata in cantiere, calcola lo scostamento e permette di segnalarlo nel Registro Criticità con un click.' },
          { nome: 'Grafici', testo: 'Due grafici (a barre e a torta) mostrano la distribuzione delle lavorazioni per stato, aggiornati in tempo reale.' },
          { nome: 'Import cronoprogramma da CSV', testo: '"Modello CSV" scarica un file di esempio con le intestazioni attese (Titolo, WP, Piano, Zona, Data inizio, Data fine, Stato, Priorità, Impresa, Descrizione); "Importa da CSV" carica il file compilato e crea in blocco le lavorazioni, visibili subito anche in Timeline. Le righe senza titolo o date vengono scartate con il motivo indicato.' },
          { nome: 'Stampa', testo: 'Include i due grafici e un\'introduzione pensata per la condivisione diretta con il cliente.' },
        ],
      },
      {
        id: 'guida-criticita', icona: '▲', titolo: 'Registro Criticità',
        intro: 'Le richieste aperte verso la Direzione Lavori o altre controparti, con scadenza di risposta quando serve.',
        funzioni: [
          { nome: 'Urgenza', testo: '"Urgente (3gg)" impone una scadenza ed entra tra le scadenze della settimana sul Cruscotto; "Dovuta da controparte" è un sollecito senza termine fisso; "Normale" non ha scadenza.' },
          { nome: 'Ordinamento automatico', testo: 'Le criticità urgenti scadute compaiono sempre per prime in tabella, evidenziate in rosso.' },
          { nome: 'Filtri a bottone', testo: 'Per stato e per Work Package, in alto alla tabella.' },
          { nome: 'Import/export Excel', testo: 'Importa un elenco da un file Excel nel formato del PM (con mappatura automatica di commessa e WP) ed esporta l\'elenco corrente.' },
        ],
      },
      {
        id: 'guida-decisioni', icona: '◆', titolo: 'Registro Decisioni',
        intro: 'Domande a risposta chiusa (SÌ/NO) rivolte a DL, SAC o GC, con l\'attesa tracciata automaticamente.',
        funzioni: [
          { nome: 'Anzianità e tasso di resa', testo: 'Calcolati automaticamente: i giorni trascorsi dalla prima richiesta, e la percentuale di decisioni della commessa già risolte.' },
          { nome: 'Conferma scritta', testo: 'Un flag indica se la risposta è arrivata per iscritto o solo verbalmente.' },
          { nome: 'Filtri a tendina', testo: 'Per Work Package, stato e urgenza (oltre 21 giorni di attesa), combinabili fra loro.' },
          { nome: '"Raggruppa per WP"', testo: 'Interruttore che divide la tabella in sezioni, una per Work Package, per leggere rapidamente le pendenze di un singolo WP.' },
          { nome: '"Rilancia"', testo: 'Su una decisione ancora senza risposta, registra un nuovo sollecito mantenendo la storia dei precedenti.' },
          { nome: 'Import/export Excel', testo: 'Come per il Registro Criticità, nello stesso formato.' },
        ],
      },
      {
        id: 'guida-allert', icona: '⚠', titolo: 'Registro Allert',
        intro: 'Funzione di presidio GC: classifica il perimetro di un evento e traccia l\'azione di tutela messa in atto.',
        funzioni: [
          { nome: 'Perimetro e classificazione', testo: 'Perimetro libero (es. interno/esterno) e classificazione Informativo/Attenzione/Critico: gli allert critici ancora aperti sono evidenziati in rosso.' },
          { nome: 'Collegamenti', testo: 'Un allert può agganciarsi a una criticità, una decisione o un requisito già registrato altrove, restando comunque un fascicolo a sé.' },
          { nome: 'Import da CSV', testo: '"Modello CSV" + "Importa da CSV" per popolare in blocco il registro (Descrizione, WP, Data, Perimetro, Classificazione, Azione di tutela, Riferimento documento, Stato, Note); i collegamenti a criticità/decisione/requisito restano da impostare a mano dopo l\'import.' },
        ],
      },
      {
        id: 'guida-note', icona: '▤', titolo: 'Note di Coordinamento',
        intro: 'L\'agenda numerata da inviare a un interlocutore esterno (tipicamente SAC/ATI), generata dalle criticità ancora aperte.',
        funzioni: [
          { nome: '"Genera bozza"', testo: 'Crea automaticamente una lista numerata a partire dalle criticità ancora aperte, filtrabile per Work Package e per un intervallo di date (invece di includerle sempre tutte); il risultato resta comunque modificabile prima dell\'invio.' },
          { nome: '"+ Scrivi documento Word"', testo: 'La stessa funzione di creazione documento disponibile in Documenti, richiamabile direttamente da qui per scrivere la nota senza cambiare pagina; il file finisce comunque nell\'archivio Documenti condiviso.' },
        ],
      },
      {
        id: 'guida-diario', icona: '≡', titolo: 'Diario di Cantiere',
        intro: 'Una voce per ogni giornata: squadre presenti, attività svolte, eventi e criticità rilevate.',
        funzioni: [
          { nome: 'Voce giornaliera', testo: 'Registra in un unico punto il controllo quotidiano informale del cantiere, complementare ai registri formali.' },
          { nome: 'Rimando ai registri formali', testo: 'Se un evento annotato nel diario richiede una risposta formale, da qui si passa poi ad aprire una vera criticità nel registro dedicato.' },
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
        funzioni: [
          { nome: 'Versionamento', testo: 'Ogni modifica a titolo o descrizione crea automaticamente una nuova versione, consultabile dal pulsante "Versioni" — nulla viene mai sovrascritto.' },
          { nome: '"Richiedi approvazione"', testo: 'Crea in automatico una decisione collegata nel Registro Decisioni, dove confluiscono tutte le approvazioni richieste.' },
          { nome: 'Import da CSV', testo: '"Modello CSV" + "Importa da CSV" per caricare in blocco un elenco di requisiti (Codice WBS, Titolo, WP, Fase, Descrizione, Fonte capitolato, Stato, Note); ogni riga importata crea anche la propria prima versione, come una creazione manuale.' },
        ],
      },
      {
        id: 'guida-capitolato', icona: '▦', titolo: 'Capitolato Requisiti',
        intro: 'Scrittura del capitolato in stile tabellare, con codici WBS, raggruppata per contratto.',
        funzioni: [
          { nome: 'Voce come documento', testo: 'Ogni voce del capitolato si apre come un documento a sé, con il proprio testo esteso.' },
          { nome: 'Requisiti collegati', testo: 'Compaiono come sottorighe sotto la voce, modificabili senza mai lasciare la vista.' },
        ],
      },
      {
        id: 'guida-drawings', icona: '✎', titolo: 'Approvazioni Drawings',
        intro: 'Gli elaborati (shop drawing) sottoposti ad approvazione, con la disciplina IFA/IFC.',
        funzioni: [
          { nome: 'Stato IFA/IFC', testo: 'IFA = non valido per fabbricazione; il passaggio a IFC (emesso per costruzione) avviene manualmente dopo il visto formale della Direzione Lavori.' },
          { nome: 'Data limite approvazione (cut-off)', testo: 'Evidenzia in rosso i ritardi della Direzione Lavori rispetto al programma di consegna concordato.' },
          { nome: 'Response Matrix', testo: 'Il pulsante "Matrice" raccoglie i commenti ricevuti su una revisione, uno per riga, con l\'azione intrapresa e un flag "Change Order" per chi cambia lo scope invece di un dettaglio grafico.' },
          { nome: 'Import da Excel', testo: 'Riconosce sia un template semplice sia il formato dell\'Elenco Deliverable usato da GILI.' },
        ],
      },
      {
        id: 'guida-contratto', icona: '▭', titolo: 'Contratti',
        intro: 'Il contratto stipulato, con baseline di capitolato e procedura di change management concordata in fase di stipula.',
        funzioni: [
          { nome: 'Baseline e variazioni', testo: 'Ogni modifica a un requisito successiva alla data di baseline del contratto è segnalata come "variazione da gestire", con un\'azione rapida per spedirla nel Registro Allert.' },
          { nome: 'Atti aggiuntivi', testo: 'Si sommano automaticamente al valore base del contratto nel totale mostrato, senza calcoli manuali.' },
        ],
      },
    ],
  },
  {
    gruppo: 'Stakeholder',
    voci: [
      {
        id: 'guida-stakeholder', icona: '⊙', titolo: 'Registro Stakeholder',
        intro: 'L\'anagrafica di persone e organizzazioni coinvolte nella commessa, con la matrice interesse/influenza.',
        funzioni: [
          { nome: 'Matrice interesse/influenza', testo: 'Ogni stakeholder ha un livello di interesse (basso/medio/alto) e di influenza (bassa/media/alta), prassi standard di project management.' },
          { nome: 'Fonte unica per i menu Impresa', testo: 'I nomi registrati qui alimentano i menu a tendina "Impresa" di Lavorazioni, Maestranze e Contratti — un solo punto dove tenerli aggiornati.' },
          { nome: 'Base del Piano Comunicazioni', testo: 'Gli stakeholder qui registrati sono anche l\'elenco su cui si costruisce la matrice RACI del Piano Comunicazioni.' },
          { nome: 'Import da CSV', testo: '"Modello CSV" + "Importa da CSV" per popolare in blocco l\'anagrafica (Nome, Organizzazione, Ruolo, Categoria, Interesse, Influenza, Email, Telefono, Stato, Note).' },
        ],
      },
      {
        id: 'guida-maestranze', icona: '◈', titolo: 'Maestranze',
        intro: 'L\'anagrafica delle squadre e dei preposti presenti in cantiere.',
        funzioni: [
          { nome: 'Fornitori collegati', testo: 'Si scelgono con una selezione multipla direttamente dal Registro Stakeholder, non scritti a mano in un campo libero.' },
          { nome: 'Import da CSV', testo: '"Modello CSV" + "Importa da CSV" per popolare in blocco l\'elenco (Nome, Ruolo, Azienda, Telefono, WP, Stato, Qualifiche); i fornitori collegati restano da impostare a mano dopo l\'import.' },
        ],
      },
      {
        id: 'guida-comunicazione', icona: '↔', titolo: 'Piano Comunicazioni',
        intro: 'I processi di comunicazione ricorrenti della commessa (riunioni, aggiornamenti registro, approvazioni…).',
        funzioni: [
          { nome: 'Un processo per riga', testo: 'Frequenza, canale, output atteso e ruolo responsabile per ciascun processo di comunicazione ricorrente.' },
          { nome: 'Matrice RACI', testo: 'Per ogni processo, chi fra gli stakeholder della commessa è Responsible, Accountable, Consulted o Informed.' },
        ],
      },
    ],
  },
  {
    gruppo: 'Gestione',
    voci: [
      {
        id: 'guida-commesse', icona: '⌂', titolo: 'Commesse',
        intro: 'L\'anagrafica delle commesse e dei rispettivi Work Package — il punto di partenza di tutta l\'app.',
        funzioni: [
          { nome: 'Anagrafica commessa', testo: 'Codice, nome ed eventuale "Gruppo progetto" (per abilitare la vista aggregata multi-commessa).' },
          { nome: 'Work Package collegati', testo: 'Gestibili direttamente dal modulo di modifica della commessa: ogni modifica si propaga subito a tutta l\'app, menu della sidebar e filtri inclusi.' },
        ],
      },
      {
        id: 'guida-utenti', icona: '◎', titolo: 'Utenti',
        intro: 'Gestione degli accessi, riservata agli amministratori.',
        funzioni: [
          { nome: 'Creazione account', testo: 'Nome, email, password iniziale e ruolo (Amministratore/Operatore/Cliente).' },
          { nome: 'Sezioni concesse al Cliente', testo: 'Per un utente Cliente, l\'elenco delle sezioni singolarmente visibili — per difetto nessuna.' },
          { nome: 'Sicurezza account', testo: 'MFA e policy di password minima, attivabili dall\'icona lucchetto accanto al proprio nome in sidebar (vedi "Ruoli e accesso").' },
        ],
      },
      {
        id: 'guida-impostazioni', icona: '⚙', titolo: 'Impostazioni',
        intro: 'Personalizzazione delle liste a tendina usate in tutta l\'app, riservata agli amministratori.',
        funzioni: [
          { nome: 'Liste libere', testo: 'Es. "Tipo documento": accettano l\'aggiunta di nuove opzioni in qualunque momento.' },
          { nome: 'Etichette di stato', testo: 'Permettono di rinominare solo il testo mostrato per uno stato esistente (es. "Da fare" → "Non iniziata"), non di aggiungere o togliere stati: la logica dietro resta quella fissa dell\'app.' },
        ],
      },
      {
        id: 'guida-lezioni', icona: '✓', titolo: 'Lezioni Apprese',
        intro: 'Quanto imparato da criticità, decisioni e allert già chiusi, per non ripetere gli stessi errori sulla prossima commessa.',
        funzioni: [
          { nome: 'Collegamento opzionale', testo: 'Ogni lezione può agganciarsi a una criticità, decisione o allert già registrato, per risalire al caso concreto che l\'ha generata.' },
          { nome: 'Vista a righe cliccabili', testo: 'Numero, data e descrizione in elenco compatto; un clic apre il dettaglio.' },
        ],
      },
    ],
  },
  {
    gruppo: 'Funzioni trasversali',
    voci: [
      {
        id: 'guida-trasversali', icona: '✦', titolo: 'Funzioni che attraversano tutta l\'app',
        intro: 'Comportamenti e strumenti comuni a (quasi) ogni pagina, non legati a un singolo registro.',
        funzioni: [
          { nome: 'Ricerca cross-registro', testo: 'La casella "Cerca in tutti i registri…" in alto in ogni pagina interroga insieme i registri principali della commessa (o del gruppo in vista aggregata) e apre direttamente il risultato scelto.' },
          { nome: 'Aggiornamento in tempo reale', testo: 'Ogni modifica salvata da un utente viene notificata a chiunque abbia l\'app aperta: la pagina si aggiorna da sola, senza dover premere F5 per vedere il lavoro di un collega su un altro PC o tablet. Un modulo di modifica eventualmente aperto non viene toccato.' },
          { nome: 'Blocco sulle modifiche concorrenti', testo: 'Se due persone salvano la stessa riga quasi nello stesso momento, il secondo salvataggio viene rifiutato con un avviso invece di sovrascrivere in silenzio il lavoro del primo.' },
          { nome: 'Guida in linea contestuale', testo: 'Un "?" accanto al titolo di ogni pagina spiega la scheda in una riga; sotto quasi ogni campo dei moduli c\'è un testo che spiega cosa significa e come compilarlo.' },
          { nome: 'Storico delle modifiche', testo: 'Sui registri principali, ogni creazione, modifica o eliminazione lascia una traccia con utente, data e un riassunto di cosa è cambiato — pulsante "Storico" sulla riga.' },
          { nome: 'Stampa', testo: 'La maggior parte dei registri si stampa in un formato pulito, pensato per essere condiviso con DL/GC/cliente.' },
          { nome: 'Import/export Excel e CSV', testo: 'Registro Criticità, Decisioni e Approvazioni Drawings importano da Excel in formati dedicati; Lavorazioni, Registro Allert, Requisiti, Registro Stakeholder e Maestranze importano invece da un file CSV generico, con un modello scaricabile da ciascuna scheda.' },
          { nome: 'Backup automatico cifrato', testo: 'Il database viene salvato automaticamente, cifrato, con verifica periodica che il ripristino funzioni davvero.' },
          { nome: 'Accesso per ruolo', testo: 'Amministratore/Operatore/Cliente, con vista aggregata di gruppo in sola lettura per le commesse collegate (vedi "Ruoli e accesso" e "Come è organizzata l\'app").' },
        ],
      },
    ],
  },
];

function testoRicercabile(voce) {
  return [voce.titolo, voce.intro, ...(voce.funzioni || []).map((f) => `${f.nome} ${f.testo}`)].join(' ').toLowerCase();
}

export function initGuidaSupporto() {
  const btn = document.getElementById('guidaSupportoBtn');
  if (!btn) return;
  btn.addEventListener('click', apriGuidaSupporto);
}

function paginaVoce(voce) {
  return el('div', { class: 'guida-supporto__pagina' }, [
    el('h3', { class: 'guida-supporto__pagina-titolo' }, `${voce.icona ? voce.icona + ' ' : ''}${voce.titolo}`),
    voce.intro ? el('p', { class: 'guida-supporto__pagina-intro' }, voce.intro) : null,
    voce.funzioni?.length ? el('div', { class: 'guida-supporto__sezione-titolo' }, 'Funzioni disponibili e come si usano') : null,
    el('ul', { class: 'guida-supporto__funzioni' }, (voce.funzioni || []).map((f) => el('li', { class: 'guida-supporto__funzione' }, [
      el('span', { class: 'guida-supporto__funzione-nome' }, f.nome),
      el('span', { class: 'guida-supporto__funzione-testo' }, f.testo),
    ]))),
  ]);
}

function apriGuidaSupporto() {
  const nav = el('div', { class: 'guida-supporto__nav' });
  const content = el('div', { class: 'guida-supporto__content' });
  const cercaInput = el('input', { type: 'search', placeholder: 'Cerca nella guida…' });

  content.appendChild(el('div', { class: 'guida-supporto__placeholder' }, [
    el('p', {}, 'Scegli un argomento dall\'elenco a sinistra per vedere tutte le funzioni di quella scheda e come si usano.'),
    el('p', {}, 'Oppure cerca qui sopra: la ricerca filtra l\'elenco degli argomenti.'),
  ]));

  const linkPerVoce = new Map();
  const gruppiNav = [];
  GUIDA.forEach((sezione) => {
    const gruppoEl = el('div', { class: 'guida-supporto__nav-gruppo' }, sezione.gruppo);
    nav.appendChild(gruppoEl);
    const linkDiQuestoGruppo = [];
    sezione.voci.forEach((voce) => {
      const link = el('button', {
        type: 'button', class: 'guida-supporto__nav-link',
        onclick: () => {
          nav.querySelectorAll('.guida-supporto__nav-link.active').forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
          content.innerHTML = '';
          content.appendChild(paginaVoce(voce));
          content.scrollTop = 0;
        },
      }, `${voce.icona ? voce.icona + ' ' : ''}${voce.titolo}`);
      link.dataset.testo = testoRicercabile(voce);
      nav.appendChild(link);
      linkDiQuestoGruppo.push(link);
      linkPerVoce.set(voce.id, link);
    });
    gruppiNav.push({ gruppoEl, link: linkDiQuestoGruppo });
  });

  cercaInput.addEventListener('input', () => {
    const q = cercaInput.value.trim().toLowerCase();
    gruppiNav.forEach(({ gruppoEl, link }) => {
      let almenoUnoVisibile = false;
      link.forEach((l) => {
        const visibile = q.length === 0 || l.dataset.testo.includes(q);
        l.style.display = visibile ? '' : 'none';
        if (visibile) almenoUnoVisibile = true;
      });
      gruppoEl.style.display = almenoUnoVisibile ? '' : 'none';
    });
  });

  const root = el('div', { class: 'guida-supporto' }, [
    el('div', { class: 'guida-supporto__search' }, [cercaInput]),
    el('div', { class: 'guida-supporto__body' }, [nav, content]),
  ]);
  openModal('Guida e Supporto', root, { full: true });
}
