# Piano di Progetto

## Stato attuale
- [x] FASE 0 — Contesto azienda
- [x] FASE O — Obiettivo (Discovery)
- [x] FASE R — Reti (Connettività)
- [x] FASE B — Blocchi (Costruzione)
- [x] FASE I — Ispeziona (Raffinamento)
- [x] FASE T — Trigger (Avvio)

Il ciclo O.R.B.I.T. è chiuso. Lo stato di riferimento resta `CLAUDE.md`.

## Obiettivo
BFP è il sistema operativo di cantiere di Giovanni Cazzola: consente di chiudere ogni giornata in ≤15 minuti con la certezza che tutti gli eventi rilevanti siano stati registrati correttamente e siano recuperabili anche mesi dopo.

## Moduli Fase B
1. Giornale di cantiere — rituale 15 min (presenze, zone, attività, materiali, spese)
2. Riferimento NC — aggancio all'app esistente (modulo interno pianificato per futuro)
3. KPI Tempi — raccolta tempi per tipologia arredo → database storico skill estimate
4. Report — output formali per GC e interni Gili (PM + ufficio tecnico)

## Consuntivo delle fasi

| Fase | Cosa ha prodotto | Dove è documentata |
|------|------------------|--------------------|
| **0 — Contesto** | Identità, perimetro di competenza da contratto, Q1–Q5 | `contesto-azienda.md` |
| **O — Obiettivo** | Il rituale di chiusura (9 input), la tabella degli output, la decisione di lasciare l'app NC esterna | `contesto-azienda.md` — sezione FASE O |
| **R — Reti** | Dispositivi (smartphone, tablet, MacBook Air 13"), utenti, connessioni esterne, kDrive come destinazione dei backup | `contesto-azienda.md` — sezione FASE R |
| **B — Blocchi** | Schema dati v3, API, wizard di chiusura a 7 passi, layer Work Package | commit `b45322d` e successivi |
| **I — Ispeziona** | Dettaglio giornata, report per WhatsApp/email, pagina KPI tempi, gestione stato NC. Sei difetti corretti | `ispezione-fase-I.md` |
| **T — Trigger** | Promemoria di chiusura configurabile, backup scaricabile, configurazione di deploy, servizio del fuso orario | `trigger-fase-T.md` |

## Prossimo passo reale

**Deploy su Railway** — richiede l'account di Giovanni. Procedura in `DEPLOY.md`.
Il volume persistente e `DATABASE_PATH` vanno configurati **prima** di caricare
dati veri, altrimenti l'archivio si azzera a ogni pubblicazione.

I lavori rimandati oltre la Fase T sono elencati in `CLAUDE.md`.
