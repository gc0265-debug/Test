# Messa in linea su Railway

Guida per portare BFP su un URL raggiungibile dal cantiere e dal telefono.

---

## Prima di tutto: il volume

**Senza volume persistente il database si azzera a ogni deploy.**

Railway ricostruisce il container a ogni pubblicazione. Il database SQLite vive in un
file: se quel file sta dentro il container, sparisce insieme al container. Un anno di
giornate di cantiere svanirebbe alla prima modifica del codice.

Il volume va creato **prima** di caricare dati veri.

---

## Procedura

### 1. Creare il progetto
Su [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**,
scegliere questo repository e il branch da pubblicare.

### 2. Creare il volume
Nel servizio: **Settings → Volumes → New Volume**

| Campo | Valore |
|---|---|
| Mount path | `/data` |

### 3. Impostare le variabili d'ambiente
**Settings → Variables**

| Variabile | Valore | Perché |
|---|---|---|
| `DATABASE_PATH` | `/data/bfp.db` | Mette il database sul volume. **Senza questa il volume è inutile.** |
| `TZ_APP` | `Europe/Rome` | Fuso del cantiere. Railway gira in UTC: senza questa il promemoria scatterebbe con un'ora o due di sfasamento e le giornate chiuse a tarda sera finirebbero sulla data sbagliata. |
| `NODE_ENV` | `production` | Già impostata dallo script `npm start`; utile esplicitarla. |

`PORT` la assegna Railway da sola: non impostarla.

### 4. Generare il dominio
**Settings → Networking → Generate Domain**. Si ottiene un indirizzo
`*.up.railway.app` da salvare tra i preferiti del telefono.

### 5. Verificare
```
https://<dominio>/api/health      → {"ok":true,...}
https://<dominio>/api/impostazioni → il campo "fuso" deve dire Europe/Rome
```
Se `fuso.ora` non corrisponde all'ora italiana, `TZ_APP` non è stata letta.

---

## Cosa succede a ogni pubblicazione

1. `npm install` — dipendenze dei workspace
2. `npm run build --workspace=client` — build del frontend in `client/dist`
3. `npm start` — avvia il server, che esegue le migrazioni e serve il frontend

Le migrazioni sono incrementali e idempotenti: girano a ogni avvio e applicano solo
i passaggi mancanti. Un database esistente non viene ricreato.

---

## Backup

Il volume protegge dai deploy, non dagli errori né dalla perdita dell'account.
Da **Impostazioni → Backup ed esportazione** si scarica l'intero archivio in un
unico file JSON, da caricare su kDrive.

Una cadenza sensata: a fine settimana, insieme alla chiusura dell'ultima giornata.

---

## Ripristino da backup

Il file JSON contiene tutte le tabelle con i loro dati. Il ripristino automatico
**non è ancora implementato**: oggi il file serve a non perdere i dati e a poterli
rileggere, non a rimetterli in linea con un clic. Se dovesse servire davvero,
la reimportazione va costruita.

---

## Accesso

L'applicazione **non ha autenticazione**: chi conosce l'indirizzo entra.
Finché la usa solo Giovanni su un dominio non pubblicizzato il rischio è contenuto,
ma prima di darla al preposto Gili o di scrivere l'indirizzo in una email va aggiunto
un accesso protetto.
