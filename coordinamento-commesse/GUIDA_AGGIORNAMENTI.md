# Guida — Avvio automatico e aggiornamenti

Guida pratica per Giovanni: come installare l'avvio automatico di
Coordinamento Commesse sul Mac e come caricare gli aggiornamenti futuri.
Non serve sapere programmare: sono tutti doppio-click.

Questa guida viene aggiornata ogni volta che il processo cambia — è il
riferimento unico, non serve tenere a mente altro.

---

## 1. Installazione iniziale (una tantum)

Da fare una sola volta, la prima volta che si attiva l'avvio automatico.

1. Apri la cartella `coordinamento-commesse` nel Finder.
2. Apri la cartella `deploy/macos`.
3. Fai doppio click su **`installa-avvio-automatico.command`**.
   - Se il Mac mostra un avviso di sicurezza ("non è possibile aprire
     perché proviene da uno sviluppatore non identificato"), fai click
     destro (o Ctrl+click) sul file → **Apri** → **Apri** di nuovo nella
     finestra di conferma. Va fatto solo la prima volta.
4. Si apre una finestra di Terminale che configura tutto da sola e alla
   fine scrive "Fatto". Premi un tasto per chiuderla.

Da questo momento il server di Coordinamento Commesse parte da solo ogni
volta che accendi o accedi al Mac, e resta sempre acceso in background.
Non serve più aprire il Terminale né lanciare `npm start`.

**Per usare l'app**: apri il browser su **http://localhost:3002** (vale la
pena salvarlo nei preferiti).

---

## 2. Caricare un aggiornamento (ogni volta che c'è una novità)

Quando ti avviso che ho pushato delle modifiche nuove (o quando vuoi
controllare se ce ne sono), il processo è sempre lo stesso, un solo
doppio-click:

1. Apri `coordinamento-commesse/deploy/macos`.
2. Fai doppio click su **`aggiorna-e-riavvia.command`**.
3. Lo script da solo:
   - scarica le ultime modifiche (`git pull`),
   - aggiorna eventuali librerie nuove del server,
   - riavvia il servizio in background.
4. Quando scrive "Fatto", l'app su `http://localhost:3002` è già
   aggiornata — basta ricaricare la pagina del browser (⌘R).

Non c'è bisogno di fermare nulla a mano prima: lo script se ne occupa.

---

## 3. Come controllare che tutto funzioni

- **L'app non si apre?** Verifica che il servizio sia attivo aprendo il
  Terminale e scrivendo:
  ```
  launchctl print gui/$(id -u)/com.fieldproject.coordinamento-commesse
  ```
  Se risponde con dei dettagli (non un errore "could not find"), il
  servizio è installato e attivo.
- **Qualcosa non torna dopo un aggiornamento?** I log del server sono in
  `coordinamento-commesse/server/logs/` (file `out.log` ed `err.log`):
  dimmi cosa contengono le ultime righe e ti aiuto a capire cosa è
  successo.
- **I tuoi dati sono al sicuro**: il database (`server/coordinamento.db`)
  non viene mai toccato da uno script di aggiornamento — solo il codice
  dell'app cambia, i tuoi dati restano dove sono.

---

## 4. Tornare indietro o disinstallare

- **Disinstallare l'avvio automatico**: doppio click su
  `deploy/macos/ferma-avvio-automatico.command`. Il server si ferma e non
  riparte più da solo; per riusare l'app torni al comando manuale
  `npm start` di prima.
- **Un aggiornamento ha causato un problema serio**: dimmelo, e si può
  riportare il codice alla versione precedente (`git`) senza perdere i
  dati salvati nel database.

---

## 5. Cosa fa esattamente l'avvio automatico (per chi è curioso)

Il Mac usa un meccanismo di sistema chiamato *launchd*: uno script di
installazione scrive una piccola configurazione che dice "tieni sempre
acceso il programma Node in questa cartella" e la registra presso macOS.
Non è un'installazione dell'app in senso tradizionale: il codice resta
sempre nella cartella `coordinamento-commesse` che già conosci, lo stesso
che viene aggiornato con `git pull`. Il meccanismo serve solo a non dover
più avviare manualmente `npm start` ogni volta.
