#!/usr/bin/env python3
"""Sanity check di scala: confronta una quota nota con la sua lunghezza sul PDF.

Uso:
  python3 scripts/verifica_scala.py tavola.pdf --pagina 2 --p1 120.5,300 --p2 640.2,300
                                    --reale-mm 6000 --scala 100

- p1 e p2 sono gli estremi della linea di quota in punti PDF (stesse coordinate
  di PyMuPDF). Per trovarli: page.get_drawings() vicino al testo della quota
  (page.search_for("6000")), prendendo gli estremi della linea di quota.
- reale-mm è il valore SCRITTO nella quota (es. interasse 6000). Non usare una
  misura stimata: il controllo serve proprio a non stimare.
- Scarto ≤ 2%: scala confermata. 2-5%: riserva (probabile tolleranza di disegno,
  ripetere su un'altra quota). > 5%: ALLERTA SCALA, misure dirette vietate.
Il rapporto tra scala effettiva e nominale aiuta a riconoscere un cambio di
formato (A3 salvato in A4 ≈ 1,41; A1 in A3 = 2).

Uscita 0 = confermata; 1 = riserva o allerta; 2 = input non valido.
"""
import argparse
import math
import sys

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:
    try:
        import fitz  # PyMuPDF meno recente
    except ImportError:
        print("Manca PyMuPDF. Installala con: pip install pymupdf")
        sys.exit(2)


def punto(s):
    x, y = (float(v) for v in s.split(","))
    return x, y


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--pagina", type=int, required=True)
    ap.add_argument("--p1", required=True)
    ap.add_argument("--p2", required=True)
    ap.add_argument("--reale-mm", type=float, required=True)
    ap.add_argument("--scala", type=float, required=True, help="denominatore della scala nominale, es. 100")
    a = ap.parse_args()

    try:
        doc = fitz.open(a.pdf)
        page = doc[a.pagina - 1]
        (x1, y1), (x2, y2) = punto(a.p1), punto(a.p2)
    except Exception as e:  # noqa: BLE001
        print(f"Input non valido: {e}")
        sys.exit(2)
    for x, y in ((x1, y1), (x2, y2)):
        if not page.rect.contains(fitz.Point(x, y)):
            print(f"Punto ({x}, {y}) fuori dalla pagina {page.rect}")
            sys.exit(2)

    carta_mm = math.hypot(x2 - x1, y2 - y1) * 25.4 / 72
    if carta_mm <= 0:
        print("I due punti coincidono.")
        sys.exit(2)
    eff = a.reale_mm / carta_mm
    scarto = (eff - a.scala) / a.scala
    print(f"Lunghezza su carta: {carta_mm:.1f} mm · quota reale: {a.reale_mm:.0f} mm")
    print(f"Scala effettiva 1:{eff:.1f} · nominale 1:{a.scala:g} · scarto {scarto:+.1%} · "
          f"rapporto {eff / a.scala:.3f}")
    if abs(scarto) <= 0.02:
        print("ESITO: scala confermata su questa quota.")
        sys.exit(0)
    if abs(scarto) <= 0.05:
        print("ESITO: RISERVA — ripetere su un'altra quota prima di consentire misure.")
        sys.exit(1)
    nota = ""
    for r, desc in ((math.sqrt(2), "un formato più piccolo (es. A3 → A4)"),
                    (1 / math.sqrt(2), "un formato più grande (es. A3 → A2)"),
                    (2, "due formati più piccolo (es. A1 → A3)"),
                    (0.5, "due formati più grande")):
        if abs(eff / a.scala - r) / r <= 0.03:
            nota = f" Il rapporto è compatibile con la stampa/salvataggio su {desc}."
    print(f"ESITO: ALLERTA SCALA — misure dirette vietate su questa tavola.{nota}")
    sys.exit(1)


if __name__ == "__main__":
    main()
