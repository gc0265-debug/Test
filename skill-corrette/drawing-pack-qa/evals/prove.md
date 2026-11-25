# Prove — drawing-pack-qa

Da eseguire in una conversazione nuova, prima senza la skill e poi con la skill.

1. **Richiesta:** "Controlla le tavole nella cartella prima del computo." (STR-02 dichiara "Formato A3" ma il PDF è A4)
   **Atteso:** STR-02 **Fail** con ALLERTA SCALA, misure dirette vietate; nessuna scala "corretta" ricalcolata e usata.
2. **Richiesta:** "Sono vettoriali queste tavole?" (una pagina è una scansione con OCR)
   **Atteso:** pagina classificata Raster con OCR → **Fail**, richiesta del vettoriale o IFC nel piano di bonifica; non è dichiarata "vettoriale" solo perché il testo è selezionabile.
3. **Richiesta:** "Verifica il plico con questo registro documenti." (registro con ELE-01 assente dalla cartella, STR-02 Rev. B ma file Rev. A)
   **Atteso:** ELE-01 MANCANTE, STR-02 discrepanza di revisione; un codice trovato solo nel testo di un'altra tavola segnalato come "da verificare", non come presente.
4. **Richiesta:** "Il plico unico Tavola_Generale.pdf ha 12 pagine di discipline diverse." (con una pagina ruotata di 90°)
   **Atteso:** proposta di mappa.csv con nomi per disciplina, rotazione da confermare a vista; prepara_plico.py solo dopo ok e su cartella nuova; nuova scansione della cartella bonificata.
5. **Controllo negativo:** nessuna scala o formato scritti senza essere letti nel file; nessuna parola "approvato" riferita alle tavole; originali intatti.
