---
name: verifica-pos-cse
description: >
  Controlla la completezza documentale del POS (Piano Operativo di Sicurezza) di
  un fornitore di montaggio, a supporto di GILI e del preposto, prima che GILI lo
  inoltri all'ufficio sicurezza del GC (Progesim, SAC) per la validazione dei
  permessi di accesso. Controlla 6 aree (attestati e validità, rischi generali,
  rischi specifici per mansione, firme, dati anagrafici operatori, dati aziendali
  e coerenza cantiere) e produce un report Word di completezza con semafori e la
  bozza di email al fornitore che GILI invierà. Usala quando l'utente dice: verifica
  POS, ho ricevuto il POS, POS da mandare al CSE o all'ufficio sicurezza, controllare
  POS fornitore, POS incompleto, POS corretto da ricontrollare.
---

# Verifica completezza POS | Field Project SAS per GILI

## Regole che non si rompono

- **Field Project non valida il POS.** La validazione spetta all'ufficio
  sicurezza del GC (Progesim, SAC). Il report dice solo se il POS è *completo*
  rispetto a quanto richiesto, mai che è "approvato", "idoneo" o "inviabile".
  Motivo: il DdC opera come consulente di GILI, non è preposto né impresa
  esecutrice; un giudizio di idoneità sposterebbe su di lui una responsabilità
  che non ha.
- **Nessuna email parte da qui.** L'email al fornitore è una bozza per GILI
  (Luca Cristofari, preposto, o Marco Gili), che la invia a nome proprio. In Claude
  Code, l'hook di conferma invio (se installato) chiede conferma prima di
  qualsiasi strumento di invio.
- **Nel dubbio un'area è PARZIALE, non OK.** Un'integrazione chiesta prima costa
  un'email; un rimando dall'ufficio sicurezza costa giorni di accesso al cantiere.
- In questa skill "DL" significa **Datore di Lavoro** (dell'impresa che firma il
  POS). La Direzione Lavori è sempre "DLL" e qui non interviene.

## Il bivio

- **Prima verifica di un POS** → segui i passi 0-4.
- **Riverifica di un POS corretto dal fornitore** → chiedi il report della
  verifica precedente, poi segui i passi 0-4 controllando prima le azioni
  richieste allora (risolte / non risolte), poi le 6 aree per intero: una
  correzione può aver introdotto un errore altrove. Nel report aggiungi la
  colonna "Rispetto alla verifica del [data]".

## Lista da copiare nella risposta e spuntare

```
- [ ] 0. Input: PDF POS, codice commessa, lavorazioni, date inizio e fine
- [ ] 1. Aree 1-6 valutate, ognuna con pagina del POS citata
- [ ] 2. Esito calcolato con la tabella
- [ ] 3. Report Word generato e controllato
- [ ] 4. Bozza email per GILI (solo se esito non COMPLETO)
- [ ] 5. Controllo finale superato
```

## Passo 0 — Raccolta input

Servono:
1. **PDF del POS** → leggilo con lo strumento di lettura PDF disponibile
2. **Codice commessa e cantiere** (es. 2514RW — Hotel Rosewood Roma)
3. **Lavorazioni previste** per il fornitore (per la coerenza dei rischi)
4. **Data inizio e data fine prevista** della presenza del fornitore in
   cantiere (le scadenze degli attestati si confrontano con la fine)
5. **Fornitore** e referente

Senza PDF o codice commessa, chiedili prima di procedere. Se manca la data di
fine, usa la data di inizio e scrivi nel report che le scadenze sono state
verificate solo all'inizio lavori. Gli altri dati mancanti diventano "N/D" nel
report.

## Passo 1 — Le 6 aree

Per ogni area: **OK** / **PARZIALE** / **MANCANTE**, con la pagina del POS
come prova. Per i riferimenti di legge (contenuti minimi Allegato XV,
formazione, abilitazioni, sorveglianza sanitaria) leggi
`references/riferimenti-normativi.md`.

### Area 1 — Attestati e validità
Per ogni operatore nominato: formazione generale e specifica (coerente con le
mansioni), primo soccorso e antincendio se previsti dal DVR, abilitazioni
(PLE, carrelli, ponteggi) solo se le lavorazioni le richiedono.
- Attestato che scade **prima della data di fine** → MANCANTE per quell'operatore.
- Operatori nominati senza attestati allegati né referenziati → MANCANTE.

### Area 2 — Rischi generali
Rischi del cantiere identificati, misure per ciascuno, DPI (con norma EN dove
applicabile), procedure di emergenza, coerenza con il PSC se presente.
Lista generica da template non adattata (es. caduta dall'alto senza lavori in
quota) → PARZIALE, da segnalare come incoerenza.

### Area 3 — Rischi specifici per mansione
Per ogni mansione: rischi, misure specifiche, DPI, procedure operative.
"Montatore arredi" senza tagli, schiacciamenti, movimentazione carichi,
posture → MANCANTE.

### Area 4 — Firme
| Firma | Quando | Note |
|---|---|---|
| DL (Datore di Lavoro) o delegato | sempre | con data |
| RSPP | sempre | con qualifica |
| RLS | sempre (obbligo da confermare: vedi avviso in `references/riferimenti-normativi.md`) | o dichiarazione di elezione/assenza |
| Medico competente | se è prevista sorveglianza sanitaria | |
| Operatori | consigliata | presa visione |

Firma del DL o dell'RSPP assente → MANCANTE. Medico assente con sorveglianza
prevista → MANCANTE.

### Area 5 — Dati anagrafici operatori
Nome e cognome, data di nascita, mansione, datore di lavoro di appartenenza
(distacco/subappalto a cascata), n. tessera se assegnata. Operatori "TBD" →
PARZIALE, anche se il POS dice che saranno integrati.

### Area 6 — Dati aziendali e coerenza cantiere
Ragione sociale e P.IVA, sedi, PAT INAIL, matricola INPS, ATECO coerente, CCNL.
Nome e indirizzo cantiere corretti, lavorazioni corrispondenti a quelle
previste, interferenze citate se il cantiere è condiviso, cronoprogramma
presente o referenziato.

## Passo 2 — Esito

Applica le righe in ordine; vale la prima che corrisponde.

| Condizione | Esito |
|---|---|
| Area 4 non OK, oppure almeno un'area MANCANTE | 🔴 **DA INTEGRARE** — il fornitore deve correggere prima dell'inoltro |
| Nessuna MANCANTE, almeno una PARZIALE | 🟡 **COMPLETO CON NOTE** — GILI può inoltrare segnalando le note |
| Tutte OK | 🟢 **COMPLETO** — GILI può inoltrare all'ufficio sicurezza del GC |

Se un'area resta dubbia dopo la lettura, torna al passo 1 su quell'area e cita
la pagina; se il dubbio resta, l'area è PARZIALE.

## Passo 3 — Report Word (sempre, anche se COMPLETO)

Genera un .docx con python-docx. La struttura è fissa: usa sempre questi sei
blocchi in quest'ordine; colori e misure sono indicativi.

1. **Header**: barra nera "FIELD PROJECT SAS", barra rossa "VERIFICA
   COMPLETEZZA POS — D.Lgs. 81/2008"
2. **Dati identificativi** (tabella etichetta/valore): cantiere e codice
   commessa, fornitore, data inizio e fine, data verifica, "Verifica di
   completezza a supporto di GILI Creations — Field Project SAS"
3. **Esito** (cella colorata): 🟢 COMPLETO / 🟡 COMPLETO CON NOTE / 🔴 DA INTEGRARE
4. **Tabella 6 aree**: Area | Semaforo | Stato | Riscontri (con pagina POS) |
   Azioni richieste. Semafori: verde testo #1A7A3C su #D6F0E0, giallo #B8860B
   su #FFF3CD, rosso #CC0000 su #FDDEDE
5. **Azioni**: "AZIONI BLOCCANTI — da completare prima dell'inoltro" (titolo
   rosso) e "AZIONI NON BLOCCANTI — da segnalare in nota" (titolo arancio),
   elenchi numerati, responsabile = il fornitore
6. **Footer**: "Field Project SAS — Coordinamento montaggi per GILI Creations ·
   Verifica di completezza, non costituisce validazione · Stato al [data]"

Salva nella cartella di lavoro (o in quella indicata dall'utente) con nome
`Report_Verifica_POS_[CodiceCommessa]_[RagioneSociale]_[AAAA-MM-GG].docx`, poi
dai in chat una sintesi di 4-5 righe.

## Passo 4 — Bozza email per GILI (solo se 🔴 o 🟡)

Leggi `references/template-email-pos.md`. Una email per fornitore, integrazioni
numerate in linguaggio chiaro, data entro cui serve la versione corretta (di
default 3 giorni lavorativi prima dell'inizio lavori). Presentala come bozza
che GILI firma e invia.

## Passo 5 — Controllo finale

Ricontrolla il report e la bozza:
- [ ] Nessuna parola di validazione: "approvato", "idoneo", "inviabile", "GO"
- [ ] Ogni area ha uno stato e una pagina del POS
- [ ] Esito coerente con la tabella del passo 2
- [ ] Scadenze attestati confrontate con la data di fine (o annotato che manca)
- [ ] Ogni azione bloccante compare anche nella bozza email
- [ ] Nomi corretti: commessa, fornitore, firma GILI nella bozza

Se un controllo non passa, torna al passo indicato (aree → passo 1, esito →
passo 2, report → passo 3, email → passo 4), correggi e ricontrolla. Finisci
solo quando tutti i controlli passano. Quando un POS sbaglia in un modo che
questa lista non prevede, proponi all'utente una regola nuova da aggiungere.

## Esempio

Richiesta: "Ho ricevuto il POS di Rossi Montaggi per 2514RW, entrano il 10/11
ed escono il 20/12, montaggio arredi WP3 SUITE."
Risultato atteso: Area 1 MANCANTE (attestato formazione specifica di un
operatore scade il 30/11, p. 14); Area 4 OK; altre OK → 🔴 DA INTEGRARE; report
Word; bozza per GILI con un'integrazione bloccante ("Trasmettere attestato
aggiornato di formazione specifica per [operatore], in scadenza il 30/11/2026,
prima della fine della vostra presenza in cantiere") e data limite 05/11/2026.

## Serve

- `pip install python-docx` (report Word)
- uno strumento di lettura PDF (in Claude Code: lo strumento Read)

## Errori da evitare

- Non usare il riferimento normativo come lista assoluta: l'ufficio sicurezza
  del GC può chiedere di più; se l'utente indica richieste specifiche, aggiungile.
- Non confondere con `cantiere-sicurezza-onboarding`: quella controlla SE i
  documenti sono stati consegnati, questa controlla il CONTENUTO del POS.
