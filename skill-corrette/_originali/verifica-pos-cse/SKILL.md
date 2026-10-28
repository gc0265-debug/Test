---
name: verifica-pos-cse
description: >
  Verifica il POS (Piano Operativo di Sicurezza) di un fornitore prima dell'invio al CSE,
  in cantieri di montaggio arredi su misura (hotel, ville, retail). Controlla 6 aree critiche:
  attestati sicurezza e validità, rischi generali, rischi specifici per mansione, firme
  obbligatorie (RSPP/DL/medico), dati anagrafici operatori, dati formali aziendali e coerenza
  cantiere. Produce report interno GO/NO-GO e bozza email al fornitore con integrazioni
  richieste. Usa per: verifica POS, POS da mandare al CSE, controllare POS fornitore,
  POS incompleto, piano operativo sicurezza, POS prima dell'invio, devo verificare il POS,
  POS ok per il coordinatore sicurezza. Attiva anche se l'utente dice "ho ricevuto il POS"
  o "devo mandare il POS al CSE" — quasi sempre serve verifica prima dell'invio.
---

# Verifica POS — Invio al CSE | Field Project SAS

## Obiettivo

Trasformare il processo di verifica del POS da ~4h di lettura manuale a ~30 minuti
di revisione guidata, con output pronti: report interno + email fornitore.

**Regola fondamentale**: nessun POS viene dichiarato GO senza aver verificato
tutte e 6 le aree critiche. In caso di dubbio su un punto → NO-GO parziale,
non ottimismo.

---

## Step 0 — Raccolta input

Prima di procedere, verifica che l'utente abbia fornito:

1. **Il PDF del POS** (allegato o path) → leggilo con il tool di lettura PDF
2. **Nome cantiere e codice commessa** (es. 2514RW — Hotel SAC)
3. **Tipologia lavorazioni previste** (es. montaggio arredi, posa pavimenti,
   installazione cucine) — serve per verificare coerenza rischi specifici
4. **Data prevista inizio lavori** — serve per verificare validità attestati
5. **Nome del CSE** a cui verrà inviato (se noto — per personalizzare l'output)

Se mancano il PDF o il codice cantiere, chiedi prima di procedere.
Se mancano gli altri dati, usa "N/D" e segnalalo nel report.

Per leggere il PDF: usa il tool di lettura file/PDF disponibile, oppure
se è già incollato come testo nell'utente, usalo direttamente.

---

## Le 6 Aree di Verifica

Per ogni area: stato **✔ OK** / **⚠ PARZIALE** / **✗ MANCANTE**.
Un'area PARZIALE o MANCANTE → il POS è NO-GO su quell'area.

---

### AREA 1 — Attestati di sicurezza e validità

Verifica per **ogni operatore nominato nel POS**:

| Documento | Cosa controllare |
|-----------|-----------------|
| Formazione generale (D.Lgs.81 art.37) | Presente, data corso, validità (rinnovo ogni 5 anni) |
| Formazione specifica per rischio | Coerente con le mansioni dichiarate nel POS |
| Attestato primo soccorso | Presente se richiesto dal DVR aziendale |
| Attestato antincendio | Presente se richiesto dal DVR aziendale |
| Abilitazioni speciali | PLE, carrelli, ponteggi — solo se le lavorazioni le richiedono |

**Flag critico**: se la data di scadenza di un attestato cade **prima della
data di fine lavori prevista** → NO-GO immediato su quell'operatore.

**Flag critico**: se gli operatori sono nominati ma gli attestati non sono
allegati né referenziati → NO-GO.

---

### AREA 2 — Valutazione rischi generali

Verifica che il POS contenga:

- [ ] Identificazione dei rischi generali presenti in cantiere
      (caduta, elettrico, rumore, polveri, movimentazione manuale carichi)
- [ ] Misure di prevenzione e protezione per ciascun rischio identificato
- [ ] DPI previsti (con riferimento a norma EN dove applicabile)
- [ ] Procedure di emergenza ed evacuazione (anche sintetiche)
- [ ] Riferimento al PSC (Piano di Sicurezza e Coordinamento) se presente
      in cantiere — il POS deve essere **coerente** con il PSC, non
      contraddirlo

**Errore frequente**: POS con lista rischi generica copiata da template,
non adattata al tipo di cantiere (es. rischio caduta dall'alto dichiarato
ma nessuna lavorazione in quota prevista → incoerenza da segnalare).

---

### AREA 3 — Valutazione rischi specifici per mansione

Questa è l'area più spesso carente. Per ogni mansione dichiarata nel POS
(es. falegname, posatore, elettricista, gruista):

- [ ] Rischi specifici della mansione identificati
- [ ] Misure di prevenzione specifiche (non generiche)
- [ ] DPI specifici per quella mansione
- [ ] Procedure operative specifiche (es. uso attrezzature, sequenza lavori)

**Flag critico**: se il POS descrive la mansione "montatore arredi" ma non
valuta rischi specifici come tagli, schiacciamenti, movimentazione carichi
pesanti, posture incongrue → NO-GO su questa area.

---

### AREA 4 — Firme obbligatorie

Il POS deve riportare le firme (autografe o digitali qualificate) di:

| Firma | Obbligatoria | Note |
|-------|-------------|------|
| Datore di lavoro o delegato | ✔ Sempre | Con data |
| RSPP (Responsabile SPP) | ✔ Sempre | Con qualifica e n° iscrizione se applicabile |
| RLS (Rappresentante Lavoratori) | ✔ Sempre | O dichiarazione di elezione/assenza |
| Medico competente | ✔ Se sorveglianza sanitaria prevista | Con n° iscrizione Ordine |
| Operatori destinatari | Consigliato | Per presa visione — segnala se assente |

**Flag critico**: firma del RSPP o del datore assente → NO-GO.
**Flag attenzione**: firma del medico assente quando il DVR prevede
sorveglianza sanitaria → segnala come NO-GO motivato.

---

### AREA 5 — Dati anagrafici operatori

Per ogni lavoratore nominato nel POS:

- [ ] Nome e cognome completo
- [ ] Data di nascita
- [ ] Mansione svolta in cantiere
- [ ] Datore di lavoro di appartenenza (importante in caso di distacco
      o subappalto a cascata)
- [ ] Numero tessera di riconoscimento (se già assegnata)

**Errore frequente**: operatori indicati come "TBD" o "da definire" →
accettabile solo se il POS indica esplicitamente che verrà integrato
prima dell'accesso. Segnalare comunque come PARZIALE.

---

### AREA 6 — Dati formali aziendali e coerenza cantiere

**Dati aziendali**:
- [ ] Ragione sociale e P.IVA del subappaltatore
- [ ] Sede legale e sede operativa
- [ ] Posizione INAIL (PAT)
- [ ] Posizione INPS / matricola aziendale
- [ ] Codice ATECO coerente con le lavorazioni svolte
- [ ] Riferimento al contratto collettivo applicato (CCNL)

**Coerenza con il cantiere specifico**:
- [ ] Il POS riporta il nome/indirizzo corretto del cantiere
- [ ] Le lavorazioni descritte corrispondono a quelle effettivamente
      previste per quel cantiere (non un POS generico riciclato)
- [ ] Le interferenze con altre squadre/attività sono menzionate
      se il cantiere è condiviso
- [ ] Il cronoprogramma (anche semplificato) è presente o referenziato

---

## Calcolo Esito Finale

| Aree OK | Aree PARZIALE | Aree MANCANTE | Esito |
|---------|---------------|---------------|-------|
| 6 | 0 | 0 | 🟢 **GO — Inviabile al CSE** |
| 4-5 | 1-2 | 0 | 🟡 **GO CONDIZIONALE** — Invia con nota al CSE |
| Qualsiasi | Qualsiasi | ≥1 | 🔴 **NO-GO** — Rimandare al fornitore |

> Se l'area MANCANTE è Area 4 (firme) → NO-GO automatico indipendentemente
> dal resto. Il CSE non può accettare un POS senza firme.

---

## Output da generare

### OUTPUT 1 — Report Word con tabella semaforica (SEMPRE)

Al termine di ogni verifica POS genera automaticamente un file Word (.docx)
in stile Field Project SAS con tabella semaforica. Usa python-docx.

**Logica semafori per riga di area:**
- 🟢 VERDE (hex #1A7A3C su sfondo #D6F0E0): area completamente OK, nessuna azione richiesta
- 🟡 GIALLO (hex #B8860B su sfondo #FFF3CD): area PARZIALE, integrazioni richieste ma non bloccanti
- 🔴 ROSSO (hex #CC0000 su sfondo #FDDEDE): area MANCANTE o con carenze bloccanti → NO-GO

**Struttura del documento Word:**

1. **Header**: barra nera con "FIELD PROJECT SAS" a sinistra, barra rossa con "VERIFICA POS — D.Lgs.81/2008" a destra

2. **Dati identificativi** (tabella 2 colonne etichetta/valore):
   - Cantiere / Codice commessa
   - Fornitore / Subappaltatore
   - CSE destinatario
   - Data inizio lavori
   - Data verifica
   - Verificato da: Field Project SAS

3. **Esito complessivo** (cella colorata centrata, testo bold grande):
   - 🟢 GO — INVIABILE AL CSE (sfondo verde)
   - 🟡 GO CONDIZIONALE (sfondo giallo)
   - 🔴 NO-GO — RIMANDARE AL FORNITORE (sfondo rosso)

4. **Tabella verifica 6 aree** (colonne: Area | Semaforo | Stato | Findings | Azioni richieste):
   - Una riga per area, sfondo cella Semaforo colorato secondo stato
   - Colonna "Semaforo": testo "OK" / "PARZIALE" / "MANCANTE" in bold bianco su sfondo colorato
   - Colonna "Findings": sintesi concisa di cosa è stato trovato
   - Colonna "Azioni richieste": elenco puntato delle integrazioni necessarie per quell'area

5. **Sezione azioni** (dopo la tabella):
   - "AZIONI BLOCCANTI — Da completare prima dell'invio al CSE" (titolo rosso)
   - Elenco numerato delle azioni obbligatorie con responsabile (Creative Srl)
   - "AZIONI NON BLOCCANTI — Da segnalare al CSE in nota" (titolo arancio)
   - Elenco numerato

6. **Footer**: riga grigia con "Field Project SAS — Coordinamento Montaggi Arredi su Misura | D.Lgs.81/2008 | Stato al [data]"

**Salva il file in** `/mnt/user-data/outputs/` con nome:
`Report_Verifica_POS_[CodiceCommessa]_[RagioneSociale]_[DataVerifica].docx`

Dopo aver creato il file usa `present_files` per renderlo scaricabile.
Poi presenta anche il report come testo in chat (sintesi breve) per leggibilità immediata.

Genera sempre il report Word, anche se l'esito è GO — serve comunque come documentazione.

### OUTPUT 2 — Email al fornitore (solo se NO-GO o GO CONDIZIONALE)

Per come costruire l'email leggi `references/template-email-pos.md`.

Regole:
- Una email per fornitore, anche se le aree mancanti sono più di una
- Elenca le integrazioni richieste in modo numerato e chiaro,
  **senza usare linguaggio tecnico-legale incomprensibile**
- Indica sempre la **data entro cui serve la versione corretta**
  (di default: 3 giorni lavorativi prima della data di inizio lavori)
- Tono: fermo ma collaborativo — non accusatorio
- Firma: Field Project SAS, ruolo di Coordinatore Montaggi
- Non mandare automaticamente — presentala come bozza da approvare

---

## Metriche di tempo risparmiato

| Fase | Manuale | Con skill | Risparmio |
|------|---------|-----------|-----------|
| Lettura e analisi POS | 3h | 15 min | ~2h 45min |
| Redazione report interno | 45 min | 5 min | ~40 min |
| Stesura email fornitore | 30 min | 5 min | ~25 min |
| **TOTALE per POS** | **~4h** | **~25 min** | **~3h 35min** |

Con 2-4 POS/mese → **7-14h/mese recuperate**.
A 80€/h di consulenza → **560-1.120€/mese di valore generato**.

Riduzione rimandi dal CSE: se il POS è verificato su tutte e 6 le aree
prima dell'invio, la probabilità di rimando si riduce drasticamente
(da "spesso" a casi residuali per requisiti specifici del CSE).
Ogni rimando evitato = ~1h in meno di gestione iterazione.

Aggiorna queste stime con i dati reali man mano che la skill viene usata.

---

## Errori da evitare

- **Non dichiarare GO con aree incomplete**: meglio un NO-GO motivato
  che un rimando dal CSE in fase di cantiere.
- **Non usare un template generico di POS come riferimento assoluto**:
  i requisiti possono variare per tipologia di cantiere e per il
  CSE specifico — adatta la verifica al contesto.
- **Non confondere questa skill con cantiere-sicurezza-onboarding**:
  quella verifica SE i documenti sono stati consegnati (presenza);
  questa verifica il CONTENUTO del POS (qualità e completezza).
- **Non generare l'email al fornitore senza mostrarla prima all'utente**:
  è sempre una bozza da approvare, mai un invio automatico.
