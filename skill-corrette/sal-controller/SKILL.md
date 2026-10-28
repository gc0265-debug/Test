---
name: sal-controller
description: >
  Gestisce la contabilità economica (SAL — Stato di Avanzamento Lavori) per
  commesse di arredamento contract su misura, nel flusso esecutore → General
  Contractor / DLL (Direzione Lavori). Struttura la raccolta dati di cantiere in un
  libretto delle misure digitale, valorizza le voci contrattuali (a corpo e a
  misura) e calcola la cascata economica del SAL (lavori progressivi, ritenuta
  di garanzia, recupero anticipo, penali, netto da liquidare ante IVA), con
  registro SAL ed Excel a formule native. Usa questa skill quando l'utente
  menziona: SAL, stato avanzamento lavori economico, contabilità lavori,
  libretto delle misure, quantità contabilizzate, importo da fatturare,
  acconto, certificato di pagamento (CDP), ritenuta di garanzia, recupero
  anticipo, penali, registro SAL, ponte app di cantiere-SAL, foglio raccolta
  dati amministrazione, consegnato vs montato. NON per avanzamento FISICO in
  % → project-controller; NON per stime tempi → estimated-tool; NON per
  snag/punch list.
---

# SAL Controller — Contabilità & Stati di Avanzamento Lavori

## Regole che non si rompono

- Il SAL del periodo è **sempre** progressivo(N) − progressivo(N−1).
- Nessuna quantità entra nell'importo senza riferimento documentale.
- Ritenuta e recupero anticipo si calcolano sul progressivo.
- Parametri contrattuali solo dal subcontratto: se mancano, `TBD`.
- Prima di consegnare un workbook, esegui `scripts/verifica_sal.py` (vedi
  "Controllo finale"): un SAL sbagliato è denaro perso o una contestazione.

## Il bivio

- **Primo SAL della commessa** → Blocco 1 (setup), poi Blocchi 2, 3, output.
- **SAL successivo** → chiedi il workbook o il Registro SAL precedente (servono
  progressivo N−1 e già liquidato), salta il Blocco 1 salvo varianti
  approvate, poi Blocchi 2, 3, output.

## Lista da copiare nella risposta e spuntare

```
- [ ] 1. Parametri contrattuali e voci (o workbook precedente) disponibili
- [ ] 2. Rilievi del periodo nel libretto, ognuno con riferimento e stato
- [ ] 3. Progressivi per voce calcolati, cascata applicata
- [ ] 4. Workbook generato con formule native
- [ ] 5. scripts/verifica_sal.py senza errori
- [ ] 6. Controllo finale superato
- [ ] 7. Documento formale / sintesi, se richiesti
```

## Overview

Questa skill gestisce la **contabilità economica** di una commessa di arredamento
contract su misura: trasforma ciò che è stato eseguito in cantiere in un **importo
da liquidare**, secondo le regole del contratto, e produce lo Stato di Avanzamento
Lavori (SAL) come base per la fatturazione.

Il flusso di riferimento è **esecutore → General Contractor / DLL (Direzione Lavori)**:
l'esecutore (es. GILI) presenta la propria contabilità e una proposta di importo;
la DLL la verifica e certifica; il committente del SAL (il GC) autorizza il
pagamento dell'acconto. La skill produce la documentazione lato esecutore — deve
quindi essere **precisa, riconciliabile e difendibile** in contraddittorio.

### Posizionamento rispetto alle altre skill

Questa skill NON duplica `project-controller`. Si compongono:

| | `project-controller` | `sal-controller` (questa) |
|---|---|---|
| Misura | % fisica (mq/pz installati) | **importo economico** (€) |
| Base | quantità × peso | quantità × **prezzo** |
| Output | avanzamento fisico, varianti | **SAL, contabilità, netto da liquidare** |
| Destinatario | reportistica DLL/GC | **certificato di pagamento / fatturazione** |

Le quantità rilevate in cantiere sono le stesse: `project-controller` le pesa per
calcolare la % fisica, `sal-controller` le moltiplica per i prezzi contrattuali per
ottenere l'importo. Quando l'utente ha già i dati fisici, riusali — non richiedere
due volte le stesse misure.

### Concetti chiave (non confonderli)

- **SAL** = riassume l'**importo dei lavori eseguiti** a tutto il periodo. È un
  documento di *contabilità* (quanto vale ciò che è stato fatto).
- **Certificato di Pagamento (CDP)** = documento che autorizza il pagamento di un
  **acconto**, calcolato a partire dal SAL applicando ritenute, recupero anticipo
  ed eventuali penali. Lo emette la DLL/RUP, non l'esecutore.
- La skill produce: la **contabilità** (lato GILI) + la **proposta di importo**
  che la DLL trasformerà in CDP. Tienili distinti negli output.

---

## Blocco 1 — Setup commessa (una tantum)

Raccogli i parametri contrattuali. Sono dati che derivano **dal subcontratto**:
non inventarli e non suggerire percentuali "standard" come se fossero legge — le
condizioni effettive sono quelle scritte nel contratto GILI↔GC.

**Anagrafica:**
- Codice e denominazione commessa (es. `2514RW` — Hotel Rosewood Roma)
- Esecutore (chi emette la contabilità, es. GILI Creations S.r.l.)
- Committente del SAL (chi riceve/paga, es. SAC S.p.A.)
- DLL — Direzione Lavori (chi verifica/certifica, es. Jacobs)
- Importo contrattuale netto (somma delle voci) ed eventuale ribasso

**Condizioni economiche** (da contratto — vedi `references/meccaniche-economiche.md`):
- **Ritenuta di garanzia**: % e base di calcolo
- **Anticipo**: importo o % corrisposto e modalità di recupero
- **Penali**: criterio (es. ‰/giorno) e tetto massimo
- **Cadenza SAL**: mensile / a soglia di importo / a milestone
- IVA: fuori dal SAL (la contabilità chiude sul netto ante IVA)

**Voci contrattuali** (il computo/capitolato che si contabilizza). Per ogni voce:
- Codice voce (dal computo metrico / capitolato)
- Descrizione
- WP di appartenenza (per 2514RW: **WP1 FOH, WP2 CORRIDOI, WP3 SUITE, WP4 SCALA B, WP5 20 ROOM**)
- **Tipo: a corpo o a misura**
- UM, quantità contrattuale, prezzo unitario → importo contrattuale voce
  (per le voci a corpo: importo forfettario; la quantità è l'avanzamento in %)

Se mancano dati, segna `TBD` e procedi: una contabilità parziale è utile, una
bloccata no. Ma segnala con chiarezza cosa manca e l'impatto sulla quadratura.

---

## Blocco 2 — Raccolta dati: il Libretto delle Misure (il cuore)

Questo è il metodo strutturato richiesto. Il principio: **ogni rilievo è un record
tracciabile**, legato a una voce contrattuale, a un luogo, a una data e a chi ha
misurato. È la versione digitale del libretto delle misure — e la prima linea di
difesa quando il GC o la DLL contestano una quantità.

### Schema del record di rilievo

Ogni riga del libretto contiene:

| Campo | Contenuto | Obbligatorio |
|---|---|---|
| ID rilievo | progressivo (es. R-0042) | sì |
| Data rilievo | DD/MM/YYYY | sì |
| Rilevato da | nome (es. Giovanni Cazzola) | sì |
| SAL di competenza | a quale SAL afferisce (es. SAL 03) | sì |
| WP | WP1 FOH / WP2 CORRIDOI / WP3 SUITE / WP4 SCALA B / WP5 20 ROOM | sì |
| Locale / Area | dove (es. Suite 412, Corridoio P+2) | sì |
| Codice voce | voce contrattuale contabilizzata | sì |
| Descrizione sintetica | cosa è stato montato | sì |
| UM | coerente con la voce | sì |
| Quantità rilevata | qtà del periodo (per voci a misura) | sì* |
| % avanzamento voce | per voci a corpo, invece della quantità | sì* |
| Riferimento documentale | foto ID, disegno+rev, DDT, n. bolla | **sì** |
| Stato | montato / parziale / da verificare / conteso | sì |
| Note | annotazioni, contestazioni in essere | no |

\* Per le voci **a misura** compila *Quantità rilevata*; per le voci **a corpo**
compila *% avanzamento voce*. Mai entrambi sulla stessa riga.

### Regole di raccolta

1. **Una voce a misura può avere più rilievi nel periodo** (montaggi in locali
   diversi, in giorni diversi). Si sommano tutti in fase di elaborazione: è
   normale e voluto — la tracciabilità per locale serve proprio in caso di
   contestazione puntuale.
2. **Il riferimento documentale non è opzionale.** Una quantità senza foto,
   disegno o bolla non è difendibile. Se manca, marca la riga `da verificare` e
   NON includerla nell'importo del SAL finché non è documentata.
3. **Stato `conteso`**: se il GC/DLL contesta una lavorazione, registra comunque il
   rilievo ma tienilo fuori dall'importo certificabile, evidenziandolo a parte.
   Documentare la contestazione protegge la posizione di GILI.
4. **Coerenza UM**: l'UM del rilievo deve coincidere con quella della voce
   contrattuale. Se non torna, fermati e chiedi.

### Come accettare i dati in ingresso

L'utente fornirà i dati in modi diversi — interpreta e struttura:
- testo libero ("montati 24 ml di battiscopa in Suite 412, foto IMG_0231")
- tabella incollata da Excel o foto di un rilievo cartaceo
- aggiornamento per locale ("Corridoio P+2 rivestimenti a parete completati")
- file caricato

Mappa sempre ogni dato sulla voce contrattuale corretta. Se un rilievo non
corrisponde a nessuna voce, è un campanello d'allarme: o è un extra (→ possibile
variante, vedi `project-controller`) o è un errore di codifica. Segnalalo.

---

## Blocco 2-bis — Ponte app di cantiere → Libretto misure

Quando il cantiere traccia già l'avanzamento fisico in un'app dedicata
(liste per WP/zona, foto milestone, stati), il libretto misure NON si
ricompila a mano: si **transcodifica** dai dati dell'app. E soprattutto,
la contabilità NON si costruisce dalle fatture dei materiali consegnati:
**il SAL misura il montato, non il consegnato**.

Leggi `references/ponte-app-cantiere-sal.md` per: mappatura campi app →
libretto, tabella di transcodifica item WBS → voce contrattuale (si
costruisce una volta a setup, chiave primaria il codice WBS), divisione
dei ruoli DdC/amministrazione nel flusso mensile, prospetto di
riconciliazione consegnato vs montato per WP.

Strumento operativo pronto: `assets/Ponte_InSite_SAL_2514RW.xlsx`
(Transcodifica, Import InSite con VLOOKUP e fattore stato, Riepilogo per
voce da travasare nel foglio SAL, Quadratura con riconciliazione
consegnato/montato per WP). Per altre commesse, rigenerarlo adattando WP
e codifica WBS.

Se l'amministrazione sta progettando il proprio foglio di raccolta dati,
questa skill produce la **proposta di formato** da condividere PRIMA che
il formato nasca privo delle colonne chiave (codice WBS, riferimento
documentale ID lista/foto, distinzione montato/consegnato): intervenire
sul formato in fase di progettazione costa un incontro, correggerlo a
regime costa ogni mese.

---

## Blocco 3 — Elaborazione del SAL (la cascata economica)

Per il dettaglio dei calcoli e le formule leggi **`references/meccaniche-economiche.md`**.
In sintesi, la sequenza è:

**1. Importo lavori progressivo a tutto il SAL N**
- voci a misura: `quantità progressiva × prezzo unitario`
- voci a corpo: `% avanzamento voce × importo forfettario voce`
- somma di tutte le voci = importo lavori progressivo

**2. Importo lavori del SAL corrente**
```
Importo SAL N = Importo progressivo (N) − Importo progressivo (N−1)
```
Questo è il vincolo di riconciliazione: il SAL del periodo è SEMPRE la differenza
tra due progressivi. Non sommare i rilievi del periodo "a parte" — devono quadrare
con la differenza dei progressivi.

**3. Cascata sul certificato di pagamento** (sul progressivo):
```
  Importo lavori progressivo
− Ritenuta di garanzia (progressiva)
− Recupero anticipo (progressivo)
− Penali (se applicate)
= Importo progressivo da liquidare
− Già liquidato a SAL precedenti
= ACCONTO del SAL corrente (netto, ante IVA)
```

Ritenuta e recupero anticipo si calcolano **sul progressivo** e poi si ricava la
quota del periodo per differenza: è l'unico modo per non accumulare errori di
arrotondamento SAL dopo SAL.

**Penali**: detraile solo se effettivamente contrattualizzate e quantificate.
Registrale sempre con riferimento (giorni di ritardo, clausola, importo) e con un
flag `contestata` se GILI non le riconosce. Le penali sono terreno di
contenzioso: trasparenza e documentazione prima di tutto.

---

## Output

Produci ciò che serve, nel formato richiesto. I fogli del workbook e la
cascata economica hanno una struttura fissa: usala identica, serve alla
riconciliazione tra un SAL e l'altro. Documento formale e sintesi sono forme
di base da adattare.

### Workbook Excel (deliverable principale)
È il cuore della skill. Genera con `openpyxl`, formule native (non valori
hardcoded) così l'utente aggiorna i dati e i calcoli si rinfrescano. Per la
struttura dei fogli, gli stili e le formule leggi **`references/formato-excel-sal.md`**.
I fogli: `Contabilità SAL`, `Riepilogo economico`, `Libretto misure`,
`Registro SAL`, `Riepilogo per WP`.

### Documento SAL formale (Word/PDF, per trasmissione a DLL/GC)
Da allegare alla PEC/trasmissione formale:
- Intestazione: commessa, n. SAL, data, esecutore, destinatario, DLL
- Riepilogo economico (la cascata: lavori progressivi → acconto netto)
- Tabella contabilità per voce (o per WP, se richiesto sintetico)
- Elenco rilievi a supporto con riferimenti documentali
- Eventuali contestazioni in essere, evidenziate
- Spazio per verifica/firma DLL

### Sintesi (per newsletter / aggiornamento interno)
Blocco di 4-6 righe: n. SAL, importo lavori del periodo, progressivo % su
contratto, acconto netto, criticità (es. quantità contestate, penali in essere).

---

## Regole generali di output

**Precisione numerica:**
- Importi: 2 decimali, separatore migliaia, simbolo € (es. € 142.350,00)
- Percentuali avanzamento: 1 decimale
- Quantità: coerenti con l'UM (ml/mq 1-2 decimali, pezzi interi)
- Date: DD/MM/YYYY

**Quando mancano dati:** non inventare. Segna `TBD`/`n.d.`, segnala l'impatto sulla
quadratura, procedi con il resto.

### Controllo finale (prima di consegnare, ogni volta)

1. Esegui lo script sul workbook:
   `python3 scripts/verifica_sal.py <percorso_workbook.xlsx>`
   Lo script legge i dati di input (Libretto misure, Contabilità SAL, Registro
   SAL) e stampa un messaggio per ogni problema: rilievi montati senza
   riferimento, WP o stati non ammessi, voci inesistenti, UM incoerenti,
   quantità oltre il contratto, numerazione SAL. Se segnala errori, torna al
   Blocco 2 (rilievi) o al Blocco 1 (voci), correggi e rieseguilo.
2. Poi verifica i valori calcolati (aprendo il file o ricalcolando):
   - [ ] Importo SAL del periodo = progressivo(N) − progressivo(N−1)
         → se no, torna al Blocco 2: rilievo nel SAL sbagliato o codifica errata
   - [ ] Somma importi per WP = importo lavori progressivo totale
         → se no, torna al foglio Contabilità: voce senza WP o WP scritto male
   - [ ] Ritenuta e recupero anticipo calcolati sul progressivo
         → se no, torna al Blocco 3
   - [ ] Già liquidato = cascata del SAL N−1 (non stimato)
         → se no, torna al Blocco 3 e ricostruiscilo
   - [ ] Acconto netto = progressivo da liquidare − già liquidato
   - [ ] "DLL" per la Direzione Lavori in tutti i documenti

Finisci solo quando lo script non segnala errori e tutti i controlli passano.
Se un SAL sbaglia per un motivo che questa lista non prevede, proponi
all'utente una regola nuova da aggiungere.

**Disclaimer dovuto:** le percentuali di ritenuta, le condizioni dell'anticipo e i
criteri delle penali derivano dal contratto specifico. La skill applica i numeri
che l'utente fornisce; non fornisce consulenza legale né contrattuale. In caso di
dubbio interpretativo su una clausola, segnalalo e invita a verificarla sul
contratto, non risolverlo d'ufficio.

## Serve

- `pip install openpyxl` (workbook ed esecuzione di `scripts/verifica_sal.py`)
- `pip install python-docx` (documento SAL formale in Word)

---

## Errori da evitare

- **Non confondere SAL e certificato di pagamento.** Il SAL è l'importo dei lavori;
  l'acconto è ciò che resta dopo ritenute, anticipo e penali. Tienili separati.

- **Non saltare la riconciliazione del progressivo.** Il SAL del periodo è la
  differenza tra due progressivi, sempre. Se i rilievi del periodo non quadrano con
  quella differenza, c'è un errore — fermati e trovalo.

- **Non certificare quantità non documentate.** Una riga senza riferimento (foto,
  disegno, bolla) sta nel libretto come `da verificare`, fuori dall'importo del SAL.

- **Non calcolare ritenuta e anticipo sul singolo SAL.** Si calcolano sul
  progressivo; la quota del periodo è per differenza. Altrimenti gli arrotondamenti
  si accumulano e a fine lavori i conti non tornano.

- **Non trattare le penali come acquisite.** Registrale, documentale, ma flagga
  ciò che GILI contesta. La penale detratta senza contraddittorio è denaro perso.

- **Non superare la quantità contrattuale senza variante.** Se contabilizzi più
  della quantità a contratto, o è coperto da una variante approvata (→
  `project-controller`) o non è certificabile. Non gonfiare il SAL.

- **Non emettere output senza n. SAL e data dei dati.** "SAL 03 al 31/05/2026",
  mai "SAL attuale".
