# Quadro di Comando — Field Project

Portale di controllo dell'intero sistema Field Project SAS: un'unica pagina che
raccoglie tutte le skill di processo e i moduli applicativi del Board di cantiere.

## Contenuto

Due pagine autonome (nessuna dipendenza, nessun build step): si aprono nel browser
o si pubblicano come artifact, e si rimandano a vicenda.

- `quadro-comando.html` — il catalogo: ogni skill e ogni modulo del Board come
  pulsante, con filtro per area e ricerca.
- `guida-operativa.html` — il metodo: come si usa il sistema, in che ordine e con
  quali soglie. Segue l'identita' visiva Field Project SAS (nero `#1A1A1A`,
  rosso `#C0332B`, Montserrat, linee sottili) come da
  `reportistica-brandizzata/references/brand-identity.md`.

### Quadro di Comando

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

## Guida operativa

Otto sezioni: impianto del sistema, come si lancia una skill, il ciclo di vita
della commessa in otto passaggi con i cinque gate, le routine per cadenza, gli
alberi di decisione fra skill che si somigliano, le soglie operative (SLA delle
NC, priorita' snag, semaforo handover, validita' DURC, preavvisi), gli errori
ricorrenti e cosa fare quando nessuna skill copre il processo.

I parametri citati sono estratti dalle skill stesse, non inventati: quando una
skill cambia soglia, la guida va riallineata.

### Versione Word

`Guida_Operativa_Sistema_Field_Project.docx` — stessa guida in formato Word,
con copertina, indice, tabelle e pie' di pagina numerato, da stampare o
consegnare a chi entra in commessa.

Si rigenera con lo script che la produce:

```bash
npm install docx
node genera-guida-docx.js .        # scrive il .docx nella cartella indicata
```

Lo script tiene i colori del brand in testa al file (`NERO`, `ROSSO`, `FONT`):
quando cambia il contenuto della guida HTML, va aggiornato anche li' e rilanciato.

## Manutenzione

Nel Quadro di Comando i dati sono in un unico array `GROUPS` in fondo al file:
per aggiungere una skill basta inserire un oggetto nel gruppo corrispondente.
Filtri, ricerca, conteggi di testata e schede di dettaglio si aggiornano da soli.

La guida e' testo statico: le sezioni sono `<section id="sN">` e l'indice laterale
si genera dall'array `titles` in fondo al file.

La pagina rispetta il tema chiaro/scuro del dispositivo, funziona a larghezza
telefono e non richiede connessione se non per i font.
