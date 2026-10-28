# Meccaniche economiche del SAL — formule e contabilità

Riferimento di calcolo per la skill `sal-controller`. Tutti i parametri
(percentuali, importi, criteri) derivano dal **contratto specifico**: qui si
definisce *come* si calcola, non *quanto* vale un parametro.

## Indice
1. Importo lavori progressivo (a corpo + a misura)
2. Importo del SAL del periodo (riconciliazione)
3. Ritenuta di garanzia
4. Recupero dell'anticipo
5. Penali
6. Cascata completa (esempio numerico)
7. Note di contesto normativo

---

## 1. Importo lavori progressivo

L'importo lavori a tutto il SAL N è la somma del valore di tutte le voci
contabilizzate progressivamente.

**Voci a misura:**
```
Importo voce (progr.) = Quantità progressiva × Prezzo unitario
```
dove `Quantità progressiva` = somma di tutte le quantità rilevate nel libretto
per quella voce, da inizio lavori fino al SAL N incluso.

**Voci a corpo:**
```
Importo voce (progr.) = % avanzamento voce × Importo forfettario voce
```
La % avanzamento di una voce a corpo è la valutazione tecnica di quanto di quella
lavorazione forfettaria è stata completata (non una quantità fisica).

**Totale:**
```
Importo lavori progressivo (N) = Σ Importo voce (progr.)   [tutte le voci]
```

---

## 2. Importo del SAL del periodo (vincolo di riconciliazione)

```
Importo SAL N = Importo lavori progressivo (N) − Importo lavori progressivo (N−1)
```

Questo è un **vincolo**, non un calcolo alternativo. I rilievi del periodo, una
volta valorizzati, devono dare lo stesso numero. Se non quadrano:
- una quantità è stata attribuita al SAL sbagliato, oppure
- un prezzo è cambiato senza variante, oppure
- c'è un errore di codifica voce.

Fermati e trova la discrepanza prima di consegnare.

---

## 3. Ritenuta di garanzia

Trattenuta a garanzia, svincolata di norma a fine lavori / collaudo (spesso contro
fideiussione). Si calcola **sul progressivo**, non sul singolo SAL.

```
Ritenuta progressiva (N) = Importo lavori progressivo (N) × % ritenuta
Ritenuta del periodo (N) = Ritenuta progressiva (N) − Ritenuta progressiva (N−1)
```

La `% ritenuta` è contrattuale. Due regimi tipici da tenere a mente come contesto
(NON come default da applicare d'ufficio):
- **stile lavori pubblici** (D.Lgs. 36/2023): ritenuta dello 0,5% sui SAL;
- **subappalti/privati**: spesso ritenuta a garanzia più alta (es. 5–10%)
  svincolata a collaudo.

Usa sempre il valore del contratto GILI↔GC. Se non è noto, segna `TBD`.

---

## 4. Recupero dell'anticipo

Se è stato corrisposto un anticipo (anticipazione), va recuperato gradualmente sui
SAL, proporzionalmente all'avanzamento.

```
% avanzamento lavori (N) = Importo lavori progressivo (N) / Importo contrattuale

Recupero anticipo progressivo (N) = Importo anticipo × % avanzamento lavori (N)
Recupero del periodo (N) = Recupero progressivo (N) − Recupero progressivo (N−1)
```

A fine lavori (avanzamento 100%) l'anticipo risulta interamente recuperato. Se il
contratto prevede un meccanismo di recupero diverso (es. lineare su n. SAL, o a
soglie), applica quello e annotalo.

---

## 5. Penali

Detrazione per ritardi, secondo la clausola contrattuale.

```
Penale = giorni di ritardo × importo penale giornaliero    (entro il tetto massimo)
```
dove l'importo giornaliero è spesso espresso come ‰ dell'importo contrattuale.

Regole operative:
- la penale **non** modifica l'importo lavori: è una detrazione sul certificato di
  pagamento;
- registra sempre: giorni, clausola di riferimento, calcolo, importo;
- se GILI contesta la penale, applicala con flag `contestata` e mostrala separata,
  così l'acconto è leggibile sia con sia senza la penale contestata;
- non sommare penali già detratte in SAL precedenti (traccia il progressivo penali
  per evitare doppi conteggi).

---

## 6. Cascata completa — esempio numerico

Ipotesi (valori didattici, non reali):
- Importo contrattuale netto: € 1.000.000,00
- Ritenuta di garanzia: 5%
- Anticipo corrisposto: € 200.000,00 (20%)
- SAL precedente (N−1): importo lavori progressivo € 400.000,00
- SAL corrente (N): importo lavori progressivo € 560.000,00
- Penali: nessuna in questo periodo

```
Importo lavori progressivo (N)              €   560.000,00
Importo lavori progressivo (N−1)            €   400.000,00
─────────────────────────────────────────────────────────
Importo lavori del SAL N                    €   160.000,00

CASCATA (sul progressivo):
Importo lavori progressivo (N)              €   560.000,00
− Ritenuta garanzia 5% (progr.)             €    28.000,00
− Recupero anticipo (200k × 56,0%)          €   112.000,00
− Penali                                    €         0,00
─────────────────────────────────────────────────────────
= Importo progressivo da liquidare          €   420.000,00
− Già liquidato a SAL precedenti (*)        €   300.000,00
─────────────────────────────────────────────────────────
= ACCONTO SAL N (netto, ante IVA)           €   120.000,00
```

(*) Il "già liquidato" si ricostruisce con la **stessa** cascata applicata al
progressivo N−1:
`400.000 − (400.000 × 5%) − (200.000 × 400.000/1.000.000)`
`= 400.000 − 20.000 − 80.000 = € 300.000,00`.

Usare sempre questa coerenza: il "già liquidato" non è un valore a parte, è la
cascata del SAL precedente. È l'errore più frequente — se lo si stima a occhio,
l'acconto del periodo è sbagliato.

% avanzamento lavori a tutto il SAL N = 560.000 / 1.000.000 = **56,0%**.

---

## 7. Note di contesto normativo

Riferimenti utili come contesto (l'utente opera nel privato/subappalto, dove vale
il contratto, ma questi istituti orientano la prassi):
- **D.Lgs. 36/2023** (Codice dei contratti) — disciplina anticipazione, SAL,
  certificato di pagamento e ritenute nei lavori pubblici;
- la **contabilità dei lavori** (libretto delle misure, registro di contabilità,
  SAL, stato finale) è la struttura documentale di riferimento anche quando il
  rapporto è privato.

Questo NON è consulenza legale. Le condizioni vincolanti sono quelle del contratto
GILI↔GC; in caso di clausola ambigua, segnalala e invita a verificarla, non
interpretarla d'ufficio.
