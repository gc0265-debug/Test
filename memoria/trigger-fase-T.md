# FASE T — Trigger

Perimetro deciso insieme a Giovanni: **un solo trigger**, backup scaricabile a mano,
deploy su Railway, nessun multi-utente per ora.

La scelta di partire da un trigger solo è deliberata. Un sistema che avvisa troppo
viene ignorato: meglio un avviso che conta di quattro che si imparano a scartare.

---

## Il trigger: chiusura non registrata

**Condizione** — esiste un cantiere attivo senza giornale per la data odierna, ed è
passata l'ora di soglia.

**Effetto** — un avviso in cima alla dashboard, con il pulsante che porta al wizard.

**Non è una notifica push.** Il controllo avviene quando si apre l'applicazione.
Costruire notifiche vere richiederebbe un servizio esterno e il permesso del
dispositivo; per un promemoria che serve a chi apre comunque BFP ogni sera,
sarebbe complessità senza guadagno.

### Configurazione (pagina Impostazioni)

| Opzione | Predefinito |
|---|---|
| Promemoria attivo | sì |
| A partire dalle | 17:00 |
| Salta sabato e domenica | sì |

Il salto del weekend è acceso di serie: il promemoria deve proteggere il rituale,
non seguire Giovanni la domenica.

### Estendere il meccanismo
`server/services/avvisiService.js` compone la lista da funzioni indipendenti.
Un trigger nuovo è una funzione che restituisce avvisi, aggiunta all'array in
`calcolaAvvisi()`. Le chiavi di configurazione vanno dichiarate in
`impostazioniService.js`, che rifiuta le chiavi sconosciute.

---

## Fuso orario — il difetto che avrebbe rotto il trigger

Un promemoria a orario ragiona sull'ora locale, ma tutta l'applicazione calcolava
"oggi" con `toISOString()`, che restituisce UTC. Railway gira in UTC.

Conseguenze prima della correzione:
- il promemoria delle 17:00 sarebbe scattato alle 19:00 italiane in estate;
- una giornata chiusa dopo le 22:00 italiane sarebbe finita registrata **sulla data
  del giorno prima** — con il rischio di sovrascrivere la chiusura precedente,
  visto che il salvataggio è per cantiere+data.

Il secondo effetto è il più serio, ed esisteva già prima del trigger.

**Corretto** con `server/services/tempo.js`: `oggi()`, `oraCorrente()`, `isWeekend()`
calcolate su `TZ_APP` (default `Europe/Rome`). Usato da dashboard, giornale, chiusura
e avvisi. Lato client la data predefinita del wizard usa `toLocaleDateString('en-CA')`,
cioè il fuso del dispositivo.

---

## Backup

`GET /api/export/backup.json` restituisce l'intero archivio in un file, con
conteggi e versione dello schema. È il file da caricare su kDrive.

I CSV per singola tabella (separatore `;` e BOM, così Excel italiano li apre senza
chiedere nulla) servono a rileggere i dati, non a ricostruire il database.

L'elenco delle tabelle esportabili è fisso nel codice: il nome finisce dentro una
query, quindi non può arrivare dall'utente. `_schema_version` e `sqlite_master` non
sono esportabili.

**Il caricamento automatico su kDrive non è stato fatto**: richiede le credenziali
Infomaniak e la verifica del metodo di accesso. Scelta di Giovanni: prima il
download manuale, l'automatismo quando le credenziali saranno a portata.

**Il ripristino non è implementato.** Il file protegge i dati e permette di
rileggerli, ma non li rimette in linea da solo.

---

## Deploy

Configurazione in `railway.json` (con healthcheck su `/api/health`) e `nixpacks.toml`.
Procedura completa in `DEPLOY.md`.

Il punto critico: **il volume persistente va creato prima di caricare dati veri.**
Railway ricostruisce il container a ogni pubblicazione; senza volume montato su
`/data` e `DATABASE_PATH=/data/bfp.db`, l'archivio sparisce a ogni deploy.

Verificato che `DATABASE_PATH` crea il database su percorso arbitrario applicando
tutte le migrazioni, e che `TZ_APP` viene rispettata.

---

## Verifiche superate

- Migrazione v4 (tabella `impostazioni`) su database vuoto → schema v4, 15 tabelle
- Avviso assente di domenica con salto weekend attivo; presente disattivandolo
- Avviso assente prima dell'ora di soglia e con promemoria spento
- Ora non valida → 400; chiave di impostazione sconosciuta → 400
- Salvataggio impostazioni dall'interfaccia → persistito
- Pulsante dell'avviso → porta a `/chiusura`
- `backup.json` → 200, intestazioni di download corrette, 14 KB con i dati di prova
- CSV con BOM e separatore `;`
- Tabella non esportabile (`sqlite_master`, `_schema_version`) → 404
- `DATABASE_PATH` e `TZ_APP` rispettate
- Nessun overflow a 390 px, nessun errore in console

---

## Nota di lavorazione

A metà fase il container è stato ricreato e il clone locale è tornato a un commit
precedente, facendo sembrare perduto tutto il lavoro di Fase B e I. I commit erano
su GitHub: è bastato `git fetch` e riallineare. Nessuna perdita.
