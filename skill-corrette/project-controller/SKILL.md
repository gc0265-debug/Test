---
name: project-controller
description: >
  Controlla avanzamento fisico e gestisce varianti per progetti di arredamento
  contract su misura (hotel, ville, retail di lusso). Genera dashboard di
  avanzamento per Work Package e area, registro varianti con ciclo di vita
  completo (proposta → emessa → approvata/rifiutata/sospesa), report periodici
  per DLL e GC, e dati sintetici per newsletter settimanali. Usa questa skill
  quando l'utente menziona: avanzamento lavori, percentuale completamento,
  progress tracking, stato WP, variante, change order, modifica progetto,
  extra lavori, baseline, scostamento programma, report settimanale avanzamento,
  aggiornamento DLL, dashboard cantiere, o quando chiede "a che punto siamo"
  su un progetto. Attiva anche quando l'utente carica dati di cantiere
  (quantità installate, misurazioni, foto) e vuole aggiornare lo stato del
  progetto. NON usare per stime iniziali tempi/risorse (usa estimated-tool),
  per SAL economici con fatturazione, o per snag list / punch list.
---

# Project Controller — Avanzamento Fisico & Gestione Varianti

## Regole che non si rompono

- La % di un WP è una media **pesata per quantità**, mai aritmetica.
- Il baseline cambia solo con una variante approvata.
- Ogni output ha la data di riferimento dei dati.
- Per 2514RW i WP sono WP1 FOH, WP2 CORRIDOI, WP3 SUITE, WP4 SCALA B,
  WP5 20 ROOM; "DLL" per la Direzione Lavori; chi firma è il "Direttore di
  Cantiere".

## Il bivio

- **Nuovo progetto** → Modulo 1, Step 1 (setup), poi Step 2-3.
- **Aggiornamento avanzamento** → chiedi o recupera il workbook, Step 2-3.
- **Variante** (nuova o cambio di stato) → Modulo 2; se passa ad Approvata,
  aggiorna anche il baseline del Modulo 1.

## Overview

Questa skill gestisce due funzioni chiave del controllo di progetto per
allestimenti di arredamento contract su misura:

1. **Avanzamento fisico**: tracking della % di completamento per Work Package
   e area, pesato su quantità fisiche (mq, pezzi, ml installati)
2. **Gestione varianti**: registro dedicato con ciclo di vita a 5 stati,
   valutazione impatto (tempo e/o costo), e aggiornamento del baseline
   quando approvate

Il contesto è sempre hospitality di lusso, ville private o retail — quindi
la qualità della documentazione deve essere professionale e difendibile
davanti a DLL, GC e committente.

---

## Modulo 1: Avanzamento Fisico

### Struttura gerarchica

L'avanzamento segue una gerarchia a due livelli:

```
2514RW — Hotel Rosewood Roma
├── WP1 FOH
├── WP2 CORRIDOI
├── WP3 SUITE
├── WP4 SCALA B
└── WP5 20 ROOM
    └── (aree definite dall'utente: piani, locali, camere)
```

Per 2514RW i WP sono sempre questi cinque, con questi nomi; nuovi WP (per
esempio una Variante Room) si aggiungono solo quando l'utente li comunica. Le
aree sotto ogni WP le definisce l'utente. Per altre commesse, WP e aree li
definisce l'utente.

### Metodo di calcolo: pesatura per quantità fisica

La % di avanzamento NON è una stima soggettiva. Si basa su quantità
misurabili:

```
% Avanzamento Area = Quantità installata / Quantità totale prevista × 100

% Avanzamento WP = Σ (% Area_i × Peso Area_i) / Σ Pesi

% Avanzamento Progetto = Σ (% WP_j × Peso WP_j) / Σ Pesi
```

**Pesi**: ogni area pesa in proporzione alla sua quantità totale prevista.
Un'area con 500 mq di tappezzeria pesa 5 volte più di un'area con 100 mq.
Questo evita che un ripostiglio finito al 100% alzi artificialmente
l'avanzamento di un WP dove la lobby da 800 mq è al 20%.

**Unità di misura tipiche** (adattare al progetto):
- Rivestimenti a parete, pannellature, tappezzeria: **mq**
- Battiscopa, profili, cornici: **ml**
- Porte, ante, cassetti, arredi singoli: **pezzi (pz)**
- Camere/suite ripetitive: **unità completate**

### Workflow operativo

**Step 1: Setup iniziale (una tantum per progetto)**

Chiedi all'utente:
- Nome e codice progetto
- Lista WP con descrizione
- Per ogni WP: lista aree
- Per ogni area: quantità totale prevista + unità di misura
- Data baseline (data di inizio riferimento del programma)

Se l'utente non ha tutti i dati, lavora con quello che ha e segna
"TBD" dove mancano informazioni. Non bloccare il processo.

**Step 2: Aggiornamento periodico**

L'utente fornisce i dati aggiornati. Possono arrivare in molti modi:
- Testo libero: "Corridoi P+2: installati 120 mq su 340 totali"
- Tabella incollata da Excel
- File caricato
- Aggiornamento parziale: "la lobby è passata dal 40% al 55%"

Interpreta i dati e aggiorna. Se qualcosa non torna (es. quantità
installata > prevista), segnala e chiedi conferma.

**Step 3: Calcola e genera output**

Dopo l'aggiornamento, calcola:
- % avanzamento per ogni area
- % avanzamento per ogni WP (media pesata)
- % avanzamento progetto complessivo
- Delta vs. programma (se il dato è disponibile)
- Trend: avanzamento atteso vs. reale

### Soglie di scostamento (uniche per tutti gli output)

Delta = % reale − % programma, in punti percentuali.

| Delta | Stato | Colore Excel | Icona report |
|---|---|---|---|
| > +5 | In anticipo | verde | ▲ |
| da −5 a +5 | In linea | verde | ● |
| da −15 a −5 (escluso) | In ritardo | arancione | ▼ |
| < −15 | Critico | rosso | ◆ |

### Output avanzamento

Produci l'output nel formato richiesto dall'utente:

**Excel (uso interno GILI):**
Genera un workbook con fogli strutturati. Per i dettagli tecnici
sulla generazione Excel, leggi `references/formato-excel.md`.

**Report Word/PDF (per DLL/GC):**
Documento sintetico con:
- Riepilogo esecutivo (1 paragrafo: stato generale, criticità principali)
- Tabella avanzamento per WP
- Dettaglio per area (solo se richiesto)
- Evidenza scostamenti significativi (oltre la soglia "in linea", vedi sotto)
- Azioni in corso per recupero ritardi

**Dati per newsletter:**
Blocco di testo sintetico (5-8 righe) con:
- % avanzamento complessivo
- WP più avanzato e meno avanzato
- Milestone raggiunte nella settimana
- Criticità principali

---

## Modulo 2: Gestione Varianti

### Ciclo di vita della variante

Ogni variante segue un percorso a 5 stati:

```
PROPOSTA → EMESSA → APPROVATA
                  → RIFIUTATA
                  → SOSPESA → (può tornare a EMESSA)
```

| Stato | Significato | Chi agisce |
|-------|-------------|------------|
| **Proposta** | Identificata la necessità, non ancora formalizzata | GILI o GC/DLL |
| **Emessa** | Formalizzata con codice, valutazione impatto completata, inviata per approvazione | GILI |
| **Approvata** | Confermata da DLL/GC, impatto integrato nel baseline | DLL/GC |
| **Rifiutata** | Non accettata — documentare motivazione | DLL/GC |
| **Sospesa** | In attesa di decisione — monitorare e sollecitare | — |

### Codifica varianti

```
VAR-[CODICE PROGETTO]-[PROGRESSIVO]-[ANNO]

Esempio: VAR-2514RW-003-2026
```

### Flusso bidirezionale

Le varianti possono nascere da due direzioni:
1. **Top-down**: il GC/DLL propone una modifica → GILI valuta impatto
2. **Bottom-up**: GILI identifica una necessità in cantiere → propone alla DLL

In entrambi i casi, il registro traccia l'origine (campo "Richiesta da").

### Valutazione impatto

Per ogni variante, valuta l'impatto in modo flessibile:

**Sempre presente:**
- Descrizione dettagliata della modifica
- WP e aree impattate
- Impatto sul programma (giorni di anticipo/ritardo)

**Quando rilevante (non sempre obbligatorio):**
- Impatto economico (delta costo stimato)
- Impatto su risorse (crew aggiuntiva necessaria)
- Rischi associati alla variante

Questa flessibilità è importante: a volte una variante è solo un cambio
di finitura che non impatta né tempi né costi. Non forzare l'utente
a compilare campi inutili.

### Aggiornamento baseline

Quando una variante passa a stato **Approvata**:
1. Il registro varianti viene aggiornato
2. Le quantità previste nel baseline dell'avanzamento fisico vengono modificate
3. L'avanzamento % viene ricalcolato sul nuovo baseline
4. Il delta vs. programma viene aggiornato

Questo collegamento è fondamentale: il registro varianti e l'avanzamento
fisico non sono documenti separati — le varianti approvate *cambiano*
il baseline su cui si misura l'avanzamento.

### Output varianti

**Registro varianti (Excel):**
Per il formato dettagliato, leggi `references/formato-excel.md`.

**Scheda variante singola (Word/PDF):**
Documento da allegare alla comunicazione formale alla DLL/GC:
- Intestazione con codice variante e progetto
- Descrizione della modifica
- Motivazione / origine
- Impatto tempo (giorni, con spiegazione)
- Impatto costo (se applicabile)
- WP e aree impattate
- Raccomandazione GILI
- Spazio per firma/approvazione

**Sintesi per newsletter:**
Blocco di testo (3-5 righe):
- N. varianti attive (per stato)
- Impatto cumulativo sul programma
- Varianti critiche in attesa di decisione

---

## Regole generali di output

### Tono e linguaggio
- Report per DLL/GC: professionale, fattuale, senza aggettivi superflui
- Dati per newsletter: sintetico ma informativo, tono operativo
- Excel interni: chiari, con note esplicative dove serve

### Precisione numerica
- Percentuali: 1 decimale (es. 64.7%, non 64.706%)
- Quantità: coerenti con l'unità di misura (mq con 1 decimale, pezzi interi)
- Date: formato DD/MM/YYYY (standard italiano)

### Quando mancano dati
Non inventare. Se l'utente non ha fornito un dato:
- Segna "n.d." o "TBD" nel campo
- Segnala all'utente cosa manca
- Procedi con quello che c'è — un report parziale è meglio di nessun report

### Lista da copiare nella risposta e spuntare

```
- [ ] 1. Setup o dati dell'aggiornamento acquisiti (data di riferimento)
- [ ] 2. Varianti approvate riportate nel baseline
- [ ] 3. % per area, WP (media pesata) e progetto calcolate
- [ ] 4. Stati di scostamento assegnati con la tabella unica
- [ ] 5. Output generati
- [ ] 6. Controllo finale superato
```

### Controllo finale
- [ ] Somma delle quantità delle aree = totale del WP
      → se no, torna allo Step 1 (setup aree)
- [ ] Tutte le % tra 0% e 100%
      → se una supera 100%, torna allo Step 2 e chiedi conferma all'utente
- [ ] Media del WP pesata per quantità, non aritmetica
      → se no, torna allo Step 3
- [ ] Varianti approvate riflesse nel baseline → se no, torna al Modulo 2
- [ ] Stati di scostamento coerenti con la tabella unica in tutti gli output
- [ ] Date in ordine logico, data di riferimento presente
- [ ] Nomi WP ufficiali; "DLL" per la Direzione Lavori; firma "Direttore di
      Cantiere"

Se un controllo non passa, torna al passo indicato, correggi e ricontrolla.
Finisci solo quando tutti i controlli passano. Se un output sbaglia per un
motivo che la lista non prevede, proponi all'utente una regola nuova.

---

## Serve

- `pip install openpyxl` (workbook avanzamento e registro varianti)
- `pip install python-docx` (report e scheda variante in Word)

## Riferimenti tecnici

- Per il formato dettagliato degli Excel (struttura fogli, formule,
  formattazione): leggi `references/formato-excel.md`
- Per esempi di report e template: leggi `references/template-report.md`

---

## Errori da evitare

- **Non confondere avanzamento fisico con avanzamento economico**: questa skill
  traccia mq/pezzi installati, non fatturato. Se l'utente chiede un SAL
  economico, non è questa la skill giusta.

- **Non usare medie semplici**: l'avanzamento del WP è una media *pesata*
  per quantità, non una media aritmetica delle % delle aree. Un'area piccola
  al 100% non compensa un'area grande al 10%.

- **Non ignorare le varianti sospese**: tendono a restare nel limbo. Nella
  reportistica, evidenzia sempre le varianti sospese da più di 2 settimane.

- **Non modificare il baseline senza variante approvata**: se le quantità
  cambiano, deve esserci una variante che lo giustifica. Il baseline è
  sacro fino a quando una variante formale non lo modifica.

- **Non produrre report senza data di aggiornamento**: ogni output deve
  avere la data di riferimento dei dati. "Avanzamento al 12/03/2026",
  non "avanzamento attuale".
