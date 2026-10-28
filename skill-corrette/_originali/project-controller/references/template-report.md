# Template Report e Newsletter

Questo documento contiene i template per gli output documentali
della skill project-controller.

---

## Report Avanzamento per DL/GC (Word/PDF)

### Struttura

```
REPORT AVANZAMENTO LAVORI N. [progressivo]
Progetto: [nome] — Codice: [codice]
Periodo di riferimento: dal DD/MM/YYYY al DD/MM/YYYY
Data emissione: DD/MM/YYYY
Emesso da: [nome], Site Manager — GILI Creations S.r.l.

───────────────────────────────────────────────

1. RIEPILOGO ESECUTIVO

[1 paragrafo, max 5 righe. Stato generale del progetto, % avanzamento
complessivo, confronto con programma, criticità principali. Tono fattuale,
niente aggettivi. Esempio: "L'avanzamento complessivo del progetto si
attesta al 47.3%, in linea con il programma previsto (48.0%). Il WP
Corridoi presenta un ritardo di 8 giorni dovuto al fermo per variante
VAR-2514RW-005-2026, attualmente in stato Sospeso."]

2. AVANZAMENTO PER WORK PACKAGE

[Tabella con colonne: WP | % Attuale | % Programma | Delta | Stato]

Stato usa icone testuali:
● In linea (delta ≥ -2%)
▲ In anticipo (delta > +5%)
▼ In ritardo (delta < -5%)
◆ Critico (delta < -15%)

[Per ogni WP con delta significativo (>5%), 2-3 righe di spiegazione
della causa e delle azioni in corso]

3. VARIANTI ATTIVE

[Tabella sintetica: Codice | Stato | Descrizione breve | Impatto tempo]

[Evidenziare le varianti Sospese da > 14 giorni con nota di sollecito]

4. PROGRAMMA PROSSIMO PERIODO

[Lista delle attività previste per il prossimo periodo di report:
- Cosa si prevede di completare
- Milestone attese
- Criticità da monitorare
- Decisioni pendenti (varianti sospese che servono)]

5. ALLEGATI
- Dashboard avanzamento (se generato Excel)
- Registro varianti aggiornato (se richiesto)
```

### Note di formattazione Word
- Font: Calibri 11pt per corpo, 14pt per titolo
- Margini: 2.5cm tutti i lati
- Intestazione: logo GILI a sinistra (se disponibile), codice progetto a destra
- Piè di pagina: "Pagina X di Y" centrato
- Tabelle: bordi sottili, intestazione con sfondo blu scuro (#1F4E79) e testo bianco
- Nessuna decorazione superflua — il report deve essere pulito e leggibile

---

## Scheda Variante Singola (Word/PDF)

### Struttura

```
SCHEDA VARIANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Codice: VAR-[CODICE]-[NNN]-[ANNO]
Progetto: [nome] — [codice]
Data emissione: DD/MM/YYYY
Stato attuale: [PROPOSTA / EMESSA / ...]

───────────────────────────────────────────────

ORIGINE DELLA VARIANTE
Richiesta da: [GC/DL] oppure [GILI Creations]
Data identificazione: DD/MM/YYYY
Riferimento: [email, verbale riunione, RFI n., disegno rev.]

DESCRIZIONE DELLA MODIFICA
[Descrizione chiara e dettagliata di cosa cambia rispetto al
progetto originale. Riferimenti a disegni, specifiche, campioni.
Se possibile, indicare "era → diventa".]

MOTIVAZIONE
[Perché è necessaria questa variante. Cause tecniche, richieste
del cliente, problemi riscontrati in cantiere, ecc.]

IMPATTO SUL PROGRAMMA
WP impattati: [lista]
Aree impattate: [lista]
Impatto temporale: [+N giorni / nessuno / da valutare]
Dettaglio: [spiegazione dell'impatto sulla sequenza attività]

IMPATTO ECONOMICO (se applicabile)
Stima delta costo: [€ / da quantificare / nessuno]
Dettaglio: [composizione del delta]

RACCOMANDAZIONE GILI
[Parere tecnico: approvare / approvare con riserva / richiedere
modifiche. Motivazione della raccomandazione.]

───────────────────────────────────────────────

Approvazione:

GILI Creations: ________________  Data: __/__/____

DL:            ________________  Data: __/__/____

GC:            ________________  Data: __/__/____
```

---

## Blocco Newsletter Settimanale

### Formato avanzamento

```
📊 AVANZAMENTO PROGETTO — Settimana [N] ([DD/MM - DD/MM])

Avanzamento complessivo: XX.X% (programma: YY.Y%)

• [WP più avanzato]: XX% — [nota breve, es. "completamento previsto entro settimana 12"]
• [WP meno avanzato/critico]: XX% — [causa del ritardo e azione in corso]

Milestone settimana: [cosa è stato completato]
Prossimi step: [cosa si prevede per la settimana entrante]
```

### Formato varianti (quando ci sono novità)

```
🔄 VARIANTI — Aggiornamento

[N] varianti attive: [n] approvate, [n] in attesa, [n] sospese

[Se ci sono varianti nuove o cambi di stato significativi:]
• VAR-XXX: [breve descrizione] → passata a stato [STATO]
• VAR-YYY: in sospeso da [N] giorni — in attesa di [cosa serve]

Impatto cumulativo programma: [+/- N giorni]
```

### Regole per la newsletter
- Massimo 8-10 righe totali tra avanzamento + varianti
- Usare emoji con parsimonia (solo 📊 e 🔄 come separatori di sezione)
- Niente linguaggio allarmistico — i problemi si descrivono con i numeri
- Se tutto è in linea, dirlo in 3 righe e basta
- Se ci sono criticità, essere specifici su causa e azione, non vaghi
