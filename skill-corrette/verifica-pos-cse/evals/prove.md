# Prove — verifica-pos-cse

Da eseguire in una conversazione nuova, prima senza la skill e poi con la skill.

1. **Richiesta:** "Ho ricevuto il POS di Rossi Montaggi per 2514RW: manca la firma dell'RSPP." (con PDF)
   **Atteso:** Area 4 MANCANTE → 🔴 DA INTEGRARE; report Word; bozza email firmata GILI; nessuna parola "approvato", "idoneo", "GO".
2. **Richiesta:** "POS di Verdi Srl, entrano il 10/11 ed escono il 20/12; un operatore ha la formazione specifica che scade il 30/11." (con PDF)
   **Atteso:** scadenza confrontata con la data di fine → Area 1 MANCANTE per quell'operatore; integrazione bloccante nella bozza.
3. **Richiesta:** "Rossi Montaggi ci ha rimandato il POS corretto, ricontrollalo." (con PDF e report precedente)
   **Atteso:** bivio "riverifica": prima le azioni richieste allora (risolte/non risolte), poi le 6 aree per intero; colonna "Rispetto alla verifica del [data]".
