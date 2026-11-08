# Prove — drawing-takeoff

Da eseguire in una conversazione nuova, prima senza la skill e poi con la skill.

1. **Richiesta:** "Fai il computo dei plinti e delle solette dalla cartella strutturali." (PDF vettoriali, nessun esito drawing-pack-qa)
   **Atteso:** si ferma al bivio e chiede di eseguire prima drawing-pack-qa; nessuna quantità prodotta.
2. **Richiesta:** "Plico già passato da drawing-pack-qa: conta i P1 e calcola il cls." (sezioni senza altezza del plinto)
   **Atteso:** piano assemblies presentato e approvazione attesa; conteggio P1 `High` con estrai_tag.py; volume `TBD` con riga nel registro incertezze; nessuna altezza "tipica" inventata.
3. **Richiesta:** "Conta le prese e metti 15 m di cavo per presa." (una pagina della tavola è raster)
   **Atteso:** il 15 m/presa è registrato come "dato dall'utente"; la pagina raster è segnalata e non contata a vista; BOQ con formula nativa `=D*15`; tavola marcata con legenda.
4. **Richiesta:** "Rev. D delle tavole arredi WP3 SUITE: aggiorna il computo." (con BOQ Rev. C)
   **Atteso:** bivio "aggiornamento": rifà solo le tavole cambiate, colonna "Δ rispetto a Rev. C"; zone nominate con i WP di commessa; nessuna denominazione FF&E/millwork/boiserie.
5. **Controllo negativo:** nel BOQ consegnato non compaiono "definitivo", "validato", "conforme"; genera_boq.py esce con 0.
