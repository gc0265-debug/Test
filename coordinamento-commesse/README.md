# Coordinamento Commesse — Field Project SAS

App di coordinamento commesse, nuova e separata da **Board Field Project**
(`client/` e `server/` alla radice del repository): nessun dato in comune,
nessuna dipendenza fra le due.

## Cos'è

Non è un'estensione generica: i due registri di coordinamento ricalcano
nel formato gli strumenti realmente in uso sulla commessa 2514RW,
emersi analizzando `00_Corrispondenza/Presidio RSW`:

- **Registro Criticità** — una criticità per Work Package, con urgenza
  *viola* (risposta a scadenza, tipicamente 3 giorni, come in
  `Registro_Criticita_PM`) o *verde* (risposta dovuta dalla controparte,
  senza termine fisso). Il cruscotto segnala separatamente le urgenze
  aperte e quelle già scadute.
- **Registro Decisioni** — domande chiuse (SÌ/NO) verso DL/SAC/GC, con
  anzianità in giorni, soglia dei 21 giorni, tasso di resa e percentuale
  di conferme per iscritto — lo stesso cruscotto di
  `Registro_Decisioni_DL_2514RW.xlsx`.
- **Note di Coordinamento** — agenda numerata per Work Package,
  generabile in automatico dalle criticità ancora aperte (come la Nota
  di Coordinamento ATI del 29.09.2026) e poi modificabile prima
  dell'invio; si stampa o si esporta in PDF dal browser.
- **Registro Allert** — classificazione di perimetro (interno, GC, DL,
  committente, fornitore, esterno) e tracciamento delle azioni di
  tutela, collegabile a una criticità o decisione che lo ha originato.
  Struttura generica ispirata alla funzione di presidio GC, non una
  sincronizzazione automatica con il relativo fascicolo.
- **Timeline Montaggi** — Gantt per settimane o mesi sulle milestone
  (date di inizio/fine montaggio per commessa, work package, piano e
  zona), con evidenza visiva di ciò che è in ritardo.
- **Lezioni Apprese** — raccolte dalle altre sezioni (criticità,
  decisioni, allert) tramite collegamento opzionale, per non ripetere
  gli stessi errori sulla prossima commessa.
- **Diario di Cantiere, Lavorazioni, Maestranze, Documenti** — la
  gestione commessa di base, sullo stesso modello di Board. I
  Documenti accettano sia un link esterno sia un file caricato dal
  browser (anche entrambi sulla stessa riga).
- **Requisiti** — estratti dal capitolato, con codice WBS per commessa
  e fase di esecuzione (progettazione, approvvigionamento, montaggio,
  collaudo). Ogni modifica a titolo o descrizione crea una nuova
  versione (pulsante "Versioni"), per tracciare le molte revisioni
  tipiche della fase di progettazione. "Richiedi approvazione" crea
  una decisione collegata nel Registro Decisioni: le approvazioni
  confluiscono lì, non in un registro separato.
- **Contratto** — il contratto stipulato, con la data di baseline del
  capitolato e la procedura di change management concordata. Ogni
  versione di un requisito successiva alla baseline è segnalata come
  variazione da gestire, con un'azione rapida per registrarla nel
  Registro Allert secondo la procedura concordata.
- **Registro Stakeholder** — con matrice interesse/influenza (prassi
  di project management) e **Piano Comunicazioni**: un processo di
  gestione per riga (riunione, aggiornamento registro, approvazione…)
  con frequenza/canale/output atteso e una matrice RACI
  (Responsible/Accountable/Consulted/Informed) verso gli stakeholder
  registrati.

Inoltre:

- **Accesso con utente/password**. Al primo avvio viene creato un
  utente amministratore (`admin@giovannicazzola.org`) con una password
  temporanea stampata **solo in console** — da cambiare dalla pagina
  Utenti (visibile solo agli amministratori) dopo il primo accesso.
  Nota: le sessioni sono tenute in memoria, quindi si perdono ad ogni
  riavvio del server (si rifà il login, non serve altro).
- **Storico modifiche** su Registro Criticità, Registro Decisioni e
  Registro Allert: chi ha creato/modificato/chiuso/eliminato cosa e
  quando, visibile dal pulsante "Storico" su ogni riga. Il Cruscotto
  mostra anche le ultime attività su tutta la commessa.
- **Promemoria scadenze** sul Cruscotto: le criticità urgenti (viola)
  in scadenza entro 3 giorni o già scadute, elencate ed evidenziate
  anche nella tabella del registro. Un riquadro separato, "Scadenze
  della settimana", aggrega criticità urgenti e milestone in scadenza
  nei prossimi 7 giorni, stampabile come report formattato dal
  pulsante "Stampa report" (così come l'elenco milestone dalla
  Timeline, pulsante "Stampa elenco").
- **Esportazione in Excel** del Registro Criticità, del Registro
  Decisioni e del Registro Allert, dal pulsante "Esporta Excel" di
  ciascuna pagina — stesso formato con cui oggi si condividono questi
  dati con SAC/GILI/Jacob's.

L'app è multi-commessa: ogni commessa ha i propri Work Package (di
default WP1 FOH / WP2 CORRIDOI / WP3 SUITE / WP4 SCALA B, la convenzione
Field Project, ma modificabili) e tutti i registri sono agganciati alla
commessa selezionata nella barra laterale.

## Stack

- **Client**: HTML + CSS + JavaScript puro (moduli ES nativi), **nessun
  build step**. Si apre e si modifica un file e basta.
- **Server**: Node + Express + SQLite (`better-sqlite3`, la stessa
  libreria già usata da Board), per avere dati condivisi fra più
  persone invece che bloccati nel browser di ciascuno.

## Avvio

```bash
cd coordinamento-commesse
npm run install:server   # una tantum
npm start                 # avvia il server su http://localhost:3002
```

Al primo avvio il database viene creato vuoto e popolato con una
commessa di esempio (2514RW, con i quattro Work Package e qualche riga
dimostrativa nei registri) — solo se il database è vuoto: non sovrascrive
mai dati esistenti. Per sviluppo con riavvio automatico: `npm run dev`.

Il client è servito direttamente dal server Express su `/`; le API
REST sono sotto `/api`. Non serve altro.

## Struttura

```
coordinamento-commesse/
  server/
    index.js             bootstrap Express
    db/
      schema.sql          schema SQLite (stesse convenzioni di Board: snake_case, CHECK, unixepoch)
      database.js          apertura connessione + applicazione schema
      seed.js               popolamento iniziale, idempotente
    routes/                 un file per gruppo di risorse (REST)
    utils/dates.js           calcolo giorni fra date, usato per anzianità e scadenze
  client/
    index.html
    css/styles.css          identità Field Project SAS (nero, rosso brand, Montserrat)
    js/
      app.js                 bootstrap: sidebar, selettore commessa, router
      router.js               router hash-based, senza libreria
      state.js                 commessa corrente e suoi work package, condivisi fra le pagine
      api.js                    wrapper fetch
      components/ui.js          helper DOM, tabella, modale, toast, pill
      pages/                    una pagina per sezione; genericCrud.js fattorizza
                                 la meccanica comune a Lavorazioni/Maestranze/Documenti/Diario
```

## Cosa manca di proposito

Deploy: nessuna configurazione Railway/Render ancora inclusa, a
differenza di Board — va aggiunta quando si decide dove ospitarlo. Le
sessioni di accesso sono in memoria (si perdono ad ogni riavvio del
server) e non c'è invio di promemoria via email: le scadenze sono
visibili solo aprendo l'app. I file caricati nei Documenti restano
sul disco del server che fa girare l'app (`server/uploads/`, escluso
da git): se l'app gira solo sul tuo Mac, i file restano lì.
