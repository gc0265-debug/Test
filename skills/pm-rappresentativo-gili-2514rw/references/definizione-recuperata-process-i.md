# Definizione recuperata — agente Process-I (non più il contenuto della skill)

Questo è il testo recuperato da `PM-Rappresentativo-GILI-2514RW.md`
(Google Drive, 06/07/2026) e conservato per tracciabilità.

Decisione del 21/09/2026: la mappatura dei processi resta coperta da
`mappa-tesoro` (ricognizione) e `skill-creator` (scrittura), che non
vengono modificate. La skill è stata ri-mirata sul presidio, che è
invece un processo scoperto. Vedi `../SKILL.md`.

---

# PM Rappresentativo GILI — 2514RW

## Agente Process-I: mappatura processi e generazione skill

> **Provenienza.** Definizione recuperata da
> `PM-Rappresentativo-GILI-2514RW.md` (Google Drive, 06/07/2026), a sua
> volta ricostruita da un briefing precedente. La skill era referenziata
> da `cruscotto-mensile` come fonte dati ma non è mai esistita come
> skill attiva. Vedi § 6 per lo scostamento ancora aperto.

---

## 1. Scopo

Agente esperto in mappatura di processi (Process-I), applicabile in
primis al settore legno/arredamento contract ma trasferibile ad altri
contesti. Obiettivo in due fasi:

1. **Mappare** i processi aziendali non ancora coperti da una skill,
   attraverso un percorso guidato di interviste al cliente (in questo
   caso Giovanni Cazzola / Field Project SAS).
2. **Costruire** una skill dedicata per ogni processo mappato che sia
   automatizzabile, includendo metriche statistiche che quantifichino
   il valore risparmiato in termini di tempo.

Rappresenta, all'interno della commessa 2514RW, il punto di raccolta
strutturato delle esigenze di processo lato PM/DdC prima che diventino
skill operative — da cui il nome "rappresentativo".

## 2. Ambito di applicazione

- Contesto primario: commessa 2514RW Hotel Rosewood Roma, ma la
  metodologia è generale e si applica a qualunque nuovo processo di
  Field Project SAS, anche su altre commesse.
- Non sostituisce le skill già esistenti: si attiva solo quando un
  processo NON è già coperto da una skill attiva, o quando una skill
  esistente necessita un'estensione significativa.

## 3. Metodologia Process-I (mandatoria)

### Fase 1 — Intervista guidata

Raccogliere per il processo candidato:

- **Trigger**: cosa fa scattare il processo (evento, scadenza, documento ricevuto)
- **Attori**: chi è coinvolto e con quale ruolo (DdC, PM, preposto, GC, DL, Advisor, fornitore)
- **Stato attuale**: come viene gestito oggi (manuale, Excel, email, a memoria)
- **Dove è tracciato**: se esiste già un registro, file o strumento che lo supporta parzialmente

### Fase 2 — Controllo sovrapposizioni

Verificare esplicitamente contro l'inventario skill attivo se il processo:

- è già coperto integralmente → non si procede, si segnala la skill esistente
- è parzialmente coperto → si valuta l'estensione della skill esistente invece di crearne una nuova
- non è coperto → si procede alla Fase 3

### Fase 3 — Sintesi e conferma

Presentare una sintesi del processo mappato (trigger, attori, output,
confini con skill esistenti) e attendere conferma esplicita dell'utente
prima di costruire qualunque file.

### Fase 4 — Validazione tecnica

Se confermato, costruire la skill secondo lo standard Field Project SAS:

- `description` in YAML block scalar (`>`), sotto i 1024 caratteri
- validazione con lo script di packaging della skill
- test su dati reali della commessa, non esempi inventati

### Fase 5 — Metriche di valore (sempre separate)

Ogni skill generata deve dichiarare esplicitamente a quale delle due
metriche appartiene, senza mai fonderle:

| Metrica | Quando si applica | Unità |
|---|---|---|
| **Tempo risparmiato** | Solo per attività che oggi vengono già svolte manualmente | ore/mese |
| **Rischio intercettato / controlli eseguiti** | Per controlli che oggi NON vengono svolti (nuova copertura, non sostituzione di lavoro manuale) | conteggio |

Le baseline vanno segnalate come stime finché non sono validate su casi
reali della commessa.

## 4. Output atteso per ogni ciclo

1. Sintesi del processo mappato (Fase 1+2, in forma di verbale intervista)
2. Nuova skill (SKILL.md + eventuali script/template) oppure estensione di una esistente
3. Scheda metrica associata (tempo risparmiato oppure rischio intercettato — mai entrambe sullo stesso conteggio)
4. Aggiornamento dell'indice dell'ecosistema skill con la nuova voce

## 5. Note e limiti

- Questo agente non esegue autonomamente la costruzione della skill
  senza passare dalla Fase 3 (conferma esplicita) — evita di creare
  skill non necessarie o sovrapposte.
- Non gestisce metriche economiche (SAL, fatturazione) — di competenza
  di `sal-controller`.
- Attivazione tipica: "voglio automatizzare [processo]", "non abbiamo
  ancora una skill per...", "mappiamo questo processo".

## 6. Scostamento aperto con cruscotto-mensile

`cruscotto-mensile` interroga questa skill per dati che la definizione
qui recuperata **non produce**:

| Il cruscotto chiede | Questa skill produce |
|---|---|
| % riunioni 2514RW coperte da AT | — |
| Completezza SAL consolidato (WP presenti su 4) | — |
| NC su WP2-4 comunicate da AT, non dai PM di WP | — |
| «Gap evitato: riunioni scoperte, SAL non consolidati, NC mal gestite» (metrica qualitativa) | — |

Sono le metriche di un presidio operativo di commessa — qualcuno che
copre il ruolo di PM per GILI su 2514RW — non di un agente di mappatura
processi. Delle due definizioni una sola può restare:

1. **La definizione recuperata è quella giusta** → vanno corrette le
   sezioni 7 e la tabella ore di `cruscotto-mensile`, che chiedono a
   questa skill dati che non le competono.
2. **Il presidio operativo è quello giusto** → questa definizione è una
   ricostruzione errata e va riscritta da zero sul ruolo reale, con i
   quattro indicatori qui sopra come output.

Finché lo scostamento resta aperto, il KPI «PM rappresentativo 2514RW»
del cruscotto mensile va presentato come non disponibile, non come zero.
