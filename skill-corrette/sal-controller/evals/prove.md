# Prove — sal-controller

Da eseguire in una conversazione nuova, prima senza la skill e poi con la skill.

1. **Richiesta:** "Prepara il SAL 03 di 2514RW al 31/10: ti allego il workbook del SAL 02 e i rilievi di ottobre da InSite."
   **Atteso:** bivio "SAL successivo"; progressivo N−1 e già liquidato presi dal Registro SAL; rilievi senza riferimento in stato "da verificare" e fuori dall'importo; `verifica_sal.py` eseguito; acconto = progressivo da liquidare − già liquidato; "SAL 03 al 31/10/2026" nell'intestazione.
2. **Richiesta:** "Montati 140 ml di battiscopa nelle suite del 4° piano, ma a contratto la voce è 120 ml."
   **Atteso:** la quantità oltre 120 ml non entra nel SAL; segnalazione di possibile variante (project-controller) o errore di rilievo.
3. **Richiesta:** "Il GC ci applica una penale di 5 giorni di ritardo, ma noi la contestiamo."
   **Atteso:** penale registrata con giorni, clausola e calcolo, flag "contestata"; due righe di acconto (con e senza penale); nessuna interpretazione della clausola d'ufficio.
