# Formato dei file — drawing-takeoff

## boq.csv (input di genera_boq.py)

Una riga per **codice × zona**. Separatore virgola, UTF-8, intestazione obbligatoria.

| Colonna | Contenuto | Esempio |
|---|---|---|
| codice | codice articolo come in tavola/legenda | `F6` |
| descrizione | dalla legenda o abaco, citato | `Plinto 120×120` |
| zona | stanza, WP o blocco (stesso nome di zone.json) | `WP3 SUITE - 301` |
| qta_primaria | numero, oppure `TBD` | `4` |
| um_primaria | unità della primaria | `pz` |
| formula_secondaria | espressione con `{P}` al posto della primaria; vuota se non serve | `{P}*1.2*1.2*0.6` |
| um_secondaria | unità della secondaria | `m³` |
| confidenza | `High`, `Medium` o `Low` | `High` |
| tavola | codice tavola e revisione | `S-101 Rev.C` |
| pagina | pagina del PDF | `3` |
| note | origine dei parametri della formula | `h plinto 0,60 da sezione S-201 p.2` |

La confidenza della riga è quella della **quantità primaria**; il livello della
secondaria si dichiara in nota se è più basso (es. parametro dato a voce).

## incertezze.csv (registro incertezze)

`id, tavola, pagina, zona, codice, descrizione, impatto, azione, stato`

- **impatto**: cosa cambia se il dubbio si risolve in un senso o nell'altro (es. "±2 pz", "volume non calcolabile").
- **azione**: RFI alla DLL, chiarimento al progettista, misura in sito, conferma dell'utente.
- **stato**: `Aperta` finché il QS non firma.

## zone.json (input di estrai_tag.py e marca_tavola.py)

```json
[
  {"pagina": 1, "zona": "WP3 SUITE - 301", "rect": [120, 80, 410, 300]},
  {"pagina": 1, "zona": "ESCLUDI cartiglio", "rect": [900, 700, 1190, 840]}
]
```

Coordinate in punti PDF, origine in alto a sinistra. Per ricavarle: apri la
pagina con PyMuPDF (`page.rect` dà le dimensioni) oppure leggi le coordinate
dei nomi locali con `page.get_text("words")` e costruisci i rettangoli attorno.
Le zone non devono sovrapporsi: lo script segnala ogni occorrenza contesa.
Se la pagina ha una rotazione (`page.rotation` ≠ 0) le coordinate di PyMuPDF
sono quelle della pagina non ruotata: ricava le zone con `get_text("words")`
sulla stessa pagina, non misurandole sull'immagine a schermo.

## BOQ.xlsx (output)

- **BOQ**: le colonne di boq.csv; la quantità secondaria è formula nativa
  (`=D5*1.2*1.2*0.6`), la colonna Confidenza è colorata (verde/giallo/rosso).
- **Riepilogo per codice**: `SUMIF` per codice, righe Low e TBD contate.
- **Registro incertezze QS**: le voci di incertezze.csv con colonne vuote per
  esito, firma e data del QS.
