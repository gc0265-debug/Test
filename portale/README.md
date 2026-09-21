# Quadro di Comando — Field Project

Portale di controllo dell'intero sistema Field Project SAS: un'unica pagina che
raccoglie tutte le skill di processo e i moduli applicativi del Board di cantiere.

## Contenuto

Due pagine autonome (nessuna dipendenza, nessun build step): si aprono nel browser
o si pubblicano come artifact, e si rimandano a vicenda.

- `quadro-comando.html` — il catalogo: ogni skill e ogni modulo del Board come
  pulsante, con filtro per area e ricerca.
- `guida-operativa.html` — il metodo: come si usa il sistema, in che ordine e con
  quali soglie.

Entrambe seguono l'identita' visiva Field Project SAS — nero `#1A1A1A`, rosso
`#C0332B`, Montserrat, filetti sottili al posto di riquadri pieni, molto spazio
bianco — come da `reportistica-brandizzata/references/brand-identity.md`. Nel
Quadro di Comando il filetto rosso a sinistra di una scheda segnala le fasi in
sequenza; quello grigio i presidi trasversali.

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

### Schemi

Tre diagrammi SVG inline nella guida HTML, riesportati in `img/*.png` per la
versione Word:

| # | Schema | Mostra |
| --- | --- | --- |
| 1 | Chi alimenta chi | quali registri leggono il report settimanale e il cruscotto, e le due fonti esterne che il consolidato riconcilia |
| 2 | I cinque gate | le otto fasi su due righe e i punti in cui il passaggio e' sbarrato |
| 3 | Dove finisce una modifica | il design freeze come spartiacque fra change order, instabilita' progettuale, variante e SAL |

Gli SVG sono la fonte: i PNG si rigenerano da li' (Chromium headless, larghezza
doppia del viewBox, ritaglio al contenuto). Se cambi uno schema, riesporta il
PNG corrispondente prima di rigenerare il Word.

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

## Discordanze note

- `cruscotto-mensile` aggregava da `pm-rappresentativo-gili-2514rw`, che non
  risultava installata. **Risolto**: definizione recuperata da Google Drive,
  la skill e' ora in `skills/pm-rappresentativo-gili-2514rw/`. La definizione
  recuperata descriveva un agente di mappatura processi, che duplicava
  `mappa-tesoro` e `skill-creator`: su decisione dell'utente quelle due
  restano invariate e la skill e' stata ri-mirata sul **presidio** — Registro
  Allert, perimetro di competenza, pattern di tutela — che nessuna delle 41
  skill copriva. Il nome e' rimasto invariato per non rompere il riferimento
  del cruscotto. Resta da confermare a chi corrisponde la sigla «AT» negli
  indicatori (ipotesi: Andrea Turcato, PM di WP1 e WP4).
  La skill non copia dati identificativi, compensi o vulnerabilita': rimanda
  al fascicolo `Presidio_GC` e al `Registro_Allert`, che restano fuori dal
  repository.
- `brand-guidelines` applica il brand Anthropic, non Field Project SAS.
  L'identita' FP vive in `reportistica-brandizzata/references/brand-identity.md`.
- L'«app di cantiere» che il consolidato settimanale riconcilia e' InSite
  (cfr. `Ponte_InSite_SAL_2514RW.xlsx`), non il Board di questo repository.

## Manutenzione

Nel Quadro di Comando i dati sono in un unico array `GROUPS` in fondo al file:
per aggiungere una skill basta inserire un oggetto nel gruppo corrispondente.
Filtri, ricerca, conteggi di testata e schede di dettaglio si aggiornano da soli.

La guida e' testo statico: le sezioni sono `<section id="sN">` e l'indice laterale
si genera dall'array `titles` in fondo al file.

La pagina rispetta il tema chiaro/scuro del dispositivo, funziona a larghezza
telefono e non richiede connessione se non per i font.
