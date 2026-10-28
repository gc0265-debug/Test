---
name: gestione-non-conformita
description: >
  Gestisce l'apertura, l'escalation e la chiusura delle non conformità
  (difetti di montaggio, materiali danneggiati, scostamenti da progetto/
  capitolato) rilevate durante l'esecuzione di cantieri di arredamento
  contract su misura (hotel, ville, retail). Assegna SLA per gravità,
  traccia lo stato (Aperta/In lavorazione/Verificata/Chiusa), segnala i
  ritardi rispetto allo SLA ed effettua l'escalation verso DL/GC per le NC
  critiche o scadute. Usa questa skill per: non conformità, NC, difetto
  montaggio, materiale danneggiato, scostamento capitolato, escalation
  fornitore, verifica chiusura, SLA risoluzione, ritardo risoluzione
  difetto, o quando l'utente carica foto/elenchi di problemi rilevati in
  cantiere. NON usare per la snag list finale di collaudo pre-consegna
  (processo distinto, in fase di mappatura), per le varianti contrattuali
  (usa project-controller), né per l'audit dei contratti di fornitura
  (usa auditing-contratti-montaggio).
---

# Gestione Non Conformità — Apertura, Escalation, Chiusura

## Overview

Questa skill copre il ciclo di vita completo di una non conformità (NC)
rilevata durante l'esecuzione del cantiere: dalla segnalazione, alla
responsabilizzazione del fornitore, fino alla verifica di chiusura.
Non sostituisce la raccolta dati (foto, responsabile, impatto) che già
fai bene con il tuo tool digitale — aggiunge il layer che oggi manca:
**SLA per gravità, tracciamento dei ritardi, escalation automatica**.

---

## Livelli di gravità e SLA

| Gravità | Definizione | SLA risoluzione | Escalation |
|---------|-------------|------------------|------------|
| 🔴 **Critica** | Blocca lavorazioni successive, impatto sicurezza, o visibile su spazi a vista in aree chiave | 24h | Fornitore + DL/GC immediatamente |
| 🟠 **Normale** | Scostamento da capitolato/progetto, impatta qualità o programma ma non blocca | 72h | Fornitore; DL/GC solo se scade lo SLA |
| 🟡 **Lieve** | Difetto estetico minore, non impatta programma | 7 giorni | Solo fornitore |

Se l'utente non specifica la gravità quando segnala una NC, chiedila —
non assegnare mai una gravità di default, perché cambia lo SLA e chi
va coinvolto.

---

## Workflow operativo

### Step 1 — Apertura NC

Per ogni NC segnalata, registra:
- Data/ora rilevazione
- Cantiere, WP/area (se disponibile, coerente con la struttura usata in `project-controller`)
- Descrizione + foto (se fornite)
- Fornitore/squadra responsabile
- Gravità (vedi tabella) → calcola automaticamente la scadenza SLA
- Codice NC: `NC-[CODICE CANTIERE]-[PROGRESSIVO]-[ANNO]` (stesso schema delle varianti per coerenza)

### Step 2 — Notifica

All'apertura, genera la comunicazione verso il fornitore responsabile
(vedi `references/template-comunicazioni-nc.md`). Per le NC 🔴 Critiche,
includi da subito DL/GC in copia/conoscenza.

### Step 3 — Monitoraggio stato

Stati possibili: **Aperta** → **In lavorazione** (il fornitore ha
confermato presa in carico) → **Verificata** (tu hai fatto verifica
visiva, in attesa chiusura formale) → **Chiusa**.

Ad ogni aggiornamento fornito dall'utente, aggiorna lo stato. Calcola
sempre lo stato di ritardo:
- **In termine**: entro lo SLA
- **In scadenza**: meno del 20% dello SLA rimanente (es. <5h per una
  critica, <14h per una normale)
- **Scaduta**: SLA superato senza chiusura

### Step 4 — Escalation automatica

Quando una NC diventa **Scaduta**:
- Se era 🟠 Normale o 🟡 Lieve → esegui comunque l'escalation a DL/GC
  (anche se non previsto dallo SLA iniziale), perché il ritardo stesso
  è l'evento che giustifica il coinvolgimento
- Se era già 🔴 Critica → intensifica la comunicazione, segnala come
  priorità massima

Non aspettare che l'utente chieda l'escalation: è parte dell'output
automatico quando rilevi un superamento SLA.

### Step 5 — Chiusura

La chiusura richiede la verifica visiva del coordinatore (Field Project
SAS) prima di passare a "Chiusa" — mai chiudere una NC solo perché il
fornitore dichiara di aver risolto. Registra:
- Data verifica
- Esito (conforme / richiede ulteriore intervento → riapri NC)
- Eventuale nota fotografica post-intervento

---

## Output

### Registro NC (Excel)
Una riga per NC: tutti i campi sopra + stato + giorni al superamento
SLA (o giorni di ritardo se già scaduta). Formattazione condizionale
sullo stato di ritardo (verde/giallo/rosso), stessa logica cromatica
usata in `cantiere-sicurezza-onboarding` per coerenza visiva del brand.

### Report settimanale (per DL/GC)
Sintesi periodica in formato Field Project SAS:
- N. NC aperte/chiuse nella settimana
- NC critiche o scadute in evidenza, con azioni in corso
- Trend: tempo medio di chiusura per gravità, % chiuse entro SLA

Per il template dettagliato leggi `references/template-report-nc.md`.

### Comunicazioni (apertura NC ed escalation)
Bozze pronte per fornitore e, quando previsto, DL/GC. Vedi
`references/template-comunicazioni-nc.md`. Presenta sempre come bozze
da rivedere prima dell'invio, non inviare automaticamente.

---

## Metriche di tempo risparmiato

**Baseline rilevata**: NC con impatto settimanale reale sul planning,
dovuto non alla raccolta dati (già efficiente) ma all'assenza di
scadenze e tracciamento dei ritardi — tempo perso a "ridiscutere" con i
fornitori su cosa era stato concordato e quando.

**Metrica primaria** (più significativa del tempo qui): **% di NC
chiuse entro lo SLA**. Traccia questo dato nel tempo — è il vero
indicatore che il processo sta funzionando, più delle ore risparmiate.

**Metrica secondaria — tempo**: stima 30-45 minuti per NC risparmiati
in follow-up e chiarimenti quando lo stato/scadenza è tracciato invece
che ricostruito a memoria. Con ~4-6 NC/settimana (frequenza settimanale
dichiarata), il risparmio stimato è:

```
30-45 min × 4-6 NC/settimana ≈ 2-4.5h/settimana ≈ 8-18h/mese
```

Aggiorna questa stima con dati reali (numero effettivo di NC/settimana,
tempo effettivo di chiusura) non appena disponibili.

---

## Errori da evitare

- **Non assegnare gravità di default**: cambia SLA ed escalation, va
  sempre confermata.
- **Non chiudere una NC senza verifica visiva**: la dichiarazione del
  fornitore non basta.
- **Non nascondere le NC scadute**: vanno sempre in evidenza nei report,
  anche se "solo" 🟡 Lieve — un pattern di NC lievi scadute è comunque
  un segnale di un fornitore poco affidabile (utile anche per il futuro
  processo di storico performance fornitori).
- **Non confondere una NC con una variante**: la NC è un difetto/
  scostamento da correggere senza costo aggiuntivo per il cliente (salvo
  diversamente concordato); la variante è una modifica formale al
  progetto. Se un fornitore prova a trasformare una NC in richiesta di
  extra, segnala la cosa esplicitamente invece di procedere come se
  fosse normale.
