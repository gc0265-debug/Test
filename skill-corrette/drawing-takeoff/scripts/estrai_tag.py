#!/usr/bin/env python3
"""Conta i tag di testo vettoriali in un PDF di tavole, pagina per pagina e zona per zona.

Uso:
  python3 scripts/estrai_tag.py tavola.pdf --tag "F6,C1,P1" [--regex "^F\\d+$"]
                                [--zone zone.json] [--out tag.csv]

- Conta solo il testo VERO del PDF (parole estratte da PyMuPDF): niente OCR,
  niente conteggi visivi. Una pagina senza testo estraibile viene segnalata.
- Il confronto è esatto sulla parola, dopo aver tolto la punteggiatura ai bordi
  ("F6," conta come F6; "F6a" NO). Per famiglie di codici usa --regex.
- zone.json (facoltativo): lista di zone in punti PDF (origine in alto a sinistra,
  come la mostra PyMuPDF):
    [{"pagina": 1, "zona": "WP3 SUITE - 301", "rect": [x0, y0, x1, y1]},
     {"pagina": 1, "zona": "ESCLUDI cartiglio", "rect": [...]}]
  Una zona il cui nome inizia con "ESCLUDI" toglie dal conteggio ciò che contiene
  (cartiglio, legenda, note). Le occorrenze fuori da ogni zona finiscono in
  "FUORI ZONA" e vanno controllate a mano. Un'occorrenza in due zone è segnalata
  come SOVRAPPOSTA (rischio doppio conteggio) e non è attribuita a nessuna.

Uscita 0 = ok; 1 = avvisi da leggere (pagine senza testo, sovrapposizioni, fuori zona);
2 = file non leggibile o libreria mancante.
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:
    try:
        import fitz  # PyMuPDF meno recente
    except ImportError:
        print("Manca PyMuPDF. Installala con: pip install pymupdf")
        sys.exit(2)

PUNTEGGIATURA = ".,;:()[]{}\"'«»"


def dentro(cx, cy, r):
    x0, y0, x1, y1 = r
    return min(x0, x1) <= cx <= max(x0, x1) and min(y0, y1) <= cy <= max(y0, y1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--tag", default="", help="codici esatti separati da virgola")
    ap.add_argument("--regex", default="", help="espressione regolare per famiglie di codici")
    ap.add_argument("--zone", help="file JSON delle zone")
    ap.add_argument("--out", default="tag.csv")
    a = ap.parse_args()

    tags = {t.strip() for t in a.tag.split(",") if t.strip()}
    rx = re.compile(a.regex) if a.regex else None
    if not tags and not rx:
        print("Indica almeno --tag o --regex.")
        sys.exit(2)

    zone = []
    if a.zone:
        try:
            with open(a.zone, encoding="utf-8") as f:
                zone = json.load(f)
        except (OSError, ValueError) as e:
            print(f"Zone non leggibili: {e}")
            sys.exit(2)

    try:
        doc = fitz.open(a.pdf)
    except Exception as e:  # noqa: BLE001
        print(f"PDF non leggibile: {e}")
        sys.exit(2)

    righe, avvisi = [], []
    conteggi = defaultdict(Counter)  # tag -> zona -> n
    pagine_vuote = []

    for pno, page in enumerate(doc, start=1):
        words = page.get_text("words")
        if not words:
            pagine_vuote.append(pno)
            continue
        zp = [z for z in zone if int(z.get("pagina", 0)) == pno]
        for w in words:
            x0, y0, x1, y1, testo = w[:5]
            t = testo.strip(PUNTEGGIATURA)
            if not (t in tags or (rx and rx.fullmatch(t))):
                continue
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            hit = [z["zona"] for z in zp if dentro(cx, cy, z["rect"])]
            if any(h.upper().startswith("ESCLUDI") for h in hit):
                continue
            if len(hit) > 1:
                zona = "SOVRAPPOSTA: " + " | ".join(hit)
            elif hit:
                zona = hit[0]
            else:
                zona = "FUORI ZONA" if zone else "INTERA PAGINA"
            righe.append({"file": a.pdf, "pagina": pno, "tag": t, "zona": zona,
                          "x0": round(x0, 2), "y0": round(y0, 2),
                          "x1": round(x1, 2), "y1": round(y1, 2)})
            conteggi[t][zona] += 1

    with open(a.out, "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=["file", "pagina", "tag", "zona", "x0", "y0", "x1", "y1"])
        wr.writeheader()
        wr.writerows(righe)

    print(f"File: {a.pdf}  pagine: {len(doc)}  occorrenze: {len(righe)}  -> {a.out}\n")
    for t in sorted(conteggi):
        tot = sum(conteggi[t].values())
        print(f"{t}: {tot}")
        for z, n in sorted(conteggi[t].items()):
            print(f"    {z}: {n}")
    for t in sorted(tags - set(conteggi)):
        avvisi.append(f"codice {t} cercato ma mai trovato: verificarlo in legenda e in tavola")

    if pagine_vuote:
        avvisi.append(f"pagine senza testo estraibile (raster o testo convertito in curve): {pagine_vuote}")
    if any(r["zona"].startswith("SOVRAPPOSTA") for r in righe):
        avvisi.append("occorrenze in zone sovrapposte: correggere zone.json")
    if any(r["zona"] == "FUORI ZONA" for r in righe):
        avvisi.append("occorrenze fuori da ogni zona: controllare se sono cartiglio/legenda o elementi reali")

    if avvisi:
        print("\nAVVISI")
        for v in avvisi:
            print(f"- {v}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
