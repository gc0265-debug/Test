# Template Report DL/GC — Field Project SAS (layout)

Da generare come .docx (poi convertibile a PDF) seguendo le convenzioni
della skill `docx`.

## Header

- Logo `assets/logo-field-project.png`, centrato, larghezza ~4cm
- Sotto il logo, titolo in maiuscolo, letter-spacing ampio, nero
  (`#1A1A1A`): "REPORT SETTIMANALE CANTIERE"
- Riga informativa: Cantiere · Cliente · Periodo · Data emissione
  (grigio scuro `#4D4D4D`, font regolare)
- Linea sottile orizzontale (non spessa) come separatore, colore rosso
  brand (`#C0332B`) — richiama l'elemento grafico ad arco del logo senza
  riprodurlo letteralmente

## Corpo documento

- Titoli di sezione: maiuscolo, letter-spacing, nero o rosso brand per
  enfasi (es. sezioni con criticità in rosso)
- Corpo testo: minuscolo, font regolare, interlinea 1.15
- Tabelle: intestazione colonna con sfondo grigio chiaro molto tenue
  (mai colori pieni sgargianti), testo nero; usare il rosso brand SOLO
  per evidenziare valori critici (es. NC scadute, squadre 🔴)
- Evitare bordi spessi e cornici piene — coerenza con l'estetica
  minimale del brand (vedi `brand-identity.md`)

## Sezioni (nell'ordine)

1. Executive Summary
2. Avanzamento Fisico (tabella WP/area, come da `project-controller`)
3. Non Conformità (riepilogo + tabella critiche/scadute, come da
   `gestione-non-conformita`)
4. Sicurezza Squadre (solo se rilevante nel periodo)
5. Prossimi 7 Giorni
6. [Solo se richiesto esplicitamente] Varianti in corso

## Footer

- Riga sottile, testo piccolo grigio: "Field Project SAS — Coordinamento
  Attività di Montaggio · [nome coordinatore] · [contatto]"

## Verifica prima della consegna

Dopo aver generato il .docx, convertilo in PDF e rendi le pagine come
immagini per un controllo visivo (vedi istruzioni nella skill `docx`)
prima di presentarlo come output finale — soprattutto per verificare
che il logo e i colori siano resi correttamente.
