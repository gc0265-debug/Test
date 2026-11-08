#!/usr/bin/env python3
"""Genera il BOQ Excel (formule native) e il registro incertezze, e fa i controlli di coerenza.

Uso:
  python3 scripts/genera_boq.py boq.csv [--incertezze incertezze.csv]
                                [--tag-csv tag.csv] [--out BOQ.xlsx]

Formato dei CSV: references/formato-boq.md.
- La quantità secondaria è una formula Excel nativa: nella colonna
  formula_secondaria scrivi l'espressione con {P} al posto della quantità
  primaria (es. "{P}*0.25*0.40" oppure "{P}*15"). Lasciala vuota se non serve.
- --tag-csv confronta le primarie High di boq.csv con le occorrenze contate da
  estrai_tag.py, per codice e zona: ogni differenza è un ERRORE.
Uscita 0 = nessun errore; 1 = errori; 2 = file non leggibili o libreria mancante.
"""
import argparse
import csv
import re
import sys
from collections import Counter

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:
    print("Manca openpyxl. Installala con: pip install openpyxl")
    sys.exit(2)

COLONNE = ["codice", "descrizione", "zona", "qta_primaria", "um_primaria", "formula_secondaria",
           "um_secondaria", "confidenza", "tavola", "pagina", "note"]
CONFIDENZE = {"High", "Medium", "Low"}
PAROLE_VIETATE = ["definitivo", "validato", "conforme", "ff&e", "millwork", "boiserie"]
COLORI = {"High": "C6EFCE", "Medium": "FFEB9C", "Low": "FFC7CE"}

errori, avvisi = [], []


def leggi(p):
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("boq")
    ap.add_argument("--incertezze")
    ap.add_argument("--tag-csv")
    ap.add_argument("--out", default="BOQ.xlsx")
    a = ap.parse_args()

    try:
        righe = leggi(a.boq)
        inc = leggi(a.incertezze) if a.incertezze else []
        tag = leggi(a.tag_csv) if a.tag_csv else []
    except OSError as e:
        print(f"File non leggibile: {e}")
        sys.exit(2)

    mancanti = [c for c in COLONNE if righe and c not in righe[0]]
    if mancanti:
        print(f"Colonne mancanti in {a.boq}: {mancanti}")
        sys.exit(2)

    # --- controlli riga per riga
    for i, r in enumerate(righe, start=2):
        q = r["qta_primaria"].strip()
        if r["confidenza"] not in CONFIDENZE:
            errori.append(f"riga {i}: confidenza '{r['confidenza']}' non valida (High/Medium/Low)")
        if not r["tavola"].strip() or not r["pagina"].strip():
            errori.append(f"riga {i} ({r['codice']}): manca tavola o pagina")
        if q.upper() == "TBD":
            if not any(r["codice"] in (x.get("descrizione", "") + x.get("codice", "")) for x in inc):
                errori.append(f"riga {i} ({r['codice']}): quantità TBD senza voce nel registro incertezze")
        else:
            try:
                float(q.replace(",", "."))
            except ValueError:
                errori.append(f"riga {i} ({r['codice']}): quantità primaria '{q}' non numerica")
        f = r["formula_secondaria"].strip()
        if f and ("{P}" not in f or re.search(r"[^0-9{}P+\-*/().,\s]", f)):
            errori.append(f"riga {i} ({r['codice']}): formula '{f}' non valida (usa {{P}}, numeri e + - * / ( ))")
        testo = " ".join(r.values()).lower()
        for p in PAROLE_VIETATE:
            if p in testo:
                errori.append(f"riga {i}: contiene la parola vietata '{p}'")

    # --- confronto con il conteggio vettoriale
    if tag:
        contati = Counter((t["tag"], t["zona"]) for t in tag)
        dichiarati = Counter()
        for r in righe:
            if r["confidenza"] == "High" and r["qta_primaria"].strip().upper() != "TBD":
                try:
                    dichiarati[(r["codice"], r["zona"])] += float(r["qta_primaria"].replace(",", "."))
                except ValueError:
                    pass
        for k in sorted(set(contati) | set(dichiarati)):
            if k[1].startswith(("SOVRAPPOSTA", "FUORI ZONA")):
                avvisi.append(f"{k[0]} / {k[1]}: {contati[k]} occorrenze da risolvere prima del BOQ")
                continue
            if abs(contati[k] - dichiarati[k]) > 1e-9:
                errori.append(f"{k[0]} / {k[1]}: nel BOQ {dichiarati[k]:g}, contati in tavola {contati[k]}")

    # --- workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BOQ"
    intest = ["Codice articolo", "Descrizione", "Zona / WP", "Quantità primaria", "UM primaria",
              "Quantità secondaria calcolata", "UM secondaria", "Formula", "Confidenza",
              "Tavola", "Pagina", "Note"]
    ws.append(intest)
    for i, r in enumerate(righe, start=2):
        q = r["qta_primaria"].strip()
        qv = "TBD" if q.upper() == "TBD" else float(q.replace(",", "."))
        f = r["formula_secondaria"].strip()
        sec = ""
        if f and qv != "TBD":
            sec = "=" + f.replace("{P}", f"D{i}").replace(",", ".")
        elif f:
            sec = "TBD"
        ws.append([r["codice"], r["descrizione"], r["zona"], qv, r["um_primaria"], sec,
                   r["um_secondaria"], f, r["confidenza"], r["tavola"], r["pagina"], r["note"]])
        if r["confidenza"] in COLORI:
            ws.cell(i, 9).fill = PatternFill("solid", fgColor=COLORI[r["confidenza"]])

    n = len(righe) + 1
    rs = wb.create_sheet("Riepilogo per codice")
    rs.append(["Codice articolo", "Quantità primaria totale", "Quantità secondaria totale",
               "Righe Low", "Righe TBD"])
    for j, c in enumerate(sorted({r["codice"] for r in righe}), start=2):
        rs.append([c, f'=SUMIF(BOQ!$A$2:$A${n},A{j},BOQ!$D$2:$D${n})',
                   f'=SUMIF(BOQ!$A$2:$A${n},A{j},BOQ!$F$2:$F${n})',
                   f'=COUNTIFS(BOQ!$A$2:$A${n},A{j},BOQ!$I$2:$I${n},"Low")',
                   f'=COUNTIFS(BOQ!$A$2:$A${n},A{j},BOQ!$D$2:$D${n},"TBD")'])

    ri = wb.create_sheet("Registro incertezze QS")
    ri.append(["ID", "Tavola", "Pagina", "Zona / WP", "Codice", "Descrizione del dubbio",
               "Impatto sulla quantità", "Azione proposta", "Stato", "Esito QS", "Firma QS", "Data"])
    for k, x in enumerate(inc, start=1):
        ri.append([x.get("id") or f"INC-{k:03d}", x.get("tavola", ""), x.get("pagina", ""),
                   x.get("zona", ""), x.get("codice", ""), x.get("descrizione", ""),
                   x.get("impatto", ""), x.get("azione", ""), x.get("stato", "Aperta"), "", "", ""])

    for s in (ws, rs, ri):
        for c in s[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F3864")
            c.alignment = Alignment(wrap_text=True, vertical="center")
        s.freeze_panes = "A2"
        for col in range(1, s.max_column + 1):
            s.column_dimensions[get_column_letter(col)].width = 16 if col != 2 and col != 6 else 34
    ws.append([])
    ws.append(["Bozza per revisione del Quantity Surveyor - non definitiva."])

    wb.save(a.out)
    print(f"BOQ: {a.out}  righe: {len(righe)}  incertezze: {len(inc)}")
    if avvisi:
        print("\nAVVISI")
        for v in avvisi:
            print(f"- {v}")
    if errori:
        print("\nERRORI")
        for e in errori:
            print(f"- {e}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
