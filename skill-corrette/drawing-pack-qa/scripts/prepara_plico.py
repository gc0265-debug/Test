#!/usr/bin/env python3
"""Bonifica del plico: ruota le pagine e divide i plichi in fogli, in una cartella NUOVA.

Uso:
  python3 scripts/prepara_plico.py <cartella> --qa qa_registro.csv
                                   [--mappa mappa.csv] [--out bonificato/]

- Rotazioni: applica la colonna rotazione_da_applicare di qa_registro.csv solo
  sulle righe confermate a vista (colonna "confermata" = si). Le rotazioni non
  confermate vengono elencate e non applicate.
- mappa.csv (facoltativo) per dividere i plichi: colonne
  file,pagina_da,pagina_a,nome_nuovo  (es. Plico.pdf,1,4,STR_01-04_Fondazioni.pdf)
  I file non citati in mappa.csv vengono copiati interi (con le rotazioni).
- I PDF originali non vengono mai modificati. Il testo vettoriale resta intatto:
  rotazione e divisione non convertono le pagine in immagini.
Uscita 0 = ok; 1 = avvisi (pagine non coperte dalla mappa o sovrapposte); 2 = errore.
"""
import argparse
import csv
import os
import sys
from collections import defaultdict

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:
    try:
        import fitz  # PyMuPDF meno recente
    except ImportError:
        print("Manca PyMuPDF. Installala con: pip install pymupdf")
        sys.exit(2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cartella")
    ap.add_argument("--qa", required=True)
    ap.add_argument("--mappa")
    ap.add_argument("--out", default="bonificato")
    a = ap.parse_args()

    if os.path.abspath(a.out) == os.path.abspath(a.cartella):
        print("La cartella di uscita deve essere diversa da quella degli originali.")
        sys.exit(2)
    try:
        with open(a.qa, encoding="utf-8") as f:
            qa = list(csv.DictReader(f))
        mappa = []
        if a.mappa:
            with open(a.mappa, encoding="utf-8") as f:
                mappa = list(csv.DictReader(f))
    except OSError as e:
        print(f"File non leggibile: {e}")
        sys.exit(2)

    rot, avvisi_rot = {}, []
    for r in qa:
        g = int(r.get("rotazione_da_applicare") or 0)
        conf = r.get("confermata")
        if g and (conf or "").strip().lower() in ("si", "sì", "yes", "x"):
            rot[(r["file"], int(r["pagina"]))] = g
        elif g:
            avvisi_rot.append(f"{r['file']} p.{r['pagina']}: rotazione {g}° proposta ma non confermata")

    os.makedirs(a.out, exist_ok=True)
    avvisi, scritti = list(avvisi_rot), []
    per_file = defaultdict(list)
    for m in mappa:
        per_file[m["file"]].append(m)

    file_qa = sorted({r["file"] for r in qa if r.get("pagina", "-") != "-"})
    for f in file_qa:
        src = fitz.open(os.path.join(a.cartella, f))
        for (ff, p), g in rot.items():
            if ff == f:
                pg = src[p - 1]
                pg.set_rotation((pg.rotation + g) % 360)
        if f in per_file:
            coperte = defaultdict(int)
            for m in per_file[f]:
                da, aa = int(m["pagina_da"]), int(m["pagina_a"])
                if not 1 <= da <= aa <= len(src):
                    avvisi.append(f"{f}: intervallo {da}-{aa} fuori dalle {len(src)} pagine")
                    continue
                out = fitz.open()
                out.insert_pdf(src, from_page=da - 1, to_page=aa - 1)
                out.save(os.path.join(a.out, m["nome_nuovo"]), garbage=3, deflate=True)
                scritti.append(f"{m['nome_nuovo']} ← {f} p.{da}-{aa}")
                for p in range(da, aa + 1):
                    coperte[p] += 1
            mancanti = [p for p in range(1, len(src) + 1) if not coperte[p]]
            doppie = [p for p, n in coperte.items() if n > 1]
            if mancanti:
                avvisi.append(f"{f}: pagine non assegnate a nessun file nuovo: {mancanti}")
            if doppie:
                avvisi.append(f"{f}: pagine assegnate a più file: {doppie}")
        else:
            src.save(os.path.join(a.out, f), garbage=3, deflate=True)
            scritti.append(f"{f} (copia{' con rotazioni' if any(k[0] == f for k in rot) else ''})")

    print(f"Cartella bonificata: {a.out}")
    for s in scritti:
        print(f"  {s}")
    print(f"Rotazioni applicate: {len(rot)}")
    if avvisi:
        print("\nAVVISI")
        for v in avvisi:
            print(f"- {v}")
        sys.exit(1)


if __name__ == "__main__":
    main()
