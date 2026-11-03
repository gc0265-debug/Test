# Guida — Note al Diario di Cantiere via WhatsApp

Guida pratica per Giovanni: come attivare l'invio di note al Diario di
Cantiere scrivendo un messaggio WhatsApp al numero WhatsApp Business
dell'app, invece di aprire il browser. Il codice lato app è già pronto
(v1.63); questa guida copre la parte che serve attivare fuori dall'app,
su Meta e sulla rete di casa/studio — più lunga delle altre guide, perché
tocca sistemi esterni che non controllo direttamente.

**Come funziona, in breve**: scrivi un messaggio di testo al numero
WhatsApp Business configurato (es. "2514RW: oggi completato il montaggio
del corridoio P+4"), l'app lo registra subito come riga del Diario di
Cantiere di oggi per quella commessa, e ti risponde con una conferma. Più
messaggi nello stesso giorno si accodano alla stessa voce, non ne creano
una nuova ogni volta.

---

## 0. Cosa serve prima di iniziare

- Un **account Meta Business** (gratuito) — se non ce l'hai, si crea al
  volo al passo 1.
- Un **numero di telefono dedicato** per il WhatsApp Business dell'app:
  non può essere un numero già attivo su WhatsApp personale o Business
  esistente. Per cominciare puoi usare il numero di prova gratuito che
  Meta assegna in automatico (valido per i test, da sostituire con un
  numero vero quando vorrai usarla stabilmente).
- Un modo per rendere il Mac raggiungibile da internet (non solo dalla
  rete di casa): copro questo al passo 2, con **Cloudflare Tunnel**
  (gratuito). Nella versione stabile serve anche un **dominio** a tuo
  nome (anche già esistente, se ne hai uno per email/sito; altrimenti
  un dominio economico, in genere 10-15€/anno) — ma si può verificare
  che tutto funzioni anche senza, con un "tunnel veloce" temporaneo.

Se qualcosa in questi prerequisiti manca o non è chiaro, fermati pure
qui e chiedimi: il resto della guida presume che siano a posto.

---

## 1. Creare l'app Meta e il numero WhatsApp Business

1. Vai su **developers.facebook.com** e accedi con un account Facebook
   (anche personale: serve solo per amministrare l'app, non viene
   collegato ai tuoi contatti).
2. **Crea un'app** → tipo "Azienda" → segui la procedura guidata.
3. Nel pannello dell'app, aggiungi il prodotto **WhatsApp**.
4. Nella pagina "Configurazione API" di WhatsApp trovi subito:
   - un **numero di telefono di test** già pronto all'uso (gratuito, con
     un limite di destinatari — perfetto per iniziare);
   - un **Token di accesso temporaneo** (valido 24 ore: utile solo per
     il primo collaudo, da sostituire con uno permanente più avanti);
   - l'**ID numero di telefono** (una stringa numerica, non il numero
     stesso).
5. Annota questi tre valori: **Token di accesso**, **ID numero di
   telefono**, e separatamente, in **Impostazioni dell'app → Di base**,
   l'**App Secret** (clicca "Mostra", potrebbe chiedere la password
   Facebook).

Per ora va bene il numero di test: puoi collegare un numero WhatsApp
Business vero in un secondo momento, senza rifare questi passi da capo
(si cambia solo il numero nel pannello Meta).

---

## 2. Rendere il Mac raggiungibile da internet (Cloudflare Tunnel)

Meta deve poter chiamare il tuo Mac da internet per consegnare i
messaggi: oggi il server risponde solo sulla rete locale
(`localhost:3002` o l'indirizzo `.local` visto nella guida precedente).
**Cloudflare Tunnel** risolve questo senza aprire porte sul router (cosa
che spesso non è nemmeno possibile, a seconda del contratto internet):
il Mac stesso apre una connessione verso Cloudflare, che poi la espone
con un indirizzo `https://` pubblico.

### 2a. Prova veloce (facoltativa, consigliata per il primo collaudo)

Senza installare nulla stabilmente, puoi verificare che tutto il
percorso funzioni con un tunnel temporaneo:

1. Installa Homebrew se non ce l'hai già (istruzioni su brew.sh).
2. Apri il Terminale e lancia:
   ```
   brew install cloudflared
   cloudflared tunnel --url http://localhost:3002
   ```
3. Il Terminale stampa un indirizzo tipo
   `https://qualcosa-a-caso.trycloudflare.com`: è il tuo Mac, raggiungibile
   da internet finché questa finestra di Terminale resta aperta.
4. Usa quell'indirizzo per il passo 3 (configurazione del webhook su
   Meta) e fai un primo test. **Attenzione**: questo indirizzo cambia
   ogni volta che fermi e rilanci il comando — va bene per provare,
   non per l'uso quotidiano.

### 2b. Versione stabile (per l'uso di tutti i giorni)

Richiede un dominio a tuo nome, gestito tramite Cloudflare (gratuito
aggiungerlo, anche se il dominio lo hai comprato altrove).

1. Se il dominio non è già su Cloudflare: crea un account gratuito su
   **cloudflare.com** → "Aggiungi un sito" → segui la procedura (in
   breve: cambi i server DNS del dominio con quelli che ti indica
   Cloudflare, dal pannello di chi te l'ha venduto).
2. Nel Terminale:
   ```
   cloudflared tunnel login
   ```
   Si apre il browser: autorizza e scegli il dominio.
3. Crea il tunnel e collegalo a un indirizzo a scelta sotto il tuo
   dominio (qui uso `whatsapp.tuodominio.it` come esempio):
   ```
   cloudflared tunnel create coordinamento-commesse
   cloudflared tunnel route dns coordinamento-commesse whatsapp.tuodominio.it
   ```
4. Crea il file `~/.cloudflared/config.yml` con questo contenuto
   (sostituendo "whatsapp.tuodominio.it" con quello scelto sopra — il
   percorso del file delle credenziali te lo stampa il comando
   precedente):
   ```yaml
   tunnel: coordinamento-commesse
   credentials-file: /Users/TUO-UTENTE/.cloudflared/XXXXXXXX.json
   ingress:
     - hostname: whatsapp.tuodominio.it
       service: http://localhost:3002
     - service: http_status:404
   ```
5. Installa il tunnel come servizio che parte da solo, come già fatto
   per l'app stessa:
   ```
   sudo cloudflared service install
   ```

Da questo momento `https://whatsapp.tuodominio.it` punta sempre al tuo
Mac, con HTTPS già incluso, senza bisogno di certificati a parte.

---

## 3. Collegare tutto: variabili d'ambiente + webhook su Meta

1. Nella cartella principale `coordinamento-commesse`, se non l'hai già
   fatto, copia `.env.example` in un file chiamato `.env` (stessa
   cartella). Apri `.env` e compila questi valori (vedi i commenti nel
   file per il dettaglio di ciascuno):
   ```
   WHATSAPP_VERIFY_TOKEN=scegli-tu-una-stringa-a-caso
   WHATSAPP_APP_SECRET=<App Secret annotato al passo 1>
   WHATSAPP_ACCESS_TOKEN=<Token di accesso annotato al passo 1>
   WHATSAPP_PHONE_NUMBER_ID=<ID numero di telefono annotato al passo 1>
   WHATSAPP_NUMERI_AUTORIZZATI=<il tuo numero, es. 393401234567>
   ```
   Il tuo numero va scritto in formato internazionale, senza "+" e
   senza spazi (per l'Italia: 39 seguito dal numero).
2. Riavvia il server perché legga il nuovo `.env`: apri
   `deploy/macos` e doppio click su **`aggiorna-e-riavvia.command`**
   (fa anche un `git pull`, innocuo se non ci sono aggiornamenti da
   scaricare), oppure, se preferisci non toccare il codice, riavvia
   solo il servizio da Terminale:
   ```
   launchctl kickstart -k gui/$(id -u)/com.fieldproject.coordinamento-commesse
   ```
3. Torna sul pannello Meta for Developers → WhatsApp → Configurazione →
   sezione **Webhook** → **Modifica**:
   - **URL di callback**: `https://IL-TUO-INDIRIZZO/api/whatsapp/webhook`
     (quello del passo 2a o 2b, con `/api/whatsapp/webhook` alla fine).
   - **Token di verifica**: lo stesso valore scritto in
     `WHATSAPP_VERIFY_TOKEN` al punto 1.
   - Clicca **Verifica e salva**: se tutto è collegato bene, Meta
     conferma subito senza errori (è la stessa app che risponde alla
     verifica, lato codice già pronto).
   - Nell'elenco dei campi webhook, assicurati che **messages** sia
     **sottoscritto** (il pulsante accanto diventa "Sottoscritto").

---

## 4. Primo test

1. Dal tuo cellulare, apri WhatsApp e scrivi al numero mostrato nel
   pannello Meta (quello di test, o quello vero se già collegato) il
   messaggio:
   ```
   2514RW: prova di collegamento col Diario di Cantiere
   ```
2. Dovresti ricevere in risposta "✓ Aggiunto al Diario di Cantiere
   2514RW del gg/mm/aaaa" entro pochi secondi.
3. Apri l'app, **Diario di Cantiere**, verifica che la voce di oggi
   contenga la riga appena scritta.

Se qualcosa non torna, vedi "Risoluzione problemi" più sotto, oppure
copiami l'errore esatto (anche uno screenshot del pannello Meta) e ti
aiuto a capire cosa correggere.

---

## 5. Come usarla tutti i giorni

- **Con codice commessa**: `2514RW: testo della nota` — registra sulla
  commessa con quel codice, a prescindere da quale sia "quella di
  oggi".
- **Senza codice commessa**: solo `testo della nota` — registra sulla
  commessa indicata in `WHATSAPP_COMMESSA_DEFAULT_ID` nel `.env` (se
  impostata), altrimenti sulla prima commessa attiva registrata
  nell'app. Comodo se segui per lo più una sola commessa alla volta, ma
  meno sicuro se ne segui più di una in parallelo: in quel caso
  conviene sempre scrivere il codice.
- Ogni messaggio diventa una riga con l'orario, accodata alla voce di
  diario del giorno — più messaggi durante la giornata si sommano,
  nessuno sovrascrive il precedente.

---

## 6. Limiti di questa prima versione

- **Solo testo**: foto, audio e altri allegati non vengono ancora letti
  (l'app risponde spiegandolo, se li invii). Si può aggiungere in un
  passo successivo, se utile.
- **Un solo numero** o un elenco di numeri fissi, configurati a mano nel
  `.env` — non una gestione utenti dal pannello Impostazioni. Per le
  squadre di montaggio (gruppi WhatsApp esistenti), vale quanto
  discusso prima: questa integrazione copre solo messaggi diretti a un
  numero WhatsApp Business dedicato, non la lettura dei gruppi.
- Il numero di telefono di **test** di Meta ha un limite di messaggi e
  di destinatari autorizzati: va bene per collaudare, non per un uso
  stabile — per quello serve un numero WhatsApp Business vero,
  verificato (si fa dallo stesso pannello, quando sarai pronto).
- **Costi**: le prime conversazioni di ogni mese sono gratuite
  (la soglia dipende dal piano Meta); oltre quella soglia si paga a
  conversazione, con tariffe che variano per paese — per l'uso previsto
  qui (poche note al giorno, un solo numero) il volume resta
  tipicamente nella fascia gratuita o vicino ad essa.

---

## 7. Risoluzione problemi

- **Meta non riesce a verificare il webhook** ("La richiesta di verifica
  dell'URL di callback non è riuscita"): controlla che l'indirizzo
  `https://...` sia davvero raggiungibile da fuori casa (prova ad
  aprirlo dal cellulare con il Wi-Fi spento) e che `WHATSAPP_VERIFY_TOKEN`
  nel `.env` sia identico, carattere per carattere, a quello scritto nel
  pannello Meta — e che il server sia stato riavviato dopo averlo
  scritto.
- **Il messaggio non arriva mai nel Diario**: verifica che il tuo numero
  sia scritto esattamente in `WHATSAPP_NUMERI_AUTORIZZATI` (senza "+",
  senza spazi), e nei log del server
  (`coordinamento-commesse/server/logs/err.log` e `out.log`) cerca righe
  che iniziano con "whatsapp:" — spiegano se il messaggio è stato
  scartato e perché (firma non valida, numero non autorizzato, nessuna
  commessa trovata).
- **Non arriva la risposta di conferma ma la nota c'è nel Diario**:
  controlla `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` nel
  `.env` — senza questi due la nota viene comunque registrata, solo
  senza messaggio di ritorno (non è un errore bloccante).
- **Il tunnel (Cloudflare) sembra fermo**: se hai usato la "prova
  veloce" (2a), ricorda che si ferma appena chiudi quella finestra di
  Terminale o il Mac va in stand-by — per un uso continuativo serve la
  versione stabile (2b) installata come servizio.
