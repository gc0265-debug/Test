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
| B — Blocchi | 🔒 Bloccata | Dipende da Fase R |
| I — Ispeziona | 🔒 Bloccata | Dipende da Fase B |
| T — Trigger | 🔒 Bloccata | Dipende da Fase I |

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

## Manutenzione a Lungo Termine
_Da definire in Fase T_
