---
tipo: indice
commessa: 2514RW
wp: trasversale
fonte: lettera di incarico GILI; dati da compilare dal Direttore di Cantiere
aggiornato: AAAA-MM-GG
stato_documento: bozza
---

# 2514RW — Hotel Rosewood Roma · Mappa della commessa

Punto di ingresso della knowledge base. Un agente legge prima questo file,
poi apre solo la cartella che serve.

## Anagrafica

| Campo | Valore |
|---|---|
| Codice commessa | 2514RW |
| Opera | Hotel Rosewood Roma |
| Indirizzo cantiere | [DA COMPILARE] |
| Cliente di Field Project SAS | GILI Creations Srl |
| Ruolo Field Project SAS | Direttore di Cantiere, per lettera di incarico GILI |
| Data lettera di incarico | [DA COMPILARE] |
| Piattaforma documentale | Insite Teams, progetto "RSW - Hotel ROMA" |

## Catena contrattuale

```
Colliers (committente)
  └── ATI: SAC S.p.A. (GC), EGi, MIT
        └── GILI Creations Srl (subappaltatore di SAC)
              └── Fornitori del montaggio (contrattualizzati da GILI)

Field Project SAS: incarico da GILI per il coordinamento delle attività sul
campo. Non è impresa esecutrice, non è preposto.
```

## Soggetti e riferimenti

| Soggetto | Ruolo | Referente | Contatto |
|---|---|---|---|
| GILI Creations | Riferimento gerarchico | Marco Gili | [DA COMPILARE] |
| GILI Creations | Preposto | Luca Cristofari | [DA COMPILARE] |
| GILI Creations | Advisor | Ing. Michaelides | [DA COMPILARE] |
| GILI Creations | PM (cronoprogramma) | [DA COMPILARE] | [DA COMPILARE] |
| SAC S.p.A. | General Contractor | Bruno Cavallaro | [DA COMPILARE] |
| Progesim / SAC | Ufficio sicurezza del GC | [DA COMPILARE] | [DA COMPILARE] |
| Jacobs | DLL | [DA COMPILARE] | [DA COMPILARE] |
| Fornitori del montaggio | Imprese esecutrici | vedi `sicurezza/registro-verifiche-documentali.md` | — |

## Work Package

| WP | Cartella | Note |
|---|---|---|
| WP1 FOH | `ambienti/WP1-FOH/` | |
| WP2 CORRIDOI | `ambienti/WP2-CORRIDOI/` | |
| WP3 SUITE | `ambienti/WP3-SUITE/` | |
| WP4 SCALA B | `ambienti/WP4-SCALA-B/` | |
| WP5 20 ROOM | `ambienti/WP5-20-ROOM/` | sotto-voce Variante Room in `variante-room/` |

## Milestone principali

Fonte: cronoprogramma dei PM GILI. Dettaglio in `cronoprogramma/milestone.md`.

| Milestone | Data baseline | Data prevista attuale | Stato |
|---|---|---|---|
| [DA COMPILARE] | TBD | TBD | TBD |

## Mappa delle cartelle

| Cartella | Contenuto | Domanda a cui risponde |
|---|---|---|
| `00-commessa/` | Perimetro dell'incarico, glossario | Questo compito è mio? |
| `ambienti/` | Una scheda per ambiente, raggruppate per WP | Questo locale è pronto? Cosa è montato e verificato? |
| `disegni/` | Registro shop drawing e revisioni approvate dalla DLL | Qual è la revisione valida per questa verifica? |
| `materiali/` | Campionature, mock-up room, schede materiale | Questo materiale è approvato per la produzione di serie? |
| `cronoprogramma/` | Milestone, monitoraggio scostamenti, condivisioni con SAC | Siamo in linea? Cosa ho condiviso con SAC e quando? |
| `logistica/` | Monitoraggio consegne e vincoli di accesso | Cosa arriva, quando, e con quali vincoli? |
| `cantiere/` | Indice di verbali, RFI, FYI e verifiche in Insite | Dove trovo la prova di quanto ho rilevato? |
| `punchlist/` | Registro NC, punch list di pre-collaudo, fascicolo finale | Cosa resta aperto prima della consegna? |
| `contabilita/` | Riscontro quantità montate e stato varianti | Quello che GILI dichiara corrisponde a quanto ho verificato? |
| `sicurezza/` | Verifica di completezza dei documenti dei subappaltatori | Il pacchetto è completo prima dell'inoltro a Progesim / SAC? |
