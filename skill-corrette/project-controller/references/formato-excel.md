# Formato Excel — Specifiche Tecniche

Questo documento descrive la struttura dei file Excel generati dalla skill
project-controller. Usa `openpyxl` per la generazione. Fogli e colonne sono la
struttura di base da usare sempre; colori, larghezze e grafici adattali se
serve.

## Indice
1. Workbook Avanzamento Fisico (Dashboard, Dettaglio WP, Storico, Programma vs Reale)
2. Workbook Registro Varianti (Registro, Riepilogo, Dettaglio)
3. Note tecniche di generazione (libreria, stile, formule, stampa)

---

## Workbook Avanzamento Fisico

### Foglio 1: "Dashboard"

Layout visuale sintetico per presentazione a schermo o stampa.

**Riga 1-3**: Intestazione
- A1: Nome progetto (bold, 16pt)
- A2: Codice progetto
- A3: "Avanzamento al DD/MM/YYYY" (data aggiornamento dati)

**Riga 5**: Avanzamento complessivo progetto
- Barra di avanzamento simulata con formattazione condizionale
- % numerica grande (24pt, bold)
- Colore secondo la tabella unica delle soglie in SKILL.md: verde se delta ≥ −5 punti, arancione da −5 a −15, rosso sotto −15

**Righe 7+**: Riepilogo per WP
- Colonna A: Nome WP
- Colonna B: % Avanzamento (con barra condizionale)
- Colonna C: % Programma attesa
- Colonna D: Delta (con freccia ↑↓ e colore)
- Colonna E: Note sintetiche

**Grafico**: istogramma a barre orizzontali, un WP per riga,
con barra "attuale" sovrapposta a barra "programma" (grigio chiaro).

### Foglio 2: "Dettaglio WP"

Una sezione per ogni WP, separata da riga vuota.

| Colonna | Contenuto |
|---------|-----------|
| A | Area |
| B | Unità di misura |
| C | Qtà prevista (baseline) |
| D | Qtà prevista (revised, se varianti approvate) |
| E | Qtà installata |
| F | % Avanzamento (formula: =E/D) |
| G | Peso area (formula: =D{row}/SUM(D{start}:D{end}) del WP) |
| H | % Pesata (formula: =F*G) |
| I | Note |

**Riga di totale per ogni WP**: somma pesata delle aree.
**Formattazione condizionale**: celle F con sfondo verde >80%, giallo 50-80%, rosso <50%.

### Foglio 3: "Storico"

Traccia l'evoluzione nel tempo (una riga per data di aggiornamento).

| Colonna | Contenuto |
|---------|-----------|
| A | Data aggiornamento |
| B-N | % per ogni WP (una colonna per WP) |
| Ultima | % Progetto complessivo |

**Grafico**: linee temporali, una per WP + linea totale progetto.
Aggiungere la curva "programma" se disponibile.

### Foglio 4: "Programma vs Reale" (opzionale)

Solo se l'utente fornisce il programma atteso.

| Colonna | Contenuto |
|---------|-----------|
| A | WP |
| B | % Programma (attesa a questa data) |
| C | % Reale |
| D | Delta |
| E | Trend (miglioramento/peggioramento vs. ultimo aggiornamento) |

---

## Workbook Registro Varianti

### Foglio 1: "Registro"

Tabella filtrata con una riga per variante.

| Colonna | Contenuto | Larghezza |
|---------|-----------|-----------|
| A | Codice (VAR-XXXX-NNN-YYYY) | 25 |
| B | Data proposta | 12 |
| C | Stato (dropdown: Proposta/Emessa/Approvata/Rifiutata/Sospesa) | 12 |
| D | Richiesta da (GC/DLL / GILI) | 10 |
| E | Descrizione | 50 |
| F | WP impattati | 20 |
| G | Aree impattate | 20 |
| H | Impatto tempo (gg) | 12 |
| I | Impatto costo (€) | 15 |
| J | Data ultimo aggiornamento stato | 12 |
| K | Note | 40 |

**Formattazione condizionale per colonna C (Stato):**
- Proposta: sfondo giallo chiaro
- Emessa: sfondo blu chiaro
- Approvata: sfondo verde chiaro
- Rifiutata: sfondo grigio con testo barrato
- Sospesa: sfondo arancione

**Filtri automatici**: attivi su tutte le colonne.
**Blocco riquadri**: riga 1 fissa.

### Foglio 2: "Riepilogo"

**Sezione 1**: Conteggio per stato
- Tabella 5 righe (una per stato) con conteggio
- Grafico a torta

**Sezione 2**: Impatto cumulativo
- Impatto tempo totale (somma gg delle varianti Approvate)
- Impatto costo totale (somma € delle varianti Approvate)
- Impatto potenziale (somma delle Emesse + Sospese)

**Sezione 3**: Varianti sospese da > 14 giorni
- Lista con codice, descrizione, giorni in sospeso
- Sfondo rosso se > 30 giorni

### Foglio 3: "Dettaglio" (opzionale)

Un foglio di approfondimento per ogni variante complessa, con:
- Descrizione estesa
- Documentazione di supporto (riferimenti a disegni, email)
- Storico cambi di stato
- Analisi impatto dettagliata

---

## Note tecniche di generazione

### Libreria
```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
```

### Stile GILI standard
```python
# Colori
HEADER_FILL = PatternFill("solid", fgColor="1F4E79")  # blu scuro
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)
SUBHEADER_FILL = PatternFill("solid", fgColor="D6E4F0")  # blu chiaro
TITLE_FONT = Font(bold=True, size=16, color="1F4E79")

# Stati varianti
STATO_COLORS = {
    "Proposta": PatternFill("solid", fgColor="FFF2CC"),
    "Emessa": PatternFill("solid", fgColor="D6E4F0"),
    "Approvata": PatternFill("solid", fgColor="C6EFCE"),
    "Rifiutata": PatternFill("solid", fgColor="D9D9D9"),
    "Sospesa": PatternFill("solid", fgColor="FCE4D6"),
}

# Avanzamento
GREEN_FILL = PatternFill("solid", fgColor="C6EFCE")   # >80%
YELLOW_FILL = PatternFill("solid", fgColor="FFF2CC")   # 50-80%
RED_FILL = PatternFill("solid", fgColor="FFC7CE")      # <50%

# Bordi
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)
```

### Formule chiave (usare formule Excel, non valori calcolati)

Sintassi inglese con virgola come separatore (`SUM`, `SUMIF`, mai `SOMMA` o `;`):
openpyxl scrive la formula così com'è e Excel la legge in inglese.
```
% Avanzamento area:    =E{row}/D{row}
Peso area:             =D{row}/SUM(D{start}:D{end})
% Pesata:              =F{row}*G{row}
Totale WP:             =SUM(H{start}:H{end})
Delta vs programma:    =C{row}-B{row}
```

Usare formule Excel native (non valori hardcoded) così l'utente può
aggiornare i dati manualmente e i calcoli si rinfrescano.

### Impostazioni di stampa
```python
ws.page_setup.orientation = 'landscape'
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0  # quante pagine servono
ws.print_title_rows = '1:1'  # riga intestazione ripetuta
```
