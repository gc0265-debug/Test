---
tipo: indice
commessa: 2514RW
wp: trasversale
fonte: elenco locali da progetto; verifiche del Direttore di Cantiere
aggiornato: AAAA-MM-GG
stato_documento: bozza
---

# Ambienti

Una cartella per WP, una scheda per ambiente. L'elenco dei locali di ogni WP
non è ancora definito: lo comunica l'utente, non va dedotto.

| WP | Indice | N. ambienti |
|---|---|---|
| WP1 FOH | `WP1-FOH/index.md` | TBD |
| WP2 CORRIDOI | `WP2-CORRIDOI/index.md` | TBD |
| WP3 SUITE | `WP3-SUITE/index.md` | TBD |
| WP4 SCALA B | `WP4-SCALA-B/index.md` | TBD |
| WP5 20 ROOM | `WP5-20-ROOM/index.md` | TBD |
| WP5 20 ROOM · Variante Room | `WP5-20-ROOM/variante-room/index.md` | TBD |

## Come si aggiunge un ambiente

1. Copia `_template-scheda-ambiente.md` nella cartella del WP.
2. Rinominalo con il codice ambiente, es. `WP3-[locale].md`.
3. Aggiungi la riga nell'`index.md` del WP.

## Stati dell'ambiente

Lo stato descrive **cosa ha verificato** il Direttore di Cantiere, non cosa ha
fatto la squadra.

| Stato | Significato |
|---|---|
| Non verificato | Nessun sopralluogo registrato |
| Area non pronta | Sopralluogo fatto, uno o più requisiti non soddisfatti |
| Area pronta | Tutti i requisiti verificati e documentati |
| Montaggio in corso | Montaggio avviato, verifiche di corrispondenza in corso |
| Montaggio verificato | Corrispondenza agli shop drawing approvati verificata, senza NC aperte |
| Verificato con NC | Montaggio completato con NC aperte (vedi `punchlist/registro-nc.md`) |
| Pronto per pre-collaudo | Nessuna NC aperta, punch list da avviare |
