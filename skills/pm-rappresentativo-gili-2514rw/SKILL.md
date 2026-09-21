---
name: pm-rappresentativo-gili-2514rw
description: >
  Presidio del Direttore di Cantiere sulla commessa 2514RW: tiene il
  Registro Allert delle comunicazioni di tutela verso la committenza,
  classifica ogni output in perimetro / grigio / fuori perimetro,
  applica la rimessione nominale, solleva i solleciti secondo la scala
  7/15/30 giorni e mantiene il registro delle vulnerabilità con
  priorità. Misura la copertura del PM rappresentativo: riunioni
  coperte, completezza del SAL consolidato sui quattro WP, NC
  comunicate fuori dal PM di competenza. Usa per: registro allert,
  comunicazione di tutela, rientra nel mio perimetro, fuori perimetro,
  rimetto la valutazione a, sollecito su una segnalazione formale,
  vulnerabilità del fascicolo, presidio GC, mi hanno chiesto qualcosa
  che non mi compete. NON per mappare processi (mappa-tesoro) o
  scrivere skill (skill-creator), invariate; non è il registro
  decisioni DL (preparazione-riunione-dl) né il design change log
  (registro-instabilita-progettuale).
---

# Presidio GC — Commessa 2514RW

Il presidio è l'unico processo del sistema che non guarda l'opera ma
**la posizione di chi la coordina**. Le altre skill tracciano difetti,
avanzamenti, scadenze e decisioni; questa traccia ciò che protegge il
Direttore di Cantiere: che cosa è stato segnalato, quando, a chi, e che
cosa è stato esplicitamente rimesso a chi ne ha la competenza.

## Fonte dei dati

Il presidio **non contiene** i dati: li legge dal fascicolo, che vive
fuori da questa skill.

- `Presidio_GC_v7.0.md` — identità, perimetro dell'incarico, contatti,
  vulnerabilità, pattern consolidati
- `Registro_Allert_2514RW_v7.docx` — le comunicazioni tracciate, A4
  orizzontale, tabella a 7 colonne

Vanno caricati entrambi a inizio lavoro. Se mancano, chiedili prima di
procedere: senza il fascicolo il presidio non ha memoria, e una riga
inserita senza la numerazione corrente rompe il registro.

## 1. Le tre categorie — si applicano a ogni output

Ogni mail, agenda, commento contrattuale o nota di riunione va
classificato prima di essere scritto:

| Categoria | Comportamento |
|---|---|
| **In perimetro** | Si esegue e si risponde nel merito |
| **Grigio** | Si contribuisce, dichiarando la qualifica del contributo: «rilevazione fisica/operativa soggetta a validazione tecnica» |
| **Fuori perimetro** | Si rimette esplicitamente, con nome e funzione: «non rientra nella sfera di competenza del Direttore di Cantiere — rimetto la valutazione a [nome/funzione]» |

Il rinvio è **sempre nominale**. Mai «si valuterà»: sempre «rimetto a
[chi]». Un rinvio generico non protegge nessuno.

Il perimetro dell'incarico — che cosa rientra e che cosa no — è nella
sezione 2 del fascicolo. Va riletto prima di classificare, non
ricordato a memoria.

## 2. Registro Allert — struttura di una riga

| Campo | Contenuto |
|---|---|
| N. | Progressivo cronologico, mai riusato |
| Data | Data e ora dell'invio |
| Oggetto | L'oggetto reale della comunicazione |
| Destinatari | A / Cc separati, per nome |
| Tipologia | Allert strategico · Segnalazione formale · Segnalazione interna · Sollecitazione operativa · Comunicazione informativa |
| Stato | Esito, oppure riferimento alla riga che riapre il tema |

Regole di manutenzione:

- L'inserimento è **in sequenza cronologica**, non in coda: una
  comunicazione ritrovata a posteriori si inserisce alla sua data e
  impone la rinumerazione di tutte le righe successive.
- Le voci storiche **non si alterano mai** nel contenuto: si rinumerano
  e basta, e la rinumerazione va dichiarata nella nota di versione.
- Ogni revisione alza la versione del registro e del fascicolo insieme.

## 3. Verifica di completezza — a ogni revisione

Non fidarsi del registro come specchio di quello che è successo. A ogni
revisione, riscontrare i documenti di progetto disponibili e cercare le
comunicazioni **non ancora tracciate**. È così che è emersa la riga 02
il 21.06.2026, a mesi di distanza dal fatto.

## 4. Protocollo di sollecito — 7 / 15 / 30 giorni

Un registro che traccia ma non aziona perde valore: i follow-up
lasciati aperti diventano «da aggiornare» per sempre. Ogni riga che
attende una risposta ha due colonne in più:

| Giorni dall'invio | Azione |
|---|---|
| 7 | Sollecito interlocutorio al destinatario diretto |
| 15 | Sollecito formale, con richiamo alla comunicazione originale e alla sua data |
| 30 | Escalation alla figura sovraordinata, citando l'anzianità della pendenza |

Quando una segnalazione formale contiene un termine auto-imposto, il
termine va a scadenzario: un termine scaduto senza sollecito indebolisce
la segnalazione che doveva proteggere.

## 5. Pattern di tutela — sempre applicati

1. Le tre categorie su ogni output (§ 1).
2. Formula protettiva: «rilevazione fisica/operativa soggetta a
   validazione tecnica» — mai giudizi di merito tecnico-normativo.
3. Rimessione nominale, mai generica.
4. BCC di archivio su ogni comunicazione rilevante, verso una casella
   **di proprietà del prestatore**.
5. Una sola citazione per fonte interna quando si riassume la mail di
   un terzo: parafrasare, non incollare blocchi interi.
6. Copia personale timestampata di ogni documento commentato, prima
   dell'invio.
7. Limitarsi ai fatti operativi quando la comunicazione tocca rapporti
   di lavoro interni alla committenza: niente giudizi di merito sulle
   persone.
8. Mail di riepilogo dopo ogni riunione, telefonata o sopralluogo: una
   direttiva verbale non tracciata non è mai esistita.

## 6. Registro vulnerabilità

Separato dal Registro Allert, con la stessa disciplina: voce, priorità
(alta / media / bassa), stato, azione. Le vulnerabilità non riguardano
l'opera ma l'infrastruttura del presidio — la casella di posta, la
firma, la copertura assicurativa, la tracciabilità delle fonti.

Il criterio: **un fascicolo perfetto nei contenuti non regge se il
canale, la copertura e l'archivio sottostanti sono fragili.** A ogni
sessione si riportano le priorità alte ancora aperte, in testa, prima
di qualunque altra cosa.

## 7. Indicatori per cruscotto-mensile

`cruscotto-mensile` interroga questa skill per quattro valori:

| Indicatore | Definizione |
|---|---|
| % riunioni 2514RW coperte da AT | Riunioni di commessa presidiate, su riunioni tenute |
| Completezza SAL consolidato | WP presenti nel consolidato, su 4 |
| NC su WP2-4 comunicate da AT | Non conformità segnalate dal PM rappresentativo invece che dal PM del WP di competenza |
| Gap evitato | Metrica **qualitativa**: riunioni che sarebbero rimaste scoperte, SAL non consolidati, NC mal gestite |

Il «gap evitato» appartiene alla metrica *rischio intercettato*, non a
*tempo risparmiato*: conta controlli che senza presidio non
avverrebbero, non ore sottratte a un lavoro manuale. Le due non si
sommano mai.

> **Da confermare — chi è «AT».** La sigla non è sciolta in nessun
> documento. L'ipotesi fondata è **Andrea Turcato**, PM di commessa di
> WP1 FOH e WP4 SCALA B: sarebbe lui il PM che di fatto rappresenta la
> committenza anche sui WP che non sono i suoi, ed è esattamente ciò
> che i tre indicatori misurano. Finché non è confermato, gli
> indicatori vanno prodotti dichiarando l'assunzione.

## 8. Confini con le altre skill

- **Mappatura dei processi da automatizzare** → `mappa-tesoro`, invariata.
- **Scrittura o modifica di una skill** → `skill-creator`, invariata.
- **Decisioni e pendenze del tavolo DL** → `preparazione-riunione-dl`.
  Lì si tracciano le decisioni della committenza; qui le comunicazioni
  con cui il prestatore si tutela.
- **Revisioni su progetto approvato** → `registro-instabilita-progettuale`.
- **Difetti di montaggio** → `gestione-non-conformita`.
- **Diario di cantiere** → `coordinamento-giornaliero-gc`.

Una stessa giornata può alimentare più registri: un difetto va nelle NC,
la mail con cui lo rimetti a chi di competenza va nel Registro Allert.
Sono due tracce diverse dello stesso fatto, e servono a due scopi diversi.

## 9. Provenienza

Definizione precedente — un agente di mappatura processi — recuperata da
Google Drive e conservata in
`references/definizione-recuperata-process-i.md`. Sostituita il
21.09.2026 perché duplicava `mappa-tesoro` e `skill-creator` e non
produceva nulla di ciò che `cruscotto-mensile` le chiede. Il nome della
skill è rimasto invariato per non rompere quel riferimento.
