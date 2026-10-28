---
name: reportistica-brandizzata
description: >
  Genera la reportistica periodica di cantiere in formato Field Project SAS
  (montaggi arredi su misura hotel/ville/retail) in due output: il report
  settimanale Word/PDF per DLL e GC, e il report consolidato settimanale per
  l'Advisor GILI, che riconcilia tre input (dati di campo DdC/preposto, input
  strutturato del PM, dati app di cantiere) in un quadro unico prima della
  riunione di coordinamento, con avanzamento per WP, nodi bloccanti, verifica
  milestone e discrepanze tra fonti. Usala per: report settimanale,
  aggiornamento DLL/GC, consolidato Advisor, riunione di coordinamento
  settimanale, allineamento dati campo-PM, quadro unico commessa, input PM.
  Applica sempre l'identità visiva Field Project SAS. Non per la singola
  notifica di una NC o di un problema di sicurezza: questa skill le aggrega
  nel periodico.
---

# Reportistica Brandizzata — Report Periodici di Cantiere

## Regole che non si rompono

- Ogni documento ha il periodo di riferimento esplicito, mai "aggiornamento
  attuale".
- Nessuna sezione vuota visibile: se un dato manca, la sezione si omette.
- Le discrepanze tra fonti si espongono con entrambe le versioni, non si
  risolvono d'ufficio: la sintesi unilaterale toglie fiducia a uno dei due
  contributori.
- I report sono bozze che l'utente rivede prima della condivisione: in Claude
  Code, l'hook di conferma invio (se installato) chiede conferma prima di
  qualsiasi strumento di invio.

## Il bivio

- **Report DLL/GC** (documento formale verso l'esterno) → sezione A.
- **Consolidato Advisor** (documento riservato GILI/Field Project, pre-riunione)
  → sezione B. Servono almeno due dei tre input; con uno solo produci il
  report DLL/GC e segnala l'input mancante.

Prima di generare un documento leggi `references/brand-identity.md`.

## Lista da copiare nella risposta e spuntare

```
- [ ] 1. Output scelto (A o B) e periodo di riferimento
- [ ] 2. Dati raccolti dalle fonti disponibili (e fonti mancanti annotate)
- [ ] 3. (solo B) Riconciliazione fatta: allineati / DA ALLINEARE / solo in una fonte
- [ ] 4. Documento generato con layout e brand
- [ ] 5. Rendering controllato (PDF → immagini)
- [ ] 6. Controllo finale superato
```

---

## A. Report DLL/GC (Word/PDF settimanale)

### Aggregazione dati

Raccogli, quando disponibili nella conversazione o forniti dall'utente:
- **Avanzamento fisico** (logica `project-controller`): % per WP, delta vs
  programma
- **Non conformità** (logica `gestione-non-conformita`): NC aperte/chiuse nel
  periodo, critiche/scadute, % chiuse entro SLA
- **Sicurezza squadre** (logica `cantiere-sicurezza-onboarding`): stato
  squadre attive, criticità documentali aperte

Le **varianti** entrano solo se l'utente lo chiede per questo invio.

### Struttura del documento

1. **Header brand**: logo, nome cantiere, cliente, periodo, data emissione
2. **Executive summary**: 1 paragrafo, stato generale e criticità
3. **Avanzamento fisico**: tabella % per WP (WP1 FOH, WP2 CORRIDOI, WP3 SUITE,
   WP4 SCALA B, WP5 20 ROOM), delta vs programma
4. **Non conformità**: riepilogo numerico + tabella critiche/scadute
5. **Sicurezza**: solo se ci sono criticità o variazioni nel periodo;
   se tutto è 🟢 basta una riga
6. **Prossimi 7 giorni**: attività pianificate, rischi

Layout dettagliato in `references/template-report-dlgc.md`.

### Generazione tecnica

Genera il .docx seguendo le convenzioni della skill `docx` (docx-js, immagini,
tabelle, verifica visiva). Palette e stile da `references/brand-identity.md`,
logo `assets/logo-field-project.png` nell'header.

---

## B. Report Consolidato Advisor (settimanale, pre-riunione)

### Scopo

L'Advisor GILI (Ing. Michaelides) prepara la riunione di coordinamento
settimanale (DLL + committente + GC) e le scritture formali a tutela
contrattuale. Il quadro deve arrivargli già consolidato e riconciliato.

### I tre input

| Input | Fonte | Forma attesa |
|---|---|---|
| **Campo** | DdC + preposto | Giornale di cantiere, stato zone/WP, nodi rilevati sul posto |
| **PM** | Template strutturato | WP, tema, stato, azione richiesta, scadenza (da `assets/Input_PM_Settimanale.xlsx`) |
| **App di cantiere** | Export/riepilogo liste | Avanzamento liste per WP/zona, presenze, foto milestone |

Se disponibile, integra l'estratto del registro instabilità progettuale
(skill `registro-instabilita-progettuale`): episodi della settimana e
contatori cumulativi.

### Riconciliazione

Prima di comporre il report, incrocia gli input e segnala:
- **Discrepanze**: stesso tema con stati diversi tra campo e PM → riga
  "DA ALLINEARE" con entrambe le versioni e le fonti
- **Buchi**: temi presenti in un solo input che dovrebbero avere riscontro
  nell'altro
- **Novità non comunicate**: elementi del campo assenti dal flusso PM e
  viceversa

### Struttura del report

1. Header brand + commessa + settimana di riferimento
2. Quadro avanzamento per WP: stato sintetico, delta vs programma
3. Criticità e nodi bloccanti: responsabile atteso e giorni di anzianità
4. Verifica milestone: raggiunte / a rischio / mancate, causa sintetica
5. Instabilità progettuale (se disponibile)
6. Riconciliazione: righe DA ALLINEARE (se nessuna, una riga di conferma)
7. Decisioni richieste in riunione, formulate come domande chiuse

Word brandizzato, 2-3 pagine massimo. Dettagli in
`references/consolidatore-advisor.md`.

### Flusso settimanale consigliato

1. Entro il giorno prima della riunione: il PM invia il template compilato; il
   DdC fornisce sintesi campo e dati app
2. Generazione consolidato + riconciliazione
3. Revisione rapida a due (DdC + PM) solo sulle righe DA ALLINEARE
4. Invio all'Advisor con anticipo sufficiente per le scritture

---

## Controllo finale

- [ ] Periodo di riferimento e data emissione presenti
- [ ] Nessun placeholder visibile ("[...]", "TBD", "n.d.") nel documento
      → se c'è, togli la sezione o chiedi il dato
- [ ] Nomi WP ufficiali (WP1 FOH ... WP5 20 ROOM); "DLL" per la Direzione
      Lavori, mai "DL"
- [ ] (A) Varianti assenti, salvo richiesta per questo invio
- [ ] (B) Ogni discrepanza mostra entrambe le versioni con la fonte
- [ ] (B) Piè di pagina "Documento riservato GILI / Field Project SAS — non
      distribuire senza vaglio Advisor"
- [ ] Rendering controllato: logo, colori, tabelle leggibili

Se un controllo non passa, torna al passo corrispondente della lista
(dati → 2, riconciliazione → 3, documento → 4), correggi e ricontrolla.
Finisci solo quando tutti i controlli passano. Se un report sbaglia per un
motivo che questa lista non prevede, proponi all'utente una regola nuova.

## Esempio

Richiesta: "Prepara il consolidato per la riunione di giovedì: ti incollo il
giornale di cantiere e l'input PM."
Risultato atteso: documento B con 2 input (app di cantiere segnalata come
mancante nella sezione riconciliazione); riga DA ALLINEARE per "Approvazione
SD banco reception" (campo: "bloccato in attesa DLL"; PM: "risolto, email del
14/10"); tabella "Decisioni richieste" con domande chiuse, destinatario e
scadenza.

## Serve

- `npm install -g docx` (generazione .docx con docx-js, come da skill `docx`)
- LibreOffice (`soffice`) e `pdftoppm` (poppler) per convertire in PDF e
  controllare il rendering
