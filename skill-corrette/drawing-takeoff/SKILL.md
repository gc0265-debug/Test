---
name: drawing-takeoff
description: >
  Estrae le quantità (Quantity Take-Off) da tavole esecutive in PDF vettoriale
  che hanno già superato drawing-pack-qa, e produce il computo (BOQ) in Excel,
  la tavola marcata a colori per l'audit visivo e il registro incertezze per la
  firma del Quantity Surveyor. Conta i tag di testo vettoriali stanza per stanza,
  ricava le quantità secondarie solo da formule e parametri dichiarati, assegna a
  ogni riga un livello di confidenza (High/Medium/Low). Usala quando l'utente
  dice: computo metrico, take-off, estrazione quantità, conta i tag sulle tavole,
  BOQ, quantità da disegno, quanti pezzi ci sono in pianta, marcatura tavole per
  il QS. NON per controllare il plico tavole (→ drawing-pack-qa); NON per
  importi o SAL (→ sal-controller); NON per avanzamento fisico (→ project-controller).
---

# Drawing Take-Off | Quantità da tavole esecutive

## Regole che non si rompono

- **Nessuna quantità senza prova.** Ogni riga del BOQ ha tavola, pagina e un
  segno sulla tavola marcata. Una quantità che non si può indicare sulla tavola
  non entra nel BOQ: va nel registro incertezze.
- **Nessuna quota inventata.** Se manca una dimensione, uno spessore o un
  rapporto (es. "m di cavo per presa"), non lo stimi: la riga resta `TBD` e va
  nel registro incertezze. I rapporti degli assemblies li dà l'utente, mai la skill.
- **Mai un'intera tavola densa in un colpo solo.** Si conta zona per zona (stanza,
  WP, blocco omogeneo) e si sommano i parziali. Il conteggio "a colpo d'occhio"
  di una tavola intera è la prima causa di falsa completezza.
- **Primarie e secondarie restano separate.** Primaria = contata da testo
  vettoriale o letta da quota esplicita. Secondaria = calcolata da una primaria
  con una formula scritta nel piano. Non si misura a scala ciò che si può contare
  o calcolare.
- **Il BOQ è una bozza per il QS.** Non si dichiara "definitivo", "validato" o
  "conforme": la firma è del Quantity Surveyor, sul registro incertezze.
- Per le commesse Field Project le zone si chiamano con i Work Package di
  commessa (per 2514RW: WP1 FOH, WP2 CORRIDOI, WP3 SUITE, WP4 SCALA B,
  WP5 20 ROOM). Le vecchie denominazioni FF&E / millwork / boiserie non si usano.
  La Direzione Lavori è sempre "DLL".

## Il bivio

- **Il plico non ha superato drawing-pack-qa** (o non c'è l'esito) → fermati e
  chiedi di eseguirla prima. Senza scala validata e conferma che i PDF sono
  vettoriali, i conteggi da testo e le misure non sono affidabili.
- **Primo computo del plico** → passi 1-4.
- **Aggiornamento per nuova revisione delle tavole** → chiedi il BOQ precedente,
  rifai i passi 2-4 sulle sole tavole cambiate e aggiungi al BOQ la colonna
  "Δ rispetto a Rev. [x]". Le righe non toccate restano con la loro prova.

## Lista da copiare nella risposta e spuntare

```
- [ ] 0. Esito drawing-pack-qa disponibile (vettoriale, orientamento, scala per tavola)
- [ ] 1. Disciplina, tavole pertinenti, zone e assemblies approvati dall'utente
- [ ] 2. Primarie estratte zona per zona con scripts/estrai_tag.py
- [ ] 3. Secondarie calcolate, sanity check, confidenza su ogni riga
- [ ] 4. Verifica indipendente (omissioni / doppi conteggi) fatta
- [ ] 5. BOQ Excel, tavola marcata, registro incertezze generati
- [ ] 6. Controllo finale superato
```

## Passo 1 — Ambito, tavole e assemblies (si ferma per l'approvazione)

1. Chiedi la **disciplina o categoria** da computare (es. arredi fissi di un WP,
   opere in c.a., tramezzature, elettrico, HVAC). Non estrarre nient'altro.
2. Dal `qa_registro.csv` di drawing-pack-qa (quello della cartella bonificata)
   seleziona le **sole tavole pertinenti** e, per ciascuna, riporta revisione,
   esito QA e scala validata. Pagine `Fail`: niente conteggi automatici; pagine
   con ALLERTA SCALA: conteggi da testo sì, misure a scala no.
3. Raccogli la **legenda dei codici** (es. `F6`, `C1`, `P1`): la dà l'utente o
   la si legge dalla legenda/abaco in tavola, citando pagina. Un codice senza
   significato noto si conta lo stesso ma va nel registro incertezze.
4. Definisci le **zone** (stanze, WP o blocchi) e, se la tavola le ha, le loro
   coordinate o i nomi locali in pianta.
5. Scrivi la **libreria assemblies**: per ogni primaria, le secondarie derivate,
   la formula e l'origine di ogni parametro (tavola/pagina o "dato dall'utente").
   Formato in `references/assemblies.md`.
6. Presenta il piano (tavole, zone, codici, assemblies) e **attendi l'ok**.
   Un parametro senza origine si segna `TBD` già qui.

## Passo 2 — Quantità primarie

Gli script richiedono `pip install pymupdf openpyxl`.

- **Tag di testo vettoriali** → `python3 scripts/estrai_tag.py <tavola.pdf>
  --tag "F6,C1,P1" [--zone zone.json] --out tag.csv`. Lo script conta solo testo
  vero del PDF, pagina per pagina e zona per zona, e scrive le coordinate di ogni
  occorrenza (servono alla marcatura). Confidenza `High`.
- **Pagine senza testo estraibile** (lo script le segnala) → non si conta a vista
  per riempire il buco: tornano a drawing-pack-qa o vanno nel registro.
- **Simboli senza etichetta** → conteggio visivo **zona per zona**, elencando
  ogni simbolo con la posizione. Confidenza `Low`, verifica prioritaria del QS.
- **Superfici e lunghezze** → prima le quote numeriche scritte in tavola
  (`High`); solo se mancano, misura del poligono con la scala validata in QA
  (`Low`), dichiarando la scala usata.
- Controlla le occorrenze che lo script attribuisce a "fuori zona": sono
  cartiglio, legenda, note o elementi davvero fuori dalle zone? Le prime non si
  contano, le ultime sì.

## Passo 3 — Secondarie, sanity check, confidenza

1. **Secondarie** = primaria × formula dell'assembly. Confidenza `Medium` se la
   primaria è `High` e ogni parametro ha origine in tavola o dall'utente;
   altrimenti eredita il livello più basso tra primaria e parametri.
2. **Sanity check** contro grandezze note da altre tavole: per esempio sviluppo
   lineare totale ≤ larghezza edificio × numero di passaggi, numero arredi per
   camera tipo × numero camere, superficie computata ≤ superficie lorda di piano.
   Ogni check si scrive con i due numeri confrontati; uno scarto oltre il 10%
   va nel registro incertezze, non si "aggiusta".
3. **Confidenza** su ogni riga:

| Livello | Quando |
|---|---|
| `High` | testo vettoriale contato dallo script o quota esplicita in tavola |
| `Medium` | secondaria da formula con parametri documentati |
| `Low` | misura a scala, conteggio visivo di simboli, parametro dubbio |

## Passo 4 — Verifica indipendente

Prima di consegnare, una verifica **con contesto pulito** che non abbia visto il
tuo ragionamento:

- **In Claude Code**: avvia un sub-agente passandogli solo le tavole, la legenda,
  le zone, il BOQ e la tavola marcata. Compito: trovare elementi non marcati,
  marcati due volte, zone sovrapposte o codici della legenda mai contati.
  Non passargli le tue conclusioni.
- **Dove i sub-agenti non ci sono** (es. claude.ai): rileggi le tavole da zero,
  zona per zona, confrontando con la tavola marcata, e dichiara nel registro che
  la verifica è stata fatta in sequenza e non da un agente indipendente.

Ogni discrepanza trovata si corregge o va nel registro, con l'esito.

## Passo 5 — Deliverable

1. **BOQ Excel** con `scripts/genera_boq.py` (colonne e fogli in
   `references/formato-boq.md`): Codice articolo, Descrizione, Zona/WP, Quantità
   primaria, Quantità secondaria calcolata, Unità di misura, Formula, Confidenza,
   Tavola, Pagina, Note. Le secondarie sono **formule Excel native**, non valori.
2. **Tavola marcata** con `scripts/marca_tavola.py`: ogni occorrenza contata è
   evidenziata con un colore per codice e un numero progressivo; le zone sono
   bordate; legenda colori aggiunta su una pagina finale. Gli elementi `Low`
   hanno un riquadro tratteggiato.
3. **Registro incertezze / QS Sign-Off** (foglio dedicato nel BOQ): ID, tavola,
   pagina, zona, descrizione del dubbio, impatto sulla quantità, azione proposta
   (RFI alla DLL, chiarimento al progettista, misura in sito), stato, campo
   firma e data del QS.

## Controllo finale

- [ ] Somma dei parziali per zona = totale per codice (lo script lo verifica)
- [ ] Nessun codice della legenda assente dal BOQ senza una riga nel registro
- [ ] Ogni riga ha tavola e pagina; ogni `TBD` ha la sua riga nel registro
- [ ] Il numero di marcature sulla tavola = quantità primarie `High` contate
- [ ] Nessuna parola "definitivo", "validato", "conforme" riferita al BOQ
- [ ] Nessuna denominazione FF&E / millwork / boiserie; "DLL" e non "DL"

Se un punto fallisce, correggi prima di consegnare e dillo all'utente.
