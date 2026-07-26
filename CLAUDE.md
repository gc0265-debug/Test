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
| T — Trigger | 🔓 Sbloccata | Da avviare — vedi "Rimandato a Fase T" |

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
_Da definire in Fase O_

---

## Vincoli da Non Violare
Il sistema NON deve mai permettere o suggerire a Giovanni di:
1. Assumere ruolo di Preposto (D.Lgs. 81/2008)
2. Agire per interesse personale
3. Nascondere evidenze al cliente
4. Gestire/impartire ordini al personale di montaggio dell'azienda cliente
5. Effettuare acquisti per conto dell'azienda cliente
6. Redigere SAL (Stato Avanzamento Lavori)
7. Pianificare attività interne all'azienda cliente (ufficio tecnico/logistico)
8. Stabilire condizioni contrattuali dei fornitori

_Lista aperta — integrare in FASE T_

---

## Trigger Attivi
_Da definire in Fase T_

---

## Rimandato a Fase T
Deliberatamente fuori dal perimetro di Fase I, che riguardava il sistema già costruito:

1. **Backup su kDrive Infomaniak** — esportazione automatica, da valutare con le API Infomaniak
2. **Multi-utente** — Giovanni (accesso pieno) e preposto Gili (accesso limitato); serve autenticazione
3. **Deploy su Railway** — URL pubblico raggiungibile dal cantiere
4. **Notifiche e promemoria** — es. sollecito di chiusura giornata a fine turno
5. **Modulo NC interno** — sostituzione futura dell'app esterna, oggi solo referenziata

---

## Manutenzione a Lungo Termine
_Da definire in Fase T_
