# Contesto Azienda — Field Project SAS

## Identità
**Ragione sociale**: Field Project SAS di Giovanni Cazzola & C.
**Settore**: Servizi nel settore arredi su misura per hotel, ville e spazi commerciali di alto livello
**Ruolo di Giovanni**: Direttore di Cantiere (prestazione di servizi)

---

## Perimetro di competenza (da contratto con Gili Creations Srl)

### IN scope — cosa fa il Direttore di Cantiere
- Coordinamento operativo di maestranze e montaggi
- Verifica coerenza del programma di montaggio
- Segnalazione criticità
- Input operativi su documenti contrattuali fornitori (NON giuridici)
- Interfaccia con ing. Bruno Cavallaro

### OUT of scope — cosa NON fa il Direttore di Cantiere
- Ingaggio contrattuale di squadre di montaggio e fornitori di manodopera
- Autorizzazione e gestione dei subappalti dei fornitori
- Pianificazione della produzione interna e dei fornitori
- Definizione dei piani di consegna dei materiali al cantiere
- Stipulazione, gestione e definizione delle scadenze dei contratti con il cliente e con i fornitori
- Funzioni di Preposto ai sensi del D.Lgs. 81/2008 (figura distinta incaricata da Gili Creations Srl nel modello AT12)

---

## FASE R — Reti

### Dispositivi
- Smartphone, tablet, MacBook Air 13"
- **Implicazione**: interfaccia mobile-first, responsive su tutti e tre
- BFP già su Railway → accessibile da browser, nessuna app da installare

### Connessioni esterne
| Sistema | Integrazione | Note |
|---------|-------------|------|
| Email | ✅ Sì — obbligatoria | Invio report da BFP |
| WhatsApp | ✅ Sì — obbligatoria | Invio report da BFP |
| Badge cantiere | ❌ No | Dati non accessibili digitalmente — inserimento manuale |
| App NC | 🔮 Condizionale | Solo se l'app espone API — da verificare |

### Utenti
| Utente | Ruolo | Accesso |
|--------|-------|---------|
| Giovanni Cazzola | Direttore di Cantiere | Pieno |
| Preposto Gili | Preposto cliente | Da definire (Fase B) |

---

## FASE 0 — Risposte in corso

### Q1 — Chi sei e cosa fai? ✅
Field Project SAS eroga servizi di direzione di cantiere nel settore contract di lusso (arredamenti su misura per hospitality e spazi commerciali). Giovanni Cazzola opera come Direttore di Cantiere: coordina le maestranze, verifica i programmi di montaggio, segnala criticità, interfaccia con la committenza tecnica. Non gestisce contratti né subappalti.

---

## FASE O — Obiettivo

### INPUT — Cosa cattura il sistema (rituale chiusura giornata ~15 min)
1. **Presenze personale** — multi-fornitore (più squadre, più aziende)
2. **Spese di cantiere**
3. **Liste di controllo fotografiche** — progress montaggi giornaliero
4. **Liste di verifica qualità + fuori tolleranza** (non conformità)
5. **Form e registri** — da compilare e inviare al GC (siamo spesso in subappalto al GC)
6. **Tempi di montaggio** — per tipologia di arredo/soluzione
7. **Database KPI storici** — alimentato dai tempi raccolti, usato per skill estimate future
8. **Verifica ricezione materiali** — controllo arrivi materiali al cantiere
8. **Verifica ricezione materiali** — controllo arrivi materiali al cantiere
9. **Supporto al Preposto** — supporto al Preposto della cliente (Gili Creations Srl) nelle sue funzioni e obblighi di legge (D.Lgs. 81/2008) ⚠️ _NB: Giovanni NON è il Preposto — lo supporta_

### Gestione non conformità
- Foto + inserimento in lista via **app dedicata** (processo consolidato, non si tocca ora)
- **Fase attuale**: BFP registra solo un riferimento (numero/link/nota) alla NC aperta nell'app esterna
- **Fase futura**: architettura predisposta per assorbire il modulo NC internamente (sostituzione pianificata)

### Struttura commessa attuale
- Durata: ~1 anno di esecuzione
- Organizzata in **WP (Work Package)**: 4 attivi + 1 in arrivo
- Implicazione schema dati: **Commessa → WP → Lavorazioni**

**Fonte dati presenze**: badge cantiere degli operatori (registra entrata/uscita automaticamente) — fonte oggettiva da incrociare con dichiarazione manuale

**Output atteso**: tutto registrato correttamente in ≤15 min, recuperabile anche dopo mesi

### OUTPUT — Cosa produce il sistema

| Output | Destinatario | Formato | Frequenza | Stato processo |
|--------|-------------|---------|-----------|----------------|
| Report presenze | Capo Preposti GC | Form PDF via app GC | Ogni mattina | Processo esistente (lo invia il Preposto Gili) — BFP alimenta i dati |
| Form zona/attività | GC | Form creato da Giovanni (custom) | Giornaliero | Campi: chi è presente, zona di lavoro, attività svolta |
| Giornale di cantiere | Preposto Gili + (futuro) PM Gili + Resp. Ufficio Tecnico Gili | Da definire | Fine giornata | Processo non consolidato — opportunità di standardizzare |

---

### Q2 — A chi ti rivolgi? ✅
**Cliente diretto (chi ingaggia)**: Un produttore di arredi su misura (cliente principale unico)

**Interlocutori sul campo** — livello alto:
- Committente finale della commessa (grandi gruppi e fondi di real estate)
- Project Controller
- DL — Direzione Lavori
- GC — General Contractor
- Architetti e designer

**Interlocutori sul campo** — livello operativo:
- Preposti
- Capi squadra
- Installatori

### Q3 — Con che tono? ✅
**Destinatari output del sistema**: Giovanni + PM del team interno ed esterno
**Registro**: Formale professionale — niente informalità, niente gergo tecnico non necessario

### Q4 — Cosa vendiamo / il valore? ✅
**Proposta di valore core**:
- Empatia sul campo con tutti gli stakeholder → ponte tra committente finale e Gili Creations Srl
- Presidio professionale della fase esecutiva dall'inizio al collaudo
- Monitoraggio costante sul campo
- Tracciamento eventi rilevanti per **Tempi, Costi, Qualità** (TCQ)

**In una frase**: Giovanni Cazzola garantisce che il cantiere arrivi al collaudo senza sorprese — con controllo TCQ continuo e una relazione solida con ogni stakeholder.

### Q5 — Regole da non violare? ✅ (elenco aperto — da integrare)
Il Direttore di Cantiere NON deve mai:
1. Assumere il ruolo di Preposto ai sensi del D.Lgs. 81/2008
2. Agire per interesse personale
3. Nascondere evidenze al cliente
4. Gestire o impartire ordini al personale di montaggio ingaggiato dall'azienda cliente
5. Effettuare acquisti per conto dell'azienda cliente
6. Redigere SAL (Stato Avanzamento Lavori) a fine mese
7. Pianificare attività interne all'azienda cliente (ufficio tecnico e logistico) — può analizzare sul campo le caratteristiche in ottica problem solving, ma non pianifica
8. Stabilire le condizioni contrattuali dei fornitori (competenza dell'ufficio acquisti)

_Lista aperta — ulteriori vincoli da aggiungere_
