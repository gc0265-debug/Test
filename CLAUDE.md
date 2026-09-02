# CLAUDE.md — Costituzione del Progetto

> Framework: O.R.B.I.T. | Ruolo: System Pilot
> Principio #1: Affidabilità prima della velocità. Non indovinare MAI la logica del business.

---

## Stato Fasi

| Fase | Stato | Note |
|------|-------|------|
| 0 — Contesto azienda | ✅ Completata | Vedi memoria/contesto-azienda.md |
| O — Obiettivo | ✅ Completata | Vedi memoria/contesto-azienda.md — sezione FASE O |
| R — Reti | ✅ Completata | Vedi memoria/contesto-azienda.md — sezione FASE R |
| B — Blocchi | ✅ Completata | Schema v3, API, wizard di chiusura a 7 passi |
| I — Ispeziona | ✅ Completata | Vedi memoria/ispezione-fase-I.md |
| T — Trigger | ✅ Completata | Vedi memoria/trigger-fase-T.md |

Il ciclo O.R.B.I.T. è chiuso.

**Prossimo passo reale: il deploy su Railway** — richiede l'account di Giovanni,
procedura in `DEPLOY.md`. Il volume persistente va creato **prima** di caricare dati
veri, altrimenti l'archivio si azzera a ogni pubblicazione.
Quello che resta oltre il deploy è in "Rimandato oltre la Fase T", in fondo.

---

## Schema Dati

```
Commessa → WP → Lavorazione
                  ├── Giornale (presenze, zone, attività, materiali, spese)
                  ├── Riferimento NC (link/nota → app esterna, modulo interno futuro)
                  ├── Tempi montaggio (→ KPI storici per skill estimate)
                  └── Documenti / foto
```

---

## Regole di Comportamento

Come il sistema si comporta. Discendono dalle risposte di Fase O
(vedi `memoria/contesto-azienda.md`, Q2–Q4 e perimetro di competenza).

1. **Registro formale professionale.** Ogni testo prodotto — report, giornale,
   avvisi — è scritto per Giovanni e per i PM del team interno ed esterno.
   Niente informalità, niente gergo tecnico non necessario.

2. **Il sistema registra fatti, non li interpreta.** Annota ciò che è accaduto:
   chi era presente, cosa è arrivato, cosa è stato speso. Le valutazioni e le
   conclusioni restano di Giovanni. Nessun output deve leggersi come un giudizio
   o una decisione presa dal sistema.

3. **Ogni evento va ricondotto a Tempi, Costi o Qualità.** È l'asse su cui
   Giovanni presidia la commessa: una funzione che non serve a tracciare uno dei
   tre non appartiene a BFP.

4. **Il sistema resta dentro il perimetro contrattuale.** Non propone né facilita
   azioni che ricadono nell'OUT of scope del Direttore di Cantiere. Nel dubbio si
   chiede, non si assume.

5. **Affidabilità prima della velocità.** Nessuna logica di business inventata.
   Se un dato manca o una soglia non è stata decisa, si domanda — non si sceglie
   un valore plausibile.

6. **Recuperabilità a mesi di distanza.** È il criterio con cui si giudica se una
   funzione serve davvero: non basta che un dato entri, deve poter essere ritrovato
   quando servirà.

---

## Vincoli da Non Violare

Cosa il sistema non deve mai fare. Distinti dalle Regole di Comportamento qui sopra:
quelle dicono *come* si comporta, questi dicono *cosa non deve accadere mai*.

Il sistema NON deve mai permettere o suggerire a Giovanni di:
1. Assumere ruolo di Preposto (D.Lgs. 81/2008)
2. Agire per interesse personale
3. Nascondere evidenze al cliente
4. Gestire/impartire ordini al personale di montaggio dell'azienda cliente
5. Effettuare acquisti per conto dell'azienda cliente
6. Redigere SAL (Stato Avanzamento Lavori)
7. Pianificare attività interne all'azienda cliente (ufficio tecnico/logistico)
8. Stabilire condizioni contrattuali dei fornitori

**Lista aperta per volontà di Giovanni**, non per una fase rimasta da completare:
altri vincoli si aggiungono qui man mano che emergono sul campo. Ogni aggiunta va
riportata anche in `memoria/contesto-azienda.md` (Q5), che è la fonte.

---

## Trigger Attivi

| Trigger | Condizione | Effetto |
|---|---|---|
| Chiusura non registrata | Cantiere attivo senza giornale per la data odierna, oltre l'ora impostata | Avviso in dashboard con collegamento al wizard |

Configurabile da **Impostazioni**: attivo/spento, ora di soglia, salto del weekend.
Il controllo avviene alla lettura della dashboard — non esistono notifiche push.

---

## Manutenzione a Lungo Termine

- **Backup**: scaricare il JSON completo da Impostazioni e caricarlo su kDrive.
  Cadenza consigliata: settimanale, insieme all'ultima chiusura.
- **Deploy**: vedi `DEPLOY.md`. Il volume persistente e `DATABASE_PATH` vanno
  configurati **prima** di caricare dati veri.
- **Fuso orario**: `TZ_APP` deve valere `Europe/Rome`. Da Impostazioni si verifica
  che il server stia leggendo l'ora giusta.

---

## Rimandato oltre la Fase T

Deciso insieme, non dimenticato:

1. **Caricamento automatico su kDrive** — oggi il backup si scarica a mano. Serve
   verificare il metodo di accesso Infomaniak (API o WebDAV) prima di scrivere codice.
2. **Multi-utente** — il preposto Gili non entra ancora. Prima va consolidato il
   rituale su un solo utente, poi si definisce il confine dei permessi.
3. **Autenticazione** — l'applicazione è aperta a chi conosce l'indirizzo.
   Necessaria prima di condividere il dominio.
4. **Ripristino da backup** — il file JSON protegge i dati ma la reimportazione
   non è implementata.
5. **Modulo NC interno** — sostituzione dell'app esterna, oggi solo referenziata.
6. **Altri trigger** — NC ferma da troppi giorni, materiale non conforme senza NC
   collegata, riepilogo settimanale. Il meccanismo degli avvisi è già predisposto
   per accoglierli: si aggiunge una funzione in `avvisiService.js`.
