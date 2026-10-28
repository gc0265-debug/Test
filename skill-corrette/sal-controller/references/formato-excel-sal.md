# Formato Excel SAL — specifiche tecniche

Struttura del workbook generato dalla skill `sal-controller`. Generazione con
`openpyxl`. Usa **formule Excel native** (non valori calcolati a monte) così
l'utente può aggiornare quantità/prezzi e vedere ricalcolare tutto.

Lo stile è coerente con `project-controller` (stessa palette GILI) per uniformità
tra i due strumenti. Nomi dei fogli, colonne e formule sono fissi: usali
identici, perché `scripts/verifica_sal.py` e le formule tra fogli li cercano per
nome e lettera di colonna. Colori, larghezze e grafici sono indicativi.

## Indice
1. Regole per le formule con openpyxl
2. Stile GILI standard
3. Foglio 1: "Contabilità SAL"
4. Foglio 2: "Riepilogo economico"
5. Foglio 3: "Libretto misure"
6. Foglio 4: "Registro SAL"
7. Foglio 5: "Riepilogo per WP"
8. Impostazioni di stampa

---

## Regole per le formule con openpyxl

openpyxl scrive le formule così come sono, e Excel le legge in sintassi
inglese:
- nomi di funzione inglesi: `SUM`, `SUMIF`, `SUMIFS`, `IF` (mai `SOMMA`, `SE`)
- separatore di argomenti **virgola** `,` (mai `;`)
- nomi di foglio con spazi o accenti tra apici: `'Libretto misure'!J:J`,
  `'Contabilità SAL'!C:C`
- riferimenti a celle precise, non a nomi simbolici: dove sotto compare
  `J_tot`, sostituiscilo con la cella reale della riga TOTALE (es. `J58`)

---

## Stile GILI standard

```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HEADER_FILL  = PatternFill("solid", fgColor="1F4E79")   # blu scuro
HEADER_FONT  = Font(color="FFFFFF", bold=True, size=11)
SUBHEAD_FILL = PatternFill("solid", fgColor="D6E4F0")   # blu chiaro
TITLE_FONT   = Font(bold=True, size=16, color="1F4E79")
TOTAL_FILL   = PatternFill("solid", fgColor="FFF2CC")   # giallo riga totale
EUR_FMT      = '#,##0.00 "€"'
PCT_FMT      = '0.0%'
DATE_FMT     = 'DD/MM/YYYY'

STATO_RILIEVO_COLORS = {
    "montato":      PatternFill("solid", fgColor="C6EFCE"),  # verde
    "parziale":     PatternFill("solid", fgColor="FFF2CC"),  # giallo
    "da verificare":PatternFill("solid", fgColor="FCE4D6"),  # arancio
    "conteso":      PatternFill("solid", fgColor="FFC7CE"),  # rosso
}
STATO_SAL_COLORS = {
    "Emesso":        PatternFill("solid", fgColor="D6E4F0"),
    "Verificato DLL": PatternFill("solid", fgColor="FFF2CC"),
    "Certificato":   PatternFill("solid", fgColor="C6EFCE"),
    "Pagato":        PatternFill("solid", fgColor="C6EFCE"),
    "Contestato":    PatternFill("solid", fgColor="FFC7CE"),
}
THIN = Side(style="thin")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
```

---

## Foglio 1: "Contabilità SAL"

La contabilità valorizzata, una riga per voce contrattuale, raggruppata per WP.

| Col | Contenuto | Formula |
|---|---|---|
| A | Codice voce | — |
| B | Descrizione | — |
| C | WP | — |
| D | Tipo (a corpo / a misura) | dropdown |
| E | UM | — |
| F | Qtà contrattuale | — |
| G | Prezzo unitario (€) | — |
| H | Importo contrattuale (€) | `=F*G` (a misura) o forfait (a corpo) |
| I | Qtà progr. / % (N) | a misura: `=SUMIFS('Libretto misure'!J:J,'Libretto misure'!G:G,A{r},'Libretto misure'!M:M,"montato")`; a corpo: valutazione |
| J | Importo progressivo (N) (€) | a misura `=I*G`; a corpo `=I*H` |
| K | Importo progressivo (N−1) (€) | da SAL precedente |
| L | Importo SAL corrente (€) | `=J-K` |
| M | % avanzamento voce | `=J/H` |
| N | Note / rif. | — |

- Riga **subtotale per WP** (fill `SUBHEAD_FILL`): somma di H, J, K, L del WP.
- Riga **TOTALE commessa** (fill `TOTAL_FILL`, bold): somma dei subtotali.
- Formattazione condizionale su M: verde >80%, giallo 50–80%, rosso <50%.
- Validazione dati su D: lista `a corpo,a misura`; su C: lista dei WP.
- Filtri automatici su riga intestazione; blocco riquadri riga 1.

Controllo di quadratura (cella nota in fondo):
`Importo SAL corrente totale` deve uguagliare la differenza dei progressivi del
foglio "Registro SAL". Inserire una cella
`=L{riga_tot}-('Registro SAL'!D{riga_N}-'Registro SAL'!D{riga_N-1})`
che deve dare 0; evidenziarla in rosso se ≠ 0.

---

## Foglio 2: "Riepilogo economico"

La cascata economica del SAL corrente. Layout verticale leggibile.

```
Riga  Voce                                         Importo
─────────────────────────────────────────────────────────
 1    [Titolo commessa]                            (TITLE_FONT)
 2    SAL n. __  al  DD/MM/YYYY
 4    Importo lavori progressivo (N)               ='Contabilità SAL'!J{riga_tot}
 5    Importo lavori progressivo (N−1)             (da Registro SAL)
 6    Importo lavori del SAL N                     =B4-B5
 8    CASCATA CERTIFICATO DI PAGAMENTO
 9    Importo lavori progressivo (N)               =B4
10    − Ritenuta di garanzia (__%)                 =-B9*ritenuta_pct
11    − Recupero anticipo                          =-anticipo*(B9/imp_contratto)
12    − Penali                                     (manuale, con nota)
13    = Importo progressivo da liquidare           =B9+B10+B11+B12
14    − Già liquidato a SAL precedenti             (da Registro SAL)
15    = ACCONTO SAL N (netto, ante IVA)            =B13-B14   (bold, riquadrato)
17    % avanzamento lavori                         =B9/imp_contratto   (PCT_FMT)
```

- Riga 15 evidenziata (bordo doppio, `TOTAL_FILL`, font 14 bold).
- Celle parametro (ritenuta_pct, anticipo, imp_contratto) in un blocco "Parametri"
  separato e referenziato, così si modificano in un punto solo.
- Se penale è `contestata`, mostra due righe acconto: "con penale" e "senza penale".

---

## Foglio 3: "Libretto misure"

Il registro dei rilievi grezzi — tracciabilità. Una riga per rilievo.

| Col | Contenuto |
|---|---|
| A | ID rilievo (R-####) |
| B | Data rilievo (DATE_FMT) |
| C | Rilevato da |
| D | SAL competenza |
| E | WP |
| F | Locale / Area |
| G | Codice voce |
| H | Descrizione |
| I | UM |
| J | Quantità rilevata |
| K | % avanz. voce (a corpo) |
| L | Riferimento documentale |
| M | Stato (dropdown) |
| N | Note |

- Validazione dati su M: `montato,parziale,da verificare,conteso`.
- Formattazione condizionale su M con `STATO_RILIEVO_COLORS`.
- Filtri automatici; blocco riga 1.
- I rilievi con stato `da verificare` o `conteso` NON devono confluire nelle
  quantità progressive del foglio Contabilità: usare `SUMIFS` che filtra
  `Stato="montato"` (+ eventualmente `parziale` se la quota parziale è quantificata).

Esempio formula di aggregazione (qtà progressiva di una voce, solo documentate):
```
=SUMIFS('Libretto misure'!J:J,'Libretto misure'!G:G,A{r},'Libretto misure'!M:M,"montato")
```

---

## Foglio 4: "Registro SAL"

Log cronologico di tutti i SAL emessi. Una riga per SAL. È la memoria storica e la
fonte dei valori "progressivo N−1" e "già liquidato".

| Col | Contenuto |
|---|---|
| A | N. SAL |
| B | Data dati |
| C | Data emissione |
| D | Importo lavori progressivo (€) |
| E | Importo SAL periodo (€) = `D − D_riga_precedente` |
| F | Ritenuta progressiva (€) |
| G | Recupero anticipo progressivo (€) |
| H | Penali (€) |
| I | Progressivo da liquidare (€) = `D-F-G-H` |
| J | Acconto periodo (€) = `I − I_riga_precedente` |
| K | Stato (dropdown) |
| L | Data certificato DLL (CDP) |
| M | Data pagamento |
| N | Note |

- Validazione su K: `Emesso,Verificato DLL,Certificato,Pagato,Contestato`.
- Formattazione condizionale su K con `STATO_SAL_COLORS`.
- Riga di **controllo**: `Σ J` deve uguagliare `I` dell'ultimo SAL (il totale degli
  acconti = progressivo liquidato corrente). Evidenziare se diverso.
- Grafico a barre: importo SAL periodo (E) per ogni SAL.

---

## Foglio 5: "Riepilogo per WP"

Sintesi economica per Work Package (per 2514RW: WP1 FOH, WP2 CORRIDOI, WP3 SUITE,
WP4 SCALA B, WP5 20 ROOM).

| Col | Contenuto | Formula |
|---|---|---|
| A | WP | — |
| B | Importo contrattuale (€) | `=SUMIF('Contabilità SAL'!C:C,A{r},'Contabilità SAL'!H:H)` |
| C | Importo progressivo (€) | `=SUMIF('Contabilità SAL'!C:C,A{r},'Contabilità SAL'!J:J)` |
| D | % avanzamento WP | `=C/B` |
| E | Importo SAL corrente (€) | `=SUMIF('Contabilità SAL'!C:C,A{r},'Contabilità SAL'!L:L)` |

- Riga totale (deve quadrare con i totali del foglio Contabilità).
- Grafico a torta: ripartizione importo progressivo per WP.
- Formattazione condizionale su D (verde/giallo/rosso).

---

## Impostazioni di stampa (tutti i fogli tabellari)

```python
ws.page_setup.orientation = 'landscape'
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.print_title_rows = '1:1'
ws.sheet_view.showGridLines = True
```

Imposta larghezze colonna sensate (descrizioni ampie ~45, importi ~16, codici ~12)
e `freeze_panes` sulla prima riga dati di ogni foglio tabellare.
