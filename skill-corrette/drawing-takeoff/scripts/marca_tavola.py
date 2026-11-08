#!/usr/bin/env python3
"""Genera la tavola marcata a colori a partire dal CSV di estrai_tag.py.

Uso:
  python3 scripts/marca_tavola.py tavola.pdf tag.csv [--zone zone.json]
                                  [--low low.csv] [--out tavola_marcata.pdf]

- Ogni occorrenza del CSV è evidenziata con un colore per codice e un numero
  progressivo per codice (F6-1, F6-2, ...), così il QS può confrontare tavola e BOQ.
- Le zone di zone.json sono bordate in grigio con il nome; le zone ESCLUDI in rosso.
- low.csv (facoltativo, colonne pagina,descrizione,x0,y0,x1,y1): elementi a
  confidenza Low (conteggi visivi, misure a scala), disegnati con riquadro tratteggiato.
- In fondo viene aggiunta una pagina di legenda con colori e totali per codice.
Il PDF originale non viene modificato.
"""
import argparse
import csv
import json
import sys
from collections import Counter

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:
    try:
        import fitz  # PyMuPDF meno recente
    except ImportError:
        print("Manca PyMuPDF. Installala con: pip install pymupdf")
        sys.exit(2)

PALETTE = [(0.90, 0.10, 0.10), (0.10, 0.45, 0.90), (0.05, 0.60, 0.25), (0.85, 0.45, 0.00),
           (0.55, 0.20, 0.75), (0.00, 0.60, 0.65), (0.80, 0.10, 0.55), (0.45, 0.35, 0.10)]


def leggi_csv(p):
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("csv")
    ap.add_argument("--zone")
    ap.add_argument("--low")
    ap.add_argument("--out", default="tavola_marcata.pdf")
    a = ap.parse_args()

    try:
        doc = fitz.open(a.pdf)
        righe = leggi_csv(a.csv)
        zone = json.load(open(a.zone, encoding="utf-8")) if a.zone else []
        low = leggi_csv(a.low) if a.low else []
    except Exception as e:  # noqa: BLE001
        print(f"Input non leggibile: {e}")
        sys.exit(2)

    codici = sorted({r["tag"] for r in righe})
    colore = {c: PALETTE[i % len(PALETTE)] for i, c in enumerate(codici)}
    progressivo, totali = Counter(), Counter()

    for z in zone:
        p = int(z["pagina"]) - 1
        if not 0 <= p < len(doc):
            continue
        page = doc[p]
        r = fitz.Rect(z["rect"])
        escl = str(z["zona"]).upper().startswith("ESCLUDI")
        page.draw_rect(r, color=(0.8, 0, 0) if escl else (0.45, 0.45, 0.45), width=1.2)
        page.insert_text((r.x0 + 2, r.y0 + 9), str(z["zona"]), fontsize=7,
                         color=(0.8, 0, 0) if escl else (0.3, 0.3, 0.3))

    for r in righe:
        p = int(r["pagina"]) - 1
        if not 0 <= p < len(doc):
            continue
        page = doc[p]
        c = r["tag"]
        progressivo[c] += 1
        totali[c] += 1
        rect = fitz.Rect(float(r["x0"]), float(r["y0"]), float(r["x1"]), float(r["y1"])) + (-1.5, -1.5, 1.5, 1.5)
        page.draw_rect(rect, color=colore[c], fill=colore[c], fill_opacity=0.25, width=1.2)
        page.insert_text((rect.x1 + 1, rect.y0 + 5), f"{c}-{progressivo[c]}", fontsize=5, color=colore[c])

    for i, r in enumerate(low, start=1):
        p = int(r["pagina"]) - 1
        if not 0 <= p < len(doc):
            continue
        page = doc[p]
        rect = fitz.Rect(float(r["x0"]), float(r["y0"]), float(r["x1"]), float(r["y1"]))
        page.draw_rect(rect, color=(0.95, 0.55, 0), width=1.5, dashes="[3 2] 0")
        page.insert_text((rect.x0, rect.y1 + 7), f"LOW-{i} {r.get('descrizione', '')}", fontsize=6,
                         color=(0.95, 0.55, 0))

    leg = doc.new_page(width=595, height=842)
    y = 50
    leg.insert_text((40, y), "Legenda marcatura - quantità primarie da testo vettoriale", fontsize=12)
    y += 24
    for c in codici:
        leg.draw_rect(fitz.Rect(40, y - 9, 52, y + 1), color=colore[c], fill=colore[c], fill_opacity=0.4)
        leg.insert_text((60, y), f"{c}: {totali[c]} marcature", fontsize=10)
        y += 16
    if low:
        leg.draw_rect(fitz.Rect(40, y - 9, 52, y + 1), color=(0.95, 0.55, 0), width=1.5, dashes="[3 2] 0")
        leg.insert_text((60, y), f"Confidenza Low (verifica prioritaria QS): {len(low)} elementi", fontsize=10)
        y += 16
    y += 10
    leg.insert_text((40, y), "Bozza per revisione del Quantity Surveyor - non definitiva.", fontsize=9)

    doc.save(a.out, garbage=3, deflate=True)
    print(f"Tavola marcata: {a.out}  marcature: {sum(totali.values())}  Low: {len(low)}")
    for c in codici:
        print(f"  {c}: {totali[c]}")


if __name__ == "__main__":
    main()
