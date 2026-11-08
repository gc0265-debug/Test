#!/usr/bin/env python3
"""Scansione QA di una cartella di tavole PDF, pagina per pagina, prima di qualsiasi take-off.

Uso:
  python3 scripts/analizza_plico.py <cartella> [--registro registro.csv]
                                    [--tag "F6,C1,P1"] [--out qa_registro.csv]
                                    [--report qa_report.md]

Per ogni pagina rileva (solo ciò che è leggibile nel file, niente deduzioni):
- testo vettoriale (parole estratte), copertura immagini e numero di tracciati:
  Vettoriale / Raster / Raster con OCR / Ibrido;
- orientamento di lettura del testo prevalente, rotazione da applicare;
- formato reale della pagina (A0-A4 o fuori standard) e formato dichiarato nel
  cartiglio, se scritto ("Formato A3"); scale nominali "1:xx" trovate nel testo;
- revisione ("Rev. C"), disciplina da nome file e da parole chiave nel testo;
- presenza dei tag di prova (--tag).
registro.csv (facoltativo): colonne codice,revisione[,titolo,disciplina]. Lo script
segnala tavole del registro non trovate, codici presenti in più file e revisioni
non riscontrate.
I campi che il file non permette di leggere restano "Non verificata": vanno
controllati a vista e scritti nel registro chiarimenti, mai indovinati.

Uscita 0 = tutte le pagine Pass; 1 = almeno un Fail o Riserva; 2 = cartella/file non leggibili.
"""
import argparse
import csv
import math
import os
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

MM = 72 / 25.4
FORMATI = {"A4": (210, 297), "A3": (297, 420), "A2": (420, 594), "A1": (594, 841), "A0": (841, 1189)}
TOLL = 0.03

DISCIPLINE = {
    "Strutturale": ["strutturale", "strutture", "carpenteria", "fondazioni", "plinto", "armatura", "c.a."],
    "Architettonico": ["architettonico", "pianta piano", "prospetto", "controsoffitto", "pavimentazione"],
    "Elettrico": ["elettrico", "impianto elettrico", "quadro elettrico", "illuminazione", "prese", "fm "],
    "Meccanico/HVAC": ["meccanico", "hvac", "climatizzazione", "canali", "fan coil", "idrico", "scarichi"],
    "Arredo / Shop drawing": ["shop drawing", "arredo", "falegnameria", "pannellatura", "abaco arredi"],
}
PREFISSI = {"STR": "Strutturale", "S-": "Strutturale", "ARC": "Architettonico", "A-": "Architettonico",
            "ELE": "Elettrico", "E-": "Elettrico", "MEC": "Meccanico/HVAC", "M-": "Meccanico/HVAC",
            "HVAC": "Meccanico/HVAC", "SD": "Arredo / Shop drawing"}

RX_SCALA = re.compile(r"(?<![\d.,])1\s*[:/]\s*(\d{1,4})(?![\d.,])")
RX_FORMATO = re.compile(r"\b(?:formato|format|size|foglio)\s*[:\-]?\s*(A[0-4])\b", re.I)
RX_REV = re.compile(r"\brev(?:isione)?\.?\s*[:\-]?\s*([A-Z0-9]{1,3})\b", re.I)


def formato_reale(rect):
    w, h = sorted((rect.width / MM, rect.height / MM))
    for nome, (a, b) in FORMATI.items():
        if abs(w - a) / a <= TOLL and abs(h - b) / b <= TOLL:
            return nome, round(w), round(h)
    return "Fuori standard", round(w), round(h)


def orientamento(page):
    """Direzione di lettura prevalente del testo come appare a schermo."""
    peso = Counter()
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            n = sum(len(s["text"].strip()) for s in l["spans"])
            if not n:
                continue
            dx, dy = l["dir"]
            ang = (round(math.degrees(math.atan2(dy, dx)) / 90) * 90 + page.rotation) % 360
            peso[ang] += n
    tot = sum(peso.values())
    if not tot:
        return "Non verificata (nessun testo)", None
    ang, n = peso.most_common(1)[0]
    if n / tot < 0.6:
        return f"Misto ({dict(peso)}): verificare a vista", None
    fix = (-ang) % 360
    return ("OK" if fix == 0 else f"Ruotato: applicare {fix}°"), fix


def disciplina(nome_file, testo):
    up = nome_file.upper()
    da_nome = next((d for p, d in PREFISSI.items() if up.startswith(p)), "")
    t = testo.lower()
    punti = {d: sum(t.count(k) for k in kw) for d, kw in DISCIPLINE.items()}
    da_testo = max(punti, key=punti.get) if max(punti.values()) > 0 else ""
    return da_nome, da_testo


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cartella")
    ap.add_argument("--registro")
    ap.add_argument("--tag", default="")
    ap.add_argument("--out", default="qa_registro.csv")
    ap.add_argument("--report", default="qa_report.md")
    a = ap.parse_args()

    if not os.path.isdir(a.cartella):
        print(f"Cartella non trovata: {a.cartella}")
        sys.exit(2)
    pdfs = sorted(f for f in os.listdir(a.cartella) if f.lower().endswith(".pdf"))
    altri = sorted(f for f in os.listdir(a.cartella)
                   if not f.lower().endswith(".pdf") and not f.startswith("."))
    if not pdfs:
        print("Nessun PDF nella cartella.")
        sys.exit(2)
    tags = [t.strip() for t in a.tag.split(",") if t.strip()]

    righe, testi_file, rev_file = [], defaultdict(str), defaultdict(set)
    for f in pdfs:
        try:
            doc = fitz.open(os.path.join(a.cartella, f))
        except Exception as e:  # noqa: BLE001
            righe.append({"file": f, "pagina": "-", "esito": "Fail", "azioni": f"file non leggibile: {e}"})
            continue
        for page in doc:
            parole = page.get_text("words")
            testo = page.get_text()
            testi_file[f] += "\n" + testo
            area = page.rect.width * page.rect.height
            img = sum(fitz.Rect(i["bbox"]).intersect(page.rect).get_area() for i in page.get_image_info())
            cop = min(img / area, 1.0) if area else 0
            ntracciati = len(page.get_drawings())
            if not parole:
                tipo = "Raster" if cop > 0.5 else "Non verificata (nessun testo né immagine prevalente)"
            elif cop > 0.7 and ntracciati < 50:
                tipo = "Raster con OCR"
            elif cop > 0.3:
                tipo = "Ibrido"
            else:
                tipo = "Vettoriale"
            fmt, w, h = formato_reale(page.rect)
            dich = sorted({m.upper() for m in RX_FORMATO.findall(testo)})
            scale = sorted({int(s) for s in RX_SCALA.findall(testo) if int(s) > 1}, key=int)
            revs = sorted({r.upper() for r in RX_REV.findall(testo)})
            rev_file[f].update(revs)
            ori, fix = orientamento(page)
            d_nome, d_testo = disciplina(f, testo)
            trovati = [t for t in tags if re.search(rf"(?<![\w]){re.escape(t)}(?![\w])", testo)]

            azioni, esito = [], "Pass"
            if tipo in ("Raster", "Raster con OCR"):
                esito = "Fail"
                azioni.append("richiedere PDF vettoriale o IFC; niente misure né conteggi automatici")
            elif tipo.startswith("Ibrido") or tipo.startswith("Non verificata"):
                esito = "Riserva"
                azioni.append("verificare a vista quali parti sono immagine")
            if fix:
                azioni.append(f"ruotare di {fix}°")
                esito = "Fail" if esito == "Fail" else "Riserva"
            elif fix is None:
                esito = "Fail" if esito == "Fail" else "Riserva"
                azioni.append("orientamento da verificare a vista")
            if dich and fmt not in dich:
                esito = "Fail"
                azioni.append(f"ALLERTA SCALA: dichiarato {'/'.join(dich)}, salvato {fmt}: misure dirette vietate")
            elif not dich:
                if esito == "Pass":
                    esito = "Riserva"
                azioni.append("formato non dichiarato: scala da confermare con verifica_scala.py su quota nota")
            if not scale:
                azioni.append("scala nominale non trovata nel testo")
                if esito == "Pass":
                    esito = "Riserva"
            elif len(scale) > 1:
                azioni.append("più scale sulla pagina: attribuirle ai singoli riquadri")
            if d_nome and d_testo and d_nome != d_testo:
                azioni.append(f"nome file indica {d_nome}, contenuto sembra {d_testo}")
                if esito == "Pass":
                    esito = "Riserva"
            if tags and len(trovati) < len(tags) and tipo == "Vettoriale":
                azioni.append(f"tag di prova non trovati: {', '.join(t for t in tags if t not in trovati)}")

            righe.append({
                "file": f, "pagina": page.number + 1, "pagine_file": len(doc),
                "disciplina_nome_file": d_nome or "Non verificata",
                "disciplina_testo": d_testo or "Non verificata",
                "tipo": tipo, "parole": len(parole), "copertura_immagini": f"{cop:.0%}",
                "tracciati": ntracciati, "tag_trovati": ",".join(trovati),
                "scala_nominale": ", ".join(f"1:{s}" for s in scale) or "Non verificata",
                "formato_reale": f"{fmt} ({w}x{h} mm)",
                "formato_dichiarato": "/".join(dich) or "Non dichiarato",
                "revisione": "/".join(revs) or "Non verificata",
                "orientamento": ori, "rotazione_da_applicare": fix if fix else 0, "confermata": "",
                "esito": esito, "azioni": "; ".join(azioni)})

    campi = ["file", "pagina", "pagine_file", "disciplina_nome_file", "disciplina_testo", "tipo", "parole",
             "copertura_immagini", "tracciati", "tag_trovati", "scala_nominale", "formato_reale",
             "formato_dichiarato", "revisione", "orientamento", "rotazione_da_applicare", "confermata", "esito", "azioni"]
    with open(a.out, "w", newline="", encoding="utf-8") as fo:
        wr = csv.DictWriter(fo, fieldnames=campi, restval="")
        wr.writeheader()
        wr.writerows(righe)

    # --- riconciliazione con il registro documenti
    ric = []
    if a.registro:
        try:
            with open(a.registro, encoding="utf-8") as fr:
                reg = list(csv.DictReader(fr))
        except OSError as e:
            print(f"Registro non leggibile: {e}")
            sys.exit(2)
        norm = lambda s: re.sub(r"[^A-Z0-9]", "", s.upper())  # noqa: E731
        usati = set()
        for r in reg:
            cod = r.get("codice", "").strip()
            if not cod:
                continue
            nel_nome = [f for f in pdfs if norm(cod) in norm(f)]
            nel_testo = [f for f in pdfs if f not in nel_nome and cod.upper() in testi_file[f].upper()]
            usati.update(nel_nome)
            if len(nel_nome) > 1:
                ric.append(f"| {cod} | DOPPIO | in più file: {', '.join(nel_nome)} |")
            elif nel_nome:
                rv = r.get("revisione", "").strip().upper()
                if rv and rv not in rev_file[nel_nome[0]]:
                    ric.append(f"| {cod} | REVISIONE | registro Rev. {rv}, nel file "
                               f"{'/'.join(sorted(rev_file[nel_nome[0]])) or 'non trovata'} |")
            elif nel_testo:
                ric.append(f"| {cod} | DA VERIFICARE | non nel nome file, citato nel testo di: "
                           f"{', '.join(nel_testo[:3])} (può essere un rimando, non la tavola) |")
            else:
                ric.append(f"| {cod} | MANCANTE | non trovato |")
        for f in pdfs:
            if f not in usati:
                ric.append(f"| {f} | NON A REGISTRO | file presente ma nessun codice del registro nel nome |")

    # --- report
    cont = Counter(r["esito"] for r in righe)
    L = ["# Drawing Pack QA — bozza automatica", "",
         f"Cartella: `{a.cartella}` · PDF: {len(pdfs)} · pagine: {len(righe)} · "
         f"Pass {cont['Pass']} · Riserva {cont['Riserva']} · Fail {cont['Fail']}", "",
         "> Bozza generata da script: i campi \"Non verificata\" e le righe Riserva vanno controllati a vista "
         "prima di confermare l'esito.", "",
         "## 1. Tabella Registro QA Tavole", "",
         "| Nome File | Pagina | Disciplina Rilevata | Vettoriale | Scala Nominale | Formato PDF | Orientamento | Esito QA |",
         "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"]
    for r in righe:
        if r.get("tipo") is None:
            L.append(f"| `{r['file']}` | - | - | - | - | - | - | **Fail** |")
            continue
        disc = r["disciplina_testo"] if r["disciplina_testo"] != "Non verificata" else r["disciplina_nome_file"]
        vett = "Sì" if r["tipo"] == "Vettoriale" else f"No ({r['tipo']})"
        fmt = r["formato_reale"].split(" (")[0]
        if r["formato_dichiarato"] not in ("Non dichiarato", fmt):
            fmt += f" (dichiarato {r['formato_dichiarato']})"
        L.append(f"| `{r['file']}` | {r['pagina']} | {disc} | {vett} | {r['scala_nominale']} | {fmt} | "
                 f"{r['orientamento']} | **{r['esito']}** |")
    L += ["", "## 2. Piano di Bonifica Immediato", "", "**Pagine da ruotare**", ""]
    rot = [r for r in righe if r.get("rotazione_da_applicare")]
    L += [f"- `{r['file']}` p.{r['pagina']}: {r['rotazione_da_applicare']}°" for r in rot] or ["- nessuna"]
    L += ["", "**Plichi multipagina da suddividere** (proposta da confermare)", ""]
    multi = sorted({(r["file"], r["pagine_file"]) for r in righe if r.get("pagine_file", 1) > 1})
    L += [f"- `{f}`: {n} pagine" for f, n in multi] or ["- nessuno"]
    L += ["", "**Tavole da richiedere in vettoriale o IFC**", ""]
    ras = [r for r in righe if r.get("tipo") in ("Raster", "Raster con OCR")]
    L += [f"- `{r['file']}` p.{r['pagina']} ({r['tipo']})" for r in ras] or ["- nessuna"]
    if altri:
        L += ["", f"**File non PDF nella cartella (non analizzati):** {', '.join(altri)}"]
    if a.registro:
        L += ["", "## Riconciliazione con il Registro Documenti", "",
              "| Codice / file | Esito | Dettaglio |", "| :--- | :--- | :--- |"] + (ric or ["| - | OK | nessuna discrepanza |"])
    L += ["", "## 3. Registro Chiarimenti / Incertezze per il Quantity Surveyor", "",
          "| File | Pagina | Tipo | Dettaglio |", "| :--- | :--- | :--- | :--- |"]
    for r in righe:
        if r.get("azioni"):
            L.append(f"| `{r['file']}` | {r['pagina']} | {r['esito']} | {r['azioni']} |")
    L += ["", "_Da completare a vista: sanity check su quote note (verifica_scala.py), simboli senza "
          "etichetta testuale, quote contrastanti._"]
    with open(a.report, "w", encoding="utf-8") as fo:
        fo.write("\n".join(L) + "\n")

    print(f"PDF: {len(pdfs)}  pagine: {len(righe)}  Pass {cont['Pass']}  Riserva {cont['Riserva']}  "
          f"Fail {cont['Fail']}\n-> {a.out}\n-> {a.report}")
    sys.exit(0 if cont["Riserva"] == 0 and cont["Fail"] == 0 else 1)


if __name__ == "__main__":
    main()
