# Note di rilascio — Coordinamento Commesse

Cosa cambia ad ogni aggiornamento, spiegato in modo semplice. Questo file
si aggiorna da solo ogni volta che viene caricata una nuova versione
dell'app (vedi `GUIDA_AGGIORNAMENTI.md` per come scaricarla sul Mac) e
resta il riferimento da condividere con chi usa l'app, per sapere cosa è
cambiato senza dover leggere il codice.

Le versioni più recenti sono in alto.

---

## In lavorazione

Nessuna modifica in corso al momento.

---

## Maestranze: nome scelto dal Registro Stakeholder (31 ottobre 2026)

- Nella scheda Maestranze, il campo "Nome" è ora un menu a tendina che
  pesca dal Registro Stakeholder della commessa, invece di un testo
  libero — coerente con "Controparte" nei Contratti, "Impresa" in
  Lavorazioni e i fornitori collegati già presenti in questa stessa
  scheda.
- Una maestranza già registrata in precedenza con un nome non
  presente nel Registro Stakeholder resta visibile e selezionata
  com'era, segnalata con la dicitura "(non più nel Registro
  Stakeholder)": nessun dato storico viene perso passando al menu a
  tendina.

---

## Contratti: controparte dal Registro Stakeholder, collegamento a più voci di Capitolato (31 ottobre 2026)

- Nella scheda Contratto, il campo "Controparte" è ora un menu a
  tendina che pesca dal Registro Stakeholder della commessa, invece di
  un testo libero — coerente con quanto già fatto per "Impresa" in
  Lavorazioni e per i fornitori in Maestranze.
- Un contratto può ora essere collegato a **più voci di Capitolato
  Requisiti insieme**, tramite una selezione multipla nella scheda di
  modifica: non più una sola voce come prima.
- Ogni voce di capitolato resta collegata a un solo contratto alla
  volta: selezionandola su un contratto diverso, viene spostata da
  quello precedente — lo stesso vincolo già in vigore nella scheda
  Capitolato Requisiti, qui gestito per più voci in un solo
  salvataggio.
- La card di ogni contratto mostra ora l'elenco delle voci di
  capitolato collegate. Il vecchio campo "Riferimento capitolato"
  resta disponibile come nota libera separata, per non perdere quanto
  già scritto in precedenza.

---

## Menu laterale fisso durante lo scorrimento (30 ottobre 2026)

- Corretto un refuso nel foglio di stile che annullava l'effetto
  "fisso" del menu a sinistra: scorrendo una pagina lunga (es. un
  elenco con molte righe), il menu ora resta sempre visibile e nella
  stessa posizione, invece di scorrere via insieme al contenuto.

---

## Righe modificabili nella vista aggregata di gruppo (30 ottobre 2026)

- Finora, selezionando la vista aggregata di gruppo (es. "RSW Roma —
  tutte"), tutti i registri diventavano di sola lettura: ora si può
  cliccare una riga e modificarla direttamente, senza dover prima
  tornare a selezionare una singola commessa dal menu a sinistra.
- La modifica resta sempre sulla commessa a cui la riga appartiene,
  mostrata nella colonna "Commessa": non è possibile spostare per
  errore un dato da una commessa all'altra semplicemente modificandolo
  dalla vista di gruppo.
- **Registro Criticità**: anche il pulsante "Importa da Excel" torna
  disponibile in vista di gruppo, dato che ogni riga importata viene
  già assegnata alla commessa corretta in base al nome del PM.
- Restano riservate a una singola commessa solo le operazioni che
  richiedono di scegliere a quale commessa appartengono: creare una
  nuova riga, eliminarla, esportare in Excel e i cruscotti numerici
  che sommano i dati di una sola commessa.
- Per gli utenti con accesso **Cliente** non cambia nulla: restano a
  sola lettura come prima, in vista singola o di gruppo.

---

## Correzione pannello Work Package, sidebar con più profondità (30 ottobre 2026)

- Corretto un problema per cui, con la vista aggregata di gruppo attiva
  (es. "RSW Roma — tutte"), il pannello "Work package della commessa
  selezionata" nella scheda Commesse restava vuoto anche selezionando
  una riga della tabella.
- Ora il pannello segue sempre la riga selezionata nell'elenco
  commesse, mostrando il codice della commessa scelta nel titolo
  ("Work package di 2514RW"), sia in vista singola commessa sia in
  vista aggregata di gruppo.
- La sidebar a sinistra ha ora una leggera profondità: una sfumatura
  verso un tono più scuro e un'ombra sul bordo, per staccarla meglio
  dal contenuto della pagina — invariata nella sostanza, solo
  nell'aspetto, e coerente sia nel tema chiaro sia in quello scuro.

---

## Import Excel del Registro Criticità PM (30 ottobre 2026)

- Nuovo pulsante **"Importa da Excel"** nella scheda Registro Criticità,
  sullo stesso modello già disponibile per Decisioni e Approvazioni
  Drawings: permette di caricare direttamente il Registro Criticità
  aggiornato dai PM di GILI, senza doverlo ricopiare a mano.
- L'importazione riconosce da sola la riga di intestazione reale del
  file (anche quando sopra ci sono righe di titolo o legenda) e i nomi
  di colonna usati dai PM: PM, Piano/Area, Tipo, Criticità, Cosa serve,
  Urgenza, Data limite, Impatto PL, Stato, Note dal DDC, Risposta dei PM.
- Ogni riga viene assegnata in automatico al Work Package corretto in
  base alla colonna "PM": PM FOH → WP1 FOH, PM Corridoi → WP2 CORRIDOI,
  PM Suite → WP3 SUITE, PM Scala B → WP4 SCALA B, tutti all'interno
  della commessa 2514RW — coerentemente con il fatto che FOH, Corridoi,
  Suite e Scala B sono i quattro Work Package della stessa commessa, e
  non commesse separate.
- Le righe con un valore nella colonna "PM" non riconosciuto (ad
  esempio relativo a una commessa non ancora presente in Coordinamento
  Commesse) vengono saltate e segnalate con il motivo esatto, così
  nessun dato viene perso o assegnato per errore: l'app non crea mai in
  automatico una nuova commessa.
- Piano/Area, Tipo di criticità, Note dal DDC e Risposta dei PM vengono
  riportati in nota sulla criticità creata, per mantenere la piena
  tracciabilità di ogni riga importata rispetto al file originale.

---

## Vista aggregata per gruppo di commesse (30 ottobre 2026)

- Nuovo campo **"Gruppo progetto"** nella scheda di ogni commessa
  (es. "RSW Roma"): commesse diverse che fanno parte dello stesso
  progetto (es. 2514RW e 2593RW) possono condividere lo stesso gruppo,
  pur restando commesse distinte con il proprio codice.
- Quando due o più commesse condividono un gruppo, nel menu a tendina
  in alto a sinistra compare una nuova opzione **"‹gruppo› — tutte
  (N)"**: selezionandola si vedono in un'unica vista, per tutti i
  registri (Lavorazioni, Decisioni, Criticità, Allert, Approvazioni
  Drawings, Requisiti, Capitolato Requisiti, Contratti, Registro
  Stakeholder, Piano Comunicazioni, Note di Coordinamento, Diario,
  Lezioni Apprese, Maestranze, Documenti, Timeline Montaggi), i dati
  di tutte le commesse del gruppo insieme — ogni riga mostra una
  colonna "Commessa" per sapere a quale commessa appartiene.
- La vista aggregata è **di sola lettura**: per creare o modificare
  una riga serve tornare a selezionare una singola commessa dal menu.
- Il Cruscotto e la Dashboard Finanziaria restano legati a una singola
  commessa e mostrano un avviso quando è selezionata la vista di
  gruppo.

---

## Correzione import Excel di Approvazioni Drawings (30 ottobre 2026)

- Risolto il problema per cui il pulsante **"Importa da Excel"** nella
  scheda Approvazioni Drawings non importava nulla con l'elenco
  deliverable reale (le intestazioni erano in una riga diversa da
  quella attesa e i nomi di colonna non corrispondevano).
- L'import ora riconosce sia il template semplice sia il formato reale
  dell'Elenco Deliverable, cercando da solo la riga di intestazione.
- Quando un elaborato non ha ancora un "Nome elaborato" assegnato,
  viene usato come titolo provvisorio il nome dell'ambiente/area/zona,
  così da non perdere elaborati ancora senza un file formale.
- Lo stato della colonna "Status" (OK, temi minori, in approvazione,
  da rilevare, ecc.) viene convertito automaticamente nei 4 stati
  dell'app, mantenendo il testo originale in nota quando serve.
- Livello, Area, Ambiente, PM e le annotazioni della maschera GILI
  vengono riportati in nota, così da non perdere il contesto di ogni
  riga importata.

---

## Sezione Misure in Lavorazioni (29 ottobre 2026)

- Ogni lavorazione ha ora una sezione **Misure**, per registrare le
  quote rilevate in cantiere a confronto con quelle di progetto, tratta
  per tratta (es. un segmento di boiserie, un vano scala).
- Per ogni misura si indicano la quota di progetto e la quota
  effettivamente rilevata in opera: l'app calcola da sola il delta e la
  percentuale di scostamento, ed evidenzia in modo visibile quando lo
  scostamento supera il 3% — una soglia di attenzione, non una
  tolleranza contrattuale: resta sempre una valutazione del Direttore
  di Cantiere, da annotare nella nota tecnica della misura.
- Da una misura fuori soglia è possibile **segnalare una criticità**
  con un clic: viene creata una nuova riga nel Registro Criticità, già
  precompilata con i dati della misura, e collegata ad essa.
- È stata aggiunta una **guida in linea**, richiamabile direttamente
  dalla sezione Misure, con la procedura in 5 fasi da seguire per
  l'aggiornamento delle misure in cantiere.

---

## Accesso cliente a sola lettura (29 ottobre 2026)

- Nuovo ruolo utente **Cliente**: un accesso a sola lettura, pensato per
  dare a GILI Creations (o ad altri soggetti esterni) la possibilità di
  vedere alcuni dati senza poter modificare nulla.
- Per ogni utente cliente si scelgono, da Impostazioni → Utenti, quali
  sezioni può vedere tra Timeline Montaggi, Lavorazioni e Approvazioni
  Drawings — tutte le altre sezioni (Commesse, Utenti, Impostazioni,
  Dashboard Finanziaria e qualunque sezione non spuntata) restano
  completamente invisibili e inaccessibili a quell'utente.
- In quelle sezioni il cliente vede tutto ma non trova pulsanti per
  creare, modificare, eliminare o importare: è una vetrina, non un
  accesso operativo.

---

## Affidabilità e sicurezza del server (29 ottobre 2026)

Aggiornamenti "dietro le quinte", non visibili nell'uso quotidiano
dell'app, ma importanti per la sicurezza dei dati:

- **Backup automatico cifrato**: ogni notte il database viene copiato,
  cifrato e salvato in una cartella a scelta (tipicamente iCloud Drive),
  con una verifica automatica ogni domenica che l'ultimo backup sia
  davvero recuperabile. Si attiva una tantum da
  `deploy/macos/installa-backup-automatico.command` (vedi
  `GUIDA_AGGIORNAMENTI.md`).
- Gli accessi non vengono più persi ad ogni riavvio del server (es.
  dopo un aggiornamento): restano validi come prima.
- Troppi tentativi di accesso sbagliati di fila da uno stesso
  indirizzo vengono ora bloccati temporaneamente, a protezione della
  password.
- Rinforzate le protezioni standard del server contro gli attacchi più
  comuni ai siti web (intestazioni di sicurezza).
- Aggiunta una prima serie di controlli automatici (test) sulle parti
  più delicate — accesso, etichette personalizzabili, aggiornamenti del
  database — così un errore si scopre prima di pubblicarlo.

---

## Capitolato Requisiti, Approvazioni Drawings, Timeline unificata (29 ottobre 2026)

- Il **Capitolato** è stato rinominato **Capitolato Requisiti**: ogni
  voce si apre ora come un documento, con i Requisiti collegati
  visibili e modificabili senza uscire dalla scheda.
- Nuova sezione **Approvazioni Drawings**: elenco degli elaborati
  sottoposti a DL/GC per approvazione, compilabile a mano o importando
  un elenco deliverable direttamente da un file Excel.
- **Timeline Montaggi**: il pulsante "+ Nuova riga" permette ora di
  scegliere se si sta creando una Milestone o una Lavorazione, ed è
  possibile modificare una lavorazione direttamente da qui.
- **Lavorazioni**: il campo Impresa/squadra è ora un menu a tendina
  collegato al Registro Stakeholder, invece di un testo libero.
- **Commesse**: il modal di modifica mostra ora i Work Package
  collegati, modificabili senza uscire dalla scheda.

---

## Etichette di stato personalizzabili (29 ottobre 2026)

- In **Impostazioni** è ora possibile rinominare il testo mostrato per
  gli stati di uso più frequente — ad esempio "Aperta/In attesa/Chiusa"
  per le criticità, "Da fare/In corso/Completata/Bloccata" per le
  lavorazioni, e così via per decisioni, allert, milestone, requisiti,
  contratti, stakeholder, maestranze e note di coordinamento.
- Si può cambiare solo il **nome** mostrato, non il funzionamento: i
  colori, i conteggi del cruscotto e le regole di avanzamento restano
  quelli di sempre, così non si rischia di rompere nulla.
- **Maestranze**: nel form di modifica ora si collegano i fornitori
  pescandoli direttamente dal Registro Stakeholder con una selezione
  multipla, invece di scriverli a mano.
- **Timeline Montaggi**: un solo pulsante "Stampa" apre un'unica
  finestra dove si scegliono il periodo da stampare e, con una casella
  da spuntare, se includere anche l'immagine del grafico Gantt.

---

## Capitolato collegato ai contratti, Timeline più leggibile (ottobre 2026)

- Le voci di **Capitolato** si possono raggruppare per contratto e per
  data.
- **Timeline**: la colonna "Attività" si ridimensiona da sola in base al
  testo più lungo, ed è possibile stampare solo il periodo visualizzato.
- Il menu laterale è stato riordinato per seguire meglio il flusso di
  lavoro in cantiere.
- I **Work Package** si possono ora collegare a più commesse.
- Il tipo di documento in **Documenti** è configurabile da Impostazioni.

---

## Avvio automatico sul Mac (ottobre 2026)

- L'app può partire da sola all'accensione del Mac, senza più bisogno di
  aprire il Terminale: vedi `GUIDA_AGGIORNAMENTI.md` per l'installazione
  (una volta sola) e per gli aggiornamenti futuri (un doppio-click).

---

## Righe cliccabili, stampa mirata, Cruscotto a riquadri (ottobre 2026)

- In quasi tutte le tabelle, un click sulla riga apre direttamente la
  scheda di modifica — non serve più cercare il pulsante.
- Si può selezionare una singola riga e stampare solo quella, invece di
  tutto l'elenco.
- **Cruscotto**: ridisegnato con riquadri compatti e cliccabili per
  andare subito alla sezione interessata.
- **Timeline**: aggiunto uno zoom e l'integrazione delle Lavorazioni nel
  grafico, insieme alle milestone.
- **Lavorazioni**, **Maestranze** e **Piano Comunicazioni** arricchiti
  con nuovi campi (piano, zona, date, contratto collegato; work package;
  responsabile).

---

## Impostazioni e Dashboard Finanziaria (ottobre 2026)

- Nuova pagina **Impostazioni**: le liste a tendina usate nelle varie
  schede (categorie, fasi, ecc.) si possono personalizzare da qui, senza
  bisogno di intervento tecnico.
- Nuova **Dashboard Finanziaria**: vista d'insieme sui contratti e sugli
  importi, trasversale a tutte le commesse.

---

## Prima versione — Coordinamento Commesse (ottobre 2026)

- Nasce l'app **Coordinamento Commesse**, separata dal sistema Board:
  Registro Criticità, Registro Decisioni, Registro Allert, Requisiti
  versionati, Contratti con change management, Registro Stakeholder,
  Piano Comunicazioni con matrice RACI, Timeline Montaggi (Gantt), Note
  di Coordinamento, Lezioni Apprese, Documenti con upload, login e
  gestione utenti, storico delle modifiche, export Excel e promemoria
  scadenze.

---

### Come si aggiorna questo file

Ad ogni push di una nuova funzione o correzione, va aggiunta una voce in
cima (sotto "In lavorazione" se presente, altrimenti come nuova sezione
in testa), scritta in linguaggio semplice e orientato a "cosa cambia per
chi usa l'app", non ai dettagli tecnici del codice. Le voci già scritte
non si modificano: ogni aggiornamento ne aggiunge una nuova.
