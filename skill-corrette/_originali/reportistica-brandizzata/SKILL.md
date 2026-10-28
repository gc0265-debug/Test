---
name: reportistica-brandizzata
description: >
  Genera la reportistica periodica di cantiere in formato Field Project SAS
  (montaggi arredi su misura hotel/ville/retail) per tre destinatari:
  report settimanale PDF/Word per DL/GC, email narrativa per il cliente
  finale, e report consolidato settimanale per l'Advisor che riconcilia
  tre input (dati di campo DdC/preposto, input strutturato del PM, dati
  app di cantiere) in un quadro unico pre-riunione di coordinamento, con
  avanzamento per WP, criticità/nodi bloccanti, verifica milestone e
  segnalazione delle discrepanze tra fonti. Usa per: report settimanale,
  aggiornamento DL/GC o cliente, consolidato Advisor, riunione di
  coordinamento settimanale, allineamento dati campo-PM, quadro unico
  commessa, input PM, o quando l'utente chiede di preparare
  l'aggiornamento su come sta andando il cantiere. Applica sempre
  l'identità visiva Field Project SAS. NON usare per la singola notifica
  di una NC o di un problema sicurezza — questa skill le aggrega nel
  periodico.
---

# Reportistica Brandizzata — Report Periodici di Cantiere

## Overview

Questa skill produce la comunicazione periodica verso due destinatari
diversi, con contenuto e tono differenziati, ma sempre nell'identità
visiva Field Project SAS:

1. **Report DL/GC** (settimanale, PDF/Word) — tecnico, dati aggregati
2. **Email cliente** (settimanale) — narrativo, sintetico, non tecnico
3. **Report consolidato Advisor** (settimanale, pre-riunione di
   coordinamento) — riconciliazione a tre input in un quadro unico
   allineato, base delle scritture formali di rito (vedi sezione
   dedicata e `references/consolidatore-advisor.md`)

Per l'identità visiva completa (colori, font, elemento grafico, logo)
leggi sempre `references/brand-identity.md` prima di generare un
documento.

---

## Report DL/GC (PDF/Word settimanale)

### Aggregazione dati

Ad ogni generazione, raccogli e integra automaticamente, quando
disponibili nella conversazione o forniti dall'utente:
- **Avanzamento fisico** (logica `project-controller`): % per WP,
  delta vs programma
- **Non conformità** (logica `gestione-non-conformita`): NC
  aperte/chiuse nel periodo, critiche/scadute in evidenza, % chiuse
  entro SLA
- **Sicurezza squadre** (logica `cantiere-sicurezza-onboarding`): stato
  squadre attive, eventuali criticità documentali aperte

Non includere le **varianti** contrattuali a meno che l'utente non lo
richieda esplicitamente per questo invio.

Se uno di questi dati non è disponibile per il periodo, ometti la
sezione invece di inventare dati o lasciare placeholder visibili nel
documento finale — un report con 3 sezioni solide è meglio di uno con
4 sezioni di cui una vuota.

### Struttura del documento

1. **Header brand**: logo Field Project SAS, nome cantiere, cliente,
   periodo di riferimento, data emissione
2. **Executive summary**: 1 paragrafo, stato generale e criticità
   principali, linguaggio diretto
3. **Avanzamento fisico**: tabella % per WP, delta vs programma
4. **Non conformità**: riepilogo numerico + tabella NC critiche/scadute
5. **Sicurezza**: stato squadre attive (solo se ci sono criticità o
   variazioni rilevanti nel periodo — se tutto è 🟢 basta una riga)
6. **Prossimi 7 giorni**: attività pianificate, eventuali rischi

Per il layout dettagliato (impaginazione, uso colori/font) leggi
`references/template-report-dlgc.md`.

### Generazione tecnica

Genera il documento come .docx seguendo le convenzioni della skill
`docx` (per la creazione con docx-js, gestione immagini/tabelle,
verifica visiva del rendering). Applica la palette e lo stile da
`references/brand-identity.md`. Inserisci il logo
(`assets/logo-field-project.png`) nell'header.

---

## Email Cliente (settimanale)

### Differenza di contenuto rispetto al report DL/GC

Il cliente finale (proprietario hotel/villa) non ha bisogno di dati
tecnici (% per WP, SLA, codici NC). Vuole sapere: **come sta andando,
cosa è successo di rilevante, cosa aspettarsi**.

### Struttura

1. Apertura cortese
2. Stato generale in linguaggio non tecnico: "in linea con i tempi" /
   "in leggero anticipo" / "stiamo recuperando un piccolo ritardo su X"
   — mai percentuali grezze o terminologia da cantiere
3. Milestone raggiunte questa settimana (2-3 punti concreti e visibili,
   non processo interno)
4. Prossimi passi attesi
5. Punti di attenzione **solo se rilevanti per il cliente** (es. un
   accesso che sarà necessario, non una NC minore già gestita
   internamente) — non travasare qui il contenuto tecnico del report
   DL/GC
6. Chiusura cordiale, firma Field Project SAS

Per il template con esempi di tono, leggi
`references/template-email-cliente.md`.

---

## Report Consolidato Advisor (settimanale, pre-riunione)

### Scopo

L'Advisor prepara la riunione di coordinamento settimanale (DL +
committente + GC) e le scritture formali di rito a tutela contrattuale.
Oggi perde tempo a raccordare fonti non sincronizzate: il quadro deve
arrivargli **già consolidato e riconciliato**, non da ricostruire.

### I tre input

| Input | Fonte | Forma attesa |
|-------|-------|--------------|
| **Campo** | DdC + preposto | Giornale di cantiere, stato zone/WP, nodi rilevati sul posto |
| **PM** | Template strutturato | 5 campi per riga: WP, tema, stato, azione richiesta, scadenza (da conversazioni email — vedi `assets/Input_PM_Settimanale.xlsx`) |
| **App di cantiere** | Export/riepilogo liste | Avanzamento liste per WP/zona, presenze, foto milestone |

Se disponibile, integrare anche l'**estratto del registro instabilità
progettuale** (skill `registro-instabilita-progettuale`): episodi della
settimana e contatori cumulativi.

### Riconciliazione (il cuore del consolidatore)

Prima di comporre il report, incrociare gli input e segnalare
esplicitamente:
- **Discrepanze**: stesso tema con stati diversi tra campo e PM (es. il
  campo dice "bloccato", le email del PM dicono "risolto") → riga in
  evidenza "DA ALLINEARE" con entrambe le versioni e le fonti
- **Buchi**: temi presenti in un solo input che dovrebbero avere
  riscontro nell'altro (es. azione promessa via email mai vista in campo)
- **Novità non comunicate**: elementi del campo assenti dal flusso PM e
  viceversa

Le discrepanze non si risolvono in autonomia: si espongono. Il valore è
che DdC e PM arrivino in riunione con UNA versione, non due.

### Struttura del report

1. Header brand + commessa + settimana di riferimento
2. **Quadro avanzamento per WP**: stato sintetico, delta vs programma
3. **Criticità e nodi bloccanti**: tabella con responsabile atteso e
   giorni di anzianità del nodo
4. **Verifica milestone cronoprogramma**: milestone del periodo,
   raggiunte/a rischio/mancate, causa sintetica
5. **Instabilità progettuale** (se disponibile): nuovi episodi +
   cumulativi
6. **Sezione riconciliazione**: discrepanze DA ALLINEARE (se nessuna,
   una riga di conferma allineamento)
7. **Decisioni richieste in riunione**: elenco puntato di ciò che serve
   dal tavolo DL/committente, formulato come domande chiuse

Formato Word brandizzato, 2-3 pagine massimo: l'Advisor deve poterlo
usare direttamente in riunione. Dettagli in
`references/consolidatore-advisor.md`.

### Flusso settimanale consigliato

1. Entro il giorno precedente la riunione: PM invia il template
   compilato; DdC fornisce sintesi campo e dati app
2. Generazione consolidato + riconciliazione
3. Revisione lampo a due (DdC + PM) SOLO sulle righe DA ALLINEARE
4. Invio all'Advisor con anticipo sufficiente per le scritture

---

## Metriche di tempo risparmiato

**Baseline rilevata**: reportistica oggi in mix — a volte strutturata,
a volte solo verbale in riunione, senza documento tracciabile. Priorità
dichiarata dall'utente: tempo E brand, ugualmente.

**Tempo**: comporre un report settimanale da zero (raccogliere dati
sparsi, scrivere, formattare, adattare per due destinatari diversi)
stimato oggi in **1.5-2.5h/settimana per cantiere attivo**. Con
aggregazione automatica dai dati già tracciati nelle altre skill e
template pronto, stima **20-30 minuti/settimana** di revisione e invio.

```
Risparmio stimato: ~1.5-2h/settimana per cantiere ≈ 6-8h/mese per cantiere
```

Su più cantieri attivi in parallelo, il risparmio si moltiplica per il
numero di cantieri.

**Consolidato Advisor** (baseline 2514RW): comunicazione destrutturata
verso l'Advisor ~4h/settimana (telefonate quotidiane ~30 min/g +
riunione 1,5h) più il tempo suo di raccordo fonti. Target con
consolidato: -50% delle telefonate di allineamento (~2h/settimana
recuperate lato DdC) + riunione più corta e decisionale. Metrica di
controllo: n. righe DA ALLINEARE per settimana — se scende nel tempo,
il flusso PM-campo sta convergendo; se resta alto, il problema è a
monte del report.

**Brand**: metrica qualitativa ma reale — ogni comunicazione verso
DL/GC/cliente rinforza la percezione di Field Project SAS come
struttura organizzata e professionale, elemento che vale nella
retention dei clienti anche se non si misura in ore.

---

## Errori da evitare

- **Non mescolare i toni**: il report DL/GC è tecnico e fattuale, l'email
  cliente è narrativa e rassicurante — non riusare le stesse frasi tra
  i due.
- **Non omettere il periodo di riferimento**: ogni documento deve avere
  date chiare, mai "aggiornamento attuale".
- **Non includere varianti senza richiesta esplicita** per questo invio.
- **Non lasciare sezioni vuote visibili**: se un dato manca, ometti la
  sezione, non lasciare un placeholder tipo "[dato non disponibile]"
  nel documento finale consegnato a DL/GC o cliente.
- **Non risolvere le discrepanze in autonomia nel consolidato**: si
  espongono con entrambe le versioni, la sintesi unilaterale distrugge
  la fiducia di uno dei due contributori.
- **Non generare il consolidato con un solo input disponibile**: con
  meno di due fonti è un report di parte, non un consolidato — in quel
  caso produrre il report DL/GC standard e segnalare l'input mancante.
- **Non applicare il layout tecnico del report DL/GC all'email cliente**:
  niente tabelle con percentuali o codici NC nell'email cliente.
