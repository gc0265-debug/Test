# FASE I — Ispeziona

Ispezione del sistema costruito in Fase B, condotta popolando una commessa di prova
e percorrendo ogni flusso dall'interfaccia reale, non dai soli test.

---

## Metodo

1. Popolata una commessa di prova (1 cantiere, 4 WP, 5 lavorazioni, 4 maestranze,
   5 documenti, 2 chiusure giornata complete)
2. Percorse tutte le rotte del client con browser headless, verificando titolo di
   pagina, errori in console e overflow orizzontale
3. Provati i casi d'errore delle API, non solo quelli felici
4. Catturate 24 schermate a 1440 px e 390 px

---

## Difetti trovati e corretti

### 1. Flag di conformità materiali ignorato — *il più grave*
`POST /api/chiusura` usava `m.conforme !== false ? 1 : 0`. Il confronto stretto
intercetta solo il booleano `false`: `0`, `"0"` e `"false"` passavano tutti come
conformi. Una consegna rifiutata veniva registrata come accettata.

Il wizard invia un booleano, quindi dall'interfaccia il difetto non si vedeva —
è emerso generando il report, dove un materiale marcato non conforme compariva
come conforme.

**Corretto** con `flagConforme()`, che interpreta esplicitamente booleani, numeri e stringhe.

### 2. Fallback SPA condizionato a NODE_ENV
Il server serviva il frontend solo con `NODE_ENV=production`. Senza quella variabile
ogni rotta del client rispondeva `Cannot GET /chiusura`.
**Corretto**: la condizione è la presenza di `client/dist/index.html`.

### 3. Campi legacy nel giornale
`server/routes/giornale.js` leggeva e scriveva `workers_count` e `issues`, rimossi
nello schema v3. **Corretto** e sostituiti con i conteggi reali derivati dalle tabelle figlie.

### 4. `wp_id` non persistito
`POST` e `PUT /api/lavorazioni` non salvavano il legame con il Work Package.
**Corretto**, e aggiunto il campo al form.

### 5. Middleware di errore fuori posto
`errorHandler` era registrato prima delle rotte statiche. **Spostato** in fondo alla catena.

### 6. Navigazione con ricaricamento
Il link "Vedi tutte" della dashboard era un `<a href>`, che ricaricava l'applicazione.
**Corretto** in `<Link>`.

---

## Funzionalità aggiunte

| Cosa | Perché |
|------|--------|
| **Dettaglio giornata** (`/giornale/:id`) | Il rituale registrava tutto ma non c'era modo di rileggerlo. È il punto centrale dell'obiettivo: ritrovare gli eventi a mesi di distanza. |
| **Report presenze e giornale** | Testo pronto per WhatsApp, email o copia negli appunti. Modificabile prima dell'invio. Copre gli output previsti in Fase O. |
| **Pagina KPI tempi** (`/kpi`) | I tempi di montaggio venivano raccolti ma non erano visibili da nessuna parte. Ora mostra media, spread min–max e numero di campioni per tipologia. |
| **Gestione stato NC** | Aperta / in lavorazione / chiusa aggiornabile da BFP, senza toccare l'app esterna. |

### Nota sulla lettura dei KPI
La colonna **Campioni** è deliberatamente in evidenza. Sotto le tre rilevazioni la
media è indicativa e lo spread fra minimo e massimo dice più della media stessa:
il numero di campioni va letto prima del numero di minuti.

---

## Verifiche superate

- 12 rotte del client raggiungibili, tutte con titolo corretto
- Giornata inesistente: messaggio gestito, nessun crash
- `PUT /api/nc/:id` con stato non valido → 400
- `GET /report` con tipo non valido → 400; giornata inesistente → 404
- Cambio stato NC dall'interfaccia → persistito
- Completamento lavorazione → spostata in archivio, rimossa dagli attivi
- Nessun overflow orizzontale a 390 px
- Nessun errore in console
