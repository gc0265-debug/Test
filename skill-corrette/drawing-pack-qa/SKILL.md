---
name: drawing-pack-qa
description: >
  Controlla un plico di tavole PDF prima di qualsiasi take-off, misura o stima:
  riconcilia i file con il Registro Documenti, distingue tavole vettoriali da
  scansioni, trova pagine ruotate, confronta scala e formato dichiarati nel
  cartiglio con il formato reale del PDF, verifica nome file contro contenuto e
  pianifica la divisione dei plichi. Produce il registro QA tavole, il piano di
  bonifica e il registro chiarimenti per il Quantity Surveyor. Usala quando
  l'utente dice: controlla le tavole, QA tavole, verifica plico, sono vettoriali,
  scala delle tavole, prima del computo, tavole ruotate, registro documenti.
  È il passo obbligato prima di drawing-takeoff. NON estrae quantità (→ drawing-takeoff).
---

# Drawing Pack QA | Controllo plico tavole prima del take-off

## Regole che non si rompono

- **Nessuna presunzione.** Scala, formato, revisione o disciplina che il file
  non dice in modo esplicito si scrivono "Non verificata / Da chiarire". Non si
  deducono dal "solito" formato o dalla scala più comune.
- **Vettoriale prima di tutto.** Una pagina raster (anche con OCR) è `Fail` per
  il take-off: niente conteggi automatici né misure, si chiede il vettoriale o
  l'IFC. Il testo OCR di una scansione non rende la geometria affidabile.
- **Ogni segnalazione è tracciabile**: file, pagina e elemento (cartiglio,
  riquadro, quota) a cui si riferisce.
- **Gli originali non si toccano.** Rotazioni e divisioni si fanno su copie in
  una cartella nuova, dopo conferma dell'utente.
- **L'esito QA non è un'approvazione delle tavole.** Dice solo se il plico è
  utilizzabile per il take-off. La conformità del progetto resta della DLL
  (mai "DL", che qui non compare).

## Il bivio

- **Plico nuovo** → passi 1-5, poi report.
- **Nuova revisione di alcune tavole** → chiedi il `qa_registro.csv` precedente,
  rifai i passi 1-5 sui soli file nuovi o cambiati, aggiorna il registro QA
  segnando "Rev. precedente → nuova".
- **Plico che ha già fallito e torna corretto** → ricontrolla prima le azioni
  richieste allora (risolte / non risolte), poi tutto il resto.

## Lista da copiare nella risposta e spuntare

```
- [ ] 1. Cartella indicizzata, riconciliata con il Registro Documenti (se c'è)
- [ ] 2. Vettoriale / raster per ogni pagina
- [ ] 3. Orientamento: rotazioni proposte confermate a vista
- [ ] 4. Scala e formato: dichiarato vs reale, sanity check su quota nota
- [ ] 5. Nome file vs contenuto, plichi da dividere
- [ ] 6. Report con le 3 sezioni, rivisto a vista
- [ ] 7. Bonifica (solo dopo ok dell'utente) e nuova scansione della cartella bonificata
```

Gli script richiedono `pip install pymupdf`.

## Passi 1-5 — scansione automatica, poi verifica a vista

1. Esegui:
   `python3 scripts/analizza_plico.py <cartella> --registro registro.csv --tag "F6,C1"`
   - `--registro`: il Registro Documenti in CSV (`codice,revisione`), se
     l'utente lo fornisce. Senza registro, scrivi nel report che la
     riconciliazione non è stata fatta.
   - `--tag`: due o tre sigle che devono comparire (codici elemento o nomi
     locali), chieste all'utente. Servono al test di ricerca testo.
   Lo script produce `qa_registro.csv` (una riga per pagina, letto poi da
   drawing-takeoff) e `qa_report.md` (bozza con le 3 sezioni).
2. **Vettoriale / raster** — lo script classifica: `Vettoriale`, `Ibrido`
   (immagini su più del 30% della pagina), `Raster con OCR`, `Raster`. Per le
   pagine Ibrido guarda la pagina e scrivi quali riquadri sono immagine.
3. **Orientamento** — lo script legge la direzione del testo prevalente e
   propone la rotazione. Guarda ogni pagina con rotazione proposta o "Misto":
   le quote verticali possono ingannare il conteggio. Conferma o correggi
   nella colonna `confermata` di `qa_registro.csv`.
4. **Scala e formato**
   - Formato dichiarato ≠ formato reale → `ALLERTA SCALA`: misure dirette
     vietate su quella tavola. I conteggi da testo restano possibili.
   - Formato non dichiarato o scala non trovata → `Riserva`, mai una scala
     presunta.
   - **Sanity check** su almeno una quota esplicita per tavola da misurare
     (interasse, larghezza edificio):
     `python3 scripts/verifica_scala.py tavola.pdf --pagina N --p1 x,y --p2 x,y --reale-mm 6000 --scala 100`.
     Gli estremi si prendono dalla linea di quota (`page.get_drawings()` vicino
     a `page.search_for("6000")`). Scarto oltre 5% = ALLERTA SCALA.
   - Più scale sulla stessa pagina → attribuiscile ai riquadri leggendo i titoli.
5. **Nome file e disciplina** — lo script confronta prefisso del nome file e
   parole chiave del contenuto. Una differenza va guardata: un file "STR" con
   tavole elettriche fa saltare documenti nelle ricerche mirate. Per ogni plico
   multipagina proponi la divisione in `mappa.csv`
   (`file,pagina_da,pagina_a,nome_nuovo`), con nomi per disciplina e codice tavola.

## Report

Parti da `qa_report.md` e completalo a vista. Struttura fissa:

1. **Tabella Registro QA Tavole** — Nome File | Pagina | Disciplina Rilevata |
   Vettoriale (Sì/No) | Scala Nominale | Formato PDF | Orientamento | Esito QA.
   Esiti: **Pass**, **Riserva** (utilizzabile con i limiti scritti),
   **Fail (azione richiesta)**. Criteri in `references/criteri-esito.md`.
2. **Piano di Bonifica Immediato** — pagine da ruotare, plichi da dividere con
   i nomi proposti, tavole da richiedere in vettoriale o IFC.
3. **Registro Chiarimenti / Incertezze per il QS** — discrepanze cartiglio /
   dimensioni PDF, quote contrastanti, simboli senza etichetta testuale,
   revisioni non coerenti col registro.

Le richieste di file vettoriali o chiarimenti vanno a chi ha emesso le tavole
attraverso il canale previsto (per le tavole di progetto, RFI alla DLL): qui
si prepara solo l'elenco.

## Bonifica (dopo l'ok dell'utente)

`python3 scripts/prepara_plico.py <cartella> --qa qa_registro.csv --mappa mappa.csv --out <cartella>_bonificato`

Poi riesegui `analizza_plico.py` sulla cartella bonificata: è quel
`qa_registro.csv` che drawing-takeoff deve usare.

## Controllo finale

- [ ] Ogni pagina di ogni PDF ha una riga nel registro QA
- [ ] Nessuna scala o formato scritti senza essere letti nel file
- [ ] Ogni Fail ha un'azione nel piano di bonifica o nel registro chiarimenti
- [ ] Ogni tavola su cui si misureranno lunghezze ha un sanity check di scala
- [ ] I file non PDF della cartella sono elencati (non analizzati)
- [ ] Gli originali sono intatti

Se un punto fallisce, correggi prima di consegnare e dillo all'utente.
