---
name: project-controller
description: >
  Controlla avanzamento fisico e gestisce varianti per progetti di arredamento
  contract su misura (hotel, ville, retail di lusso). Genera dashboard di
  avanzamento per Work Package e area, registro varianti con ciclo di vita
  completo (proposta → emessa → approvata/rifiutata/sospesa), report periodici
  per DL e GC, e dati sintetici per newsletter settimanali. Usa questa skill
  quando l'utente menziona: avanzamento lavori, percentuale completamento,
  progress tracking, stato WP, variante, change order, modifica progetto,
  extra lavori, baseline, scostamento programma, report settimanale avanzamento,
  aggiornamento DL, dashboard cantiere, o quando chiede "a che punto siamo"
  su un progetto. Attiva anche quando l'utente carica dati di cantiere
  (quantità installate, misurazioni, foto) e vuole aggiornare lo stato del
  progetto. NON usare per stime iniziali tempi/risorse (usa estimated-tool),
  per SAL economici con fatturazione, o per snag list / punch list.
---

# Project Controller — Avanzamento Fisico & Gestione Varianti

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
davanti a DL, GC e committente.

---

## Modulo 1: Avanzamento Fisico

### Struttura gerarchica

L'avanzamento segue una gerarchia a due livelli:

```
PROGETTO
├── WP1 - FF&E Tappezzeria
│   ├── Area: Corridoi P+1
│   ├── Area: Corridoi P+2
│   ├── Area: Suite P+3
│   └── Area: Lobby
├── WP2 - FOH (Front of House)
│   ├── Area: Reception
│   ├── Area: Ristorante
│   └── Area: Bar
├── WP3 - Corridoi (millwork)
│   ├── Area: P+1
│   └── Area: P+2
└── WP4 - Suite (boiserie)
    ├── Area: Suite 301-305
    └── Area: Suite 401-405
```

L'utente definisce i WP e le aree. La struttura sopra è solo un esempio
dal Rosewood Roma — ogni progetto ha la sua configurazione.

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
- Tappezzeria, boiserie, pannellature: **mq**
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

### Output avanzamento

Produci l'output nel formato richiesto dall'utente:

**Excel (uso interno GILI):**
Genera un workbook con fogli strutturati. Per i dettagli tecnici
sulla generazione Excel, leggi `references/formato-excel.md`.

**Report Word/PDF (per DL/GC):**
Documento sintetico con:
- Riepilogo esecutivo (1 paragrafo: stato generale, criticità principali)
- Tabella avanzamento per WP
- Dettaglio per area (solo se richiesto)
- Evidenza scostamenti significativi (>5% rispetto al programma)
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
| **Proposta** | Identificata la necessità, non ancora formalizzata | GILI o GC/DL |
| **Emessa** | Formalizzata con codice, valutazione impatto completata, inviata per approvazione | GILI |
| **Approvata** | Confermata da DL/GC, impatto integrato nel baseline | DL/GC |
| **Rifiutata** | Non accettata — documentare motivazione | DL/GC |
| **Sospesa** | In attesa di decisione — monitorare e sollecitare | — |

### Codifica varianti

```
VAR-[CODICE PROGETTO]-[PROGRESSIVO]-[ANNO]

Esempio: VAR-2514RW-003-2026
```

### Flusso bidirezionale

Le varianti possono nascere da due direzioni:
1. **Top-down**: il GC/DL propone una modifica → GILI valuta impatto
2. **Bottom-up**: GILI identifica una necessità in cantiere → propone al DL

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
Documento da allegare alla comunicazione formale al DL/GC:
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
- Report per DL/GC: professionale, fattuale, senza aggettivi superflui
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

### Coerenza interna
Prima di consegnare qualsiasi output, verifica che:
- La somma delle aree corrisponda al totale del WP
- Le % siano tra 0% e 100%
- Le varianti approvate siano riflesse nel baseline
- Le date siano in ordine logico
- I totali tornino

---

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
