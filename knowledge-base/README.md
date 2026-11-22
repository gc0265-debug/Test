# Knowledge base di commessa — Field Project SAS

Base di conoscenza in Markdown, pensata per essere letta da una persona e da
un agente (modello "light RAG": indici in Markdown, un file per argomento,
intestazioni coerenti). Ogni commessa ha una cartella propria; oggi c'è solo
`2514RW/`.

> **Stato: struttura e template.** I file contengono solo segnaposto
> (`[DA COMPILARE]`, `TBD`). Nessun dato di commessa è stato inserito. Le
> righe marcate `ESEMPIO FITTIZIO` servono solo a mostrare il formato e vanno
> cancellate al primo inserimento reale.

## Principio: la KB indicizza, non sostituisce

La knowledge base **non è la fonte dei dati**. Ogni dato ha già un
proprietario e una piattaforma:

| Dato | Proprietario | Dove vive l'originale |
|---|---|---|
| Cronoprogramma | PM GILI | Piattaforma GILI → monitorato in Excel e QuickPlanX |
| Giornale, NC, RFI, verbali, FYI | Direttore di Cantiere | Insite Teams, progetto "RSW - Hotel ROMA" |
| Shop drawing approvati | Fornitori / GILI, approvazione DLL | [DA COMPILARE: repository disegni] |
| Contabilità, libretto misure, SAL | GILI | [DA COMPILARE: archivio GILI] |
| Documenti di sicurezza (POS, ecc.) | Imprese esecutrici | Inoltro GILI → Progesim / SAC |

La KB tiene, per ciascun dato, il **riferimento** all'originale (ID Insite,
codice tavola e revisione, data di condivisione) e l'**esito della verifica**
svolta dal Direttore di Cantiere. Se un dato in KB e l'originale divergono,
fa fede l'originale e la KB va riallineata.

## Perimetro che i template riflettono

Il Direttore di Cantiere opera per lettera di incarico GILI come consulente
esterno: **verifica e monitora**. Per questo:

- i template di cantiere registrano verifiche (area pronta, corrispondenza
  agli shop drawing approvati dalla DLL, qualità), non ordini alle squadre;
- i template di contabilità registrano il **riscontro** fra quanto verificato
  in campo e quanto GILI dichiara; il libretto delle misure e il SAL restano
  di GILI;
- i template di sicurezza servono solo a verificare la **completezza** dei
  documenti dei subappaltatori prima che GILI li inoltri a Progesim / SAC; non
  producono né validano documenti;
- ogni comunicazione esterna è una bozza per GILI, che la invia a nome proprio.

## Convenzioni

### Terminologia obbligatoria

| Usa | Non usare mai |
|---|---|
| Direttore di Cantiere | Site Manager |
| DLL (Direzione Lavori, Jacobs) | DL per la Direzione Lavori |
| DL = Datore di Lavoro (solo in ambito sicurezza) | — |
| Luca Cristofari, preposto GILI | "Ing." Cristofari |
| WP1 FOH, WP2 CORRIDOI, WP3 SUITE, WP4 SCALA B, WP5 20 ROOM (sotto-voce Variante Room) | FF&E, millwork, boiserie come WP o categorie |

### Intestazione di ogni file

Ogni file inizia con un blocco YAML che permette a un agente di filtrare
senza leggere tutto:

```yaml
---
tipo: indice | registro | scheda | template | checklist
commessa: 2514RW
wp: WP1 FOH | WP2 CORRIDOI | WP3 SUITE | WP4 SCALA B | WP5 20 ROOM | trasversale
fonte: dove vive il dato originale
aggiornato: AAAA-MM-GG
stato_documento: bozza | in revisione | condiviso
---
```

`stato_documento: condiviso` si imposta solo dopo la revisione personale del
Direttore di Cantiere: ogni contenuto prodotto con l'IA nasce `bozza`.

### Codici

| Oggetto | Formato | Allineato a |
|---|---|---|
| Non conformità | `NC-2514RW-NNN-AAAA` | skill `gestione-non-conformita` |
| Variante | `VAR-2514RW-NNN-AAAA` | skill `project-controller` |
| Ambiente | `[WP]-[codice locale]`, es. `WP3-[locale]` | da definire con l'utente |
| Campionatura | `CAM-2514RW-NNN` | nuovo, da confermare |
| Shop drawing | codice e revisione del fornitore, invariati | — |

### File che iniziano con `_`

Sono template: si copiano e si rinominano, non si compilano direttamente.

## Rapporto con le skill del repository

| Cartella KB | Skill che la alimenta o la legge |
|---|---|
| `cronoprogramma/` | `project-controller`, `reportistica-brandizzata` |
| `punchlist/` (NC) | `gestione-non-conformita` |
| `contabilita/` | `sal-controller` (lato GILI), `project-controller` (varianti) |
| `sicurezza/` | `verifica-pos-cse` |
| `disegni/` | `drawing-pack-qa`, `drawing-takeoff` (PR #3, non ancora unita) |

Le schede degli agenti che lavorano sopra questa struttura sono in `agenti/`.
