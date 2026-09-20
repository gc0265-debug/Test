# Quadro di Comando — Field Project

Portale di controllo dell'intero sistema Field Project SAS: un'unica pagina che
raccoglie tutte le skill di processo e i moduli applicativi del Board di cantiere.

## Contenuto

`quadro-comando.html` — pagina autonoma (nessuna dipendenza da installare, nessun
build step). Si apre direttamente nel browser oppure si pubblica come artifact.

Per ogni comando la scheda riporta:

- **cosa fa** — la descrizione operativa del processo;
- **quando si attiva** — gli inneschi reali in commessa;
- **cosa produce** — i deliverable con il nome file effettivo;
- **non usare per** — i confini rispetto alle skill adiacenti, per evitare
  sovrapposizioni (es. avanzamento fisico vs contabilità SAL);
- **a monte / a valle** — la catena di dipendenze fra skill, navigabile;
- **frase per lanciarlo** — il comando da copiare e incollare.

## Aree

| Area | Contenuto |
| --- | --- |
| 01 Apertura & Progettazione | front-end-planning, scope-wbs, shop drawing, handover, piano di cantiere |
| Sicurezza (D.Lgs. 81/2008) | onboarding cantiere, verifica POS, scadenzario certificazioni, presidio continuo |
| 02 Esecuzione in cantiere | diario giornaliero, logistica e collaudo, non conformità, instabilità progettuale |
| 03 Controllo & Contabilità | avanzamento fisico, SAL, stima tempi |
| 04 Reporting & Governance | reportistica, riunione DL, cruscotto mensile, storico fornitori |
| Contratti & fornitori | audit contratti di montaggio, review contratti |
| Amministrazione FP SAS | pacchetto commercialista, nota trasferte |
| Board di cantiere | i 7 moduli applicativi di questo repository |
| Strumenti trasversali | generazione file, identità visiva, creazione skill |

## Manutenzione

I dati sono in un unico array `GROUPS` in fondo al file: per aggiungere una skill
basta inserire un oggetto nel gruppo corrispondente. Filtri, ricerca, conteggi di
testata e schede di dettaglio si aggiornano da soli.

La pagina rispetta il tema chiaro/scuro del dispositivo, funziona a larghezza
telefono e non richiede connessione se non per i font.
