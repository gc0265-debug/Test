# Progressi

## Log cronologico

### Inizializzazione
- [x] Struttura cartelle creata (/memoria, /procedure, /strumenti, /.tmp)
- [x] File di memoria inizializzati
- [x] CLAUDE.md creato (scheletro)
- [x] Contesto azienda acquisito (vedi contesto-azienda.md)
- [x] Fase O completata e approvata

### Ciclo O.R.B.I.T.
- [x] Fase R — reti, dispositivi, backup su kDrive
- [x] Fase B — schema v3, API, wizard di chiusura
- [x] Fase I — dettaglio giornata, report, KPI, gestione NC
- [x] Fase T — promemoria di chiusura, backup, configurazione di deploy

---

## Errori e lezioni

### 1. Flag di conformità dei materiali ignorato — il più grave
`POST /api/chiusura` filtrava con `m.conforme !== false`. Il confronto stretto
intercetta solo il booleano `false`: `0`, `"0"` e `"false"` passavano tutti come
conformi. **Una consegna rifiutata veniva registrata come accettata.**

Dall'interfaccia non si vedeva, perché la checkbox invia un booleano. È emerso
generando il report, dove un materiale marcato non conforme compariva come conforme.

### 2. Calcolo di "oggi" in UTC
Tutta l'applicazione usava `toISOString()` per sapere che giorno fosse, e Railway
gira in UTC. Una giornata chiusa dopo le 22:00 italiane sarebbe finita registrata
**sulla data del giorno prima** — e poiché il salvataggio è per cantiere+data,
avrebbe sovrascritto la chiusura precedente. Corretto con `services/tempo.js`.

### 3. Fallback SPA legato a NODE_ENV
Il server serviva il frontend solo con `NODE_ENV=production`. Senza quella
variabile ogni rotta del client rispondeva `Cannot GET /chiusura`. Corretto
legando la condizione alla presenza della build.

### 4. Clone locale tornato indietro dopo la ricreazione del container
A metà Fase T il container è stato ricreato e il clone locale è tornato a un
commit vecchio, facendo sembrare perduto tutto il lavoro di Fase B e I. I commit
erano su GitHub: è bastato `git fetch` e riallineare. Nessuna perdita.

### Lezione trasversale
**Tre difetti su quattro sono emersi usando l'applicazione con dati veri, non
leggendo il codice.** Il flag di conformità è saltato fuori generando un report;
il fuso orario costruendo un promemoria a orario; il fallback SPA catturando
schermate. Popolare una commessa di prova e percorrere i flussi vale più di
qualunque rilettura.

Corollario operativo: **guardare davvero le schermate catturate.** Per un giro
intero ho inviato immagini che erano pagine di errore `Cannot GET`, descrivendole
come funzionanti perché avevo verificato le API invece delle immagini.

---

## Test e risultati

Nessuna suite automatica: le verifiche sono state condotte percorrendo
l'applicazione con browser headless su una commessa di prova.

### Fase I
- 12 rotte del client raggiungibili, tutte con il titolo corretto
- Giornata inesistente (`/giornale/9999`) → messaggio gestito, nessun crash
- `PUT /api/nc/:id` con stato non valido → 400
- `GET /report` con tipo non valido → 400; giornata inesistente → 404
- Cambio stato NC dall'interfaccia → persistito
- Completamento lavorazione → spostata in archivio, rimossa dagli attivi
- Navigazione client-side senza ricaricare la pagina
- Nessun overflow orizzontale a 390 px; nessun errore in console

### Fase T
- Migrazione v4 su database vuoto → schema v4, 15 tabelle
- Avviso assente di domenica con salto weekend attivo; presente disattivandolo
- Avviso assente prima dell'ora di soglia e con promemoria spento
- Ora non valida → 400; chiave di impostazione sconosciuta → 400
- Salvataggio impostazioni dall'interfaccia → persistito
- Pulsante dell'avviso → porta a `/chiusura`
- `backup.json` → 200, intestazioni di download corrette
- CSV con BOM e separatore `;` (Excel in configurazione italiana)
- Tabelle non esportabili (`sqlite_master`, `_schema_version`) → 404
- `DATABASE_PATH` crea il database su percorso arbitrario con schema completo
- `TZ_APP` rispettata (verificata su Europe/Rome e America/New_York)
