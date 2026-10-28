---
name: gestione-non-conformita
description: >
  Gestisce apertura, monitoraggio, proposta di escalation e chiusura delle non
  conformità (difetti di montaggio, materiali danneggiati, scostamenti da
  shop drawing approvati o capitolato) nei cantieri di arredamento contract su
  misura. Assegna SLA per gravità, traccia stato e ritardi, prepara per GILI le
  bozze di comunicazione verso fornitori e, quando serve, verso SAC/DLL. Usala
  per: non conformità, NC, difetto montaggio, materiale danneggiato, scostamento
  da shop drawing, sollecito fornitore, verifica chiusura NC, SLA risoluzione, o
  quando l'utente carica foto o elenchi di problemi rilevati in cantiere. Non per
  la snag list di collaudo (logistica-e-collaudo), le varianti
  (project-controller) o l'audit dei contratti (auditing-contratti-montaggio).
---

# Gestione Non Conformità — Apertura, Monitoraggio, Chiusura

## Regole che non si rompono

- **Tutte le comunicazioni passano da GILI.** I fornitori del montaggio sono
  contrattualizzati da GILI: Field Project SAS prepara le bozze, GILI (Luca
  Cristofari, preposto, o Marco Gili) le invia al fornitore e decide l'escalation
  verso SAC e DLL. Nessuna bozza va indirizzata o firmata come se partisse da
  Field Project. In Claude Code, l'hook di conferma invio (se installato) chiede conferma
  prima di qualsiasi strumento di invio.
- **Nessuna gravità di default.** Se l'utente non la indica, chiedila: cambia
  SLA e destinatari.
- **Nessuna chiusura senza verifica visiva** del DdC: la dichiarazione del
  fornitore non basta.

## Il bivio

- **NC nuova** → passi 1, 2, poi 3-5 negli aggiornamenti successivi.
- **Aggiornamento di NC esistenti** (nuovo stato, foto post-intervento,
  richiesta del report) → chiedi o recupera il registro, poi passi 3-5.

## Gravità e SLA

| Gravità | Definizione | SLA risoluzione | Destinatari della bozza |
|---|---|---|---|
| 🔴 **Critica** | Blocca lavorazioni successive, impatto sicurezza, o visibile su spazi a vista in aree chiave | 24h | Fornitore, con proposta a GILI di informare subito SAC/DLL |
| 🟠 **Normale** | Scostamento da shop drawing/capitolato, impatta qualità o programma ma non blocca | 72h | Fornitore; proposta di escalation solo se scade lo SLA |
| 🟡 **Lieve** | Difetto estetico minore, non impatta programma | 7 giorni | Fornitore |

## Lista da copiare nella risposta e spuntare

```
- [ ] 1. NC registrata con tutti i campi e scadenza SLA calcolata
- [ ] 2. Bozza al fornitore preparata per GILI
- [ ] 3. Stato e ritardo aggiornati
- [ ] 4. Proposta di escalation a GILI (se critica o scaduta)
- [ ] 5. Chiusura solo dopo verifica visiva del DdC
- [ ] 6. Controllo finale superato
```

## Passo 1 — Apertura NC

Registra: data/ora rilevazione; cantiere; WP/area (WP1 FOH, WP2 CORRIDOI, WP3
SUITE, WP4 SCALA B, WP5 20 ROOM); descrizione + foto; riferimento allo shop
drawing approvato dalla DLL se lo scostamento è da disegno; fornitore/squadra
responsabile; gravità → scadenza SLA; codice `NC-[CODICE CANTIERE]-[PROGRESSIVO]-[ANNO]`.

## Passo 2 — Bozza al fornitore

Prepara la bozza con `references/template-comunicazioni-nc.md`, intestata a
GILI. Per le 🔴 critiche aggiungi nel messaggio all'utente la proposta: "GILI
valuti di informare subito SAC/DLL" e prepara anche quella bozza.

## Passo 3 — Monitoraggio

Stati: **Aperta** → **In lavorazione** (il fornitore ha confermato la presa in
carico) → **Verificata** (verifica visiva del DdC fatta, in attesa chiusura
formale) → **Chiusa**.

Stato di ritardo a ogni aggiornamento:
- **In termine**: entro lo SLA
- **In scadenza**: meno del 20% dello SLA rimanente (<5h critica, <14h normale, <34h lieve)
- **Scaduta**: SLA superato senza chiusura

## Passo 4 — Proposta di escalation

Quando una NC diventa **Scaduta**, non aspettare che l'utente lo chieda: segnalalo
e prepara per GILI la bozza di escalation verso SAC/DLL. Per le 🟠/🟡 il ritardo
stesso è il motivo dell'escalation; per le 🔴 la bozza ha priorità massima.
Decide GILI se e quando inviarla.

## Passo 5 — Chiusura

Registra data della verifica visiva, esito (conforme / richiede ulteriore
intervento → la NC torna Aperta con nuova scadenza) ed eventuale foto
post-intervento.

## Output

**Registro NC (Excel, openpyxl):** una riga per NC con tutti i campi, stato,
giorni allo SLA o di ritardo; formattazione condizionale verde/giallo/rosso sul
ritardo, come in `cantiere-sicurezza-onboarding`.

**Report settimanale NC (per GILI, che decide l'inoltro a SAC/DLL):** vedi
`references/template-report-nc.md`.

**Bozze di comunicazione:** vedi `references/template-comunicazioni-nc.md`.

## Passo 6 — Controllo finale

- [ ] Ogni NC ha gravità confermata, codice, WP con nome ufficiale, scadenza SLA
- [ ] Le date di scadenza sono calcolate dalla data/ora di rilevazione
- [ ] Le NC scadute compaiono nel report e hanno una bozza di escalation
- [ ] Nessuna NC chiusa senza data di verifica visiva
- [ ] Le bozze sono intestate e firmate GILI, nessuna risulta già inviata
- [ ] "DLL" per la Direzione Lavori, mai "DL"

Se un controllo non passa, torna al passo corrispondente (campi → 1, bozze → 2
o 4, stati → 3, chiusure → 5), correggi e ricontrolla. Finisci solo quando
tutti i controlli passano. Se una NC sbaglia in un modo che questa lista non
prevede, proponi all'utente una regola nuova.

## Esempi

**Richiesta:** "Suite 412, anta armadio graffiata in fase di montaggio, fornitore
Rossi Montaggi, lieve. Foto IMG_0412."
**Risultato:** NC-2514RW-018-2026, WP3 SUITE, 🟡 Lieve, scadenza +7 giorni dalla
rilevazione; bozza al fornitore intestata GILI; nessuna escalation.

**Richiesta:** "La NC-2514RW-011 sul banco reception è ancora aperta, era normale."
**Risultato:** stato Scaduta (es. +2 giorni oltre le 72h); segnalazione
all'utente; bozza di escalation verso SAC/DLL preparata per GILI, che decide l'invio.

## Serve

- `pip install openpyxl` (registro NC)

## Errori da evitare

- **Non nascondere le NC scadute**, anche se lievi: un pattern di lievi scadute
  dice molto del fornitore (utile per `storico-performance-fornitori`).
- **Non confondere NC e variante**: la NC si corregge senza costi aggiuntivi
  (salvo accordi diversi); se un fornitore prova a trasformarla in extra,
  segnalalo esplicitamente.
