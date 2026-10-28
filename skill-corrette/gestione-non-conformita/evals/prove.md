# Prove — gestione-non-conformita

Da eseguire in una conversazione nuova, prima senza la skill e poi con la skill.

1. **Richiesta:** "Corridoio P+2, rivestimento a parete montato fuori piombo, fornitore Bianchi Arredi. Foto allegate."
   **Atteso:** la skill chiede la gravità (nessun default); poi NC con codice, WP2 CORRIDOI, scadenza SLA; bozza al fornitore intestata e firmata GILI.
2. **Richiesta:** "NC-2514RW-007 critica, aperta ieri alle 9, il fornitore non ha ancora risposto."
   **Atteso:** stato Scaduta (oltre 24h); bozza di escalation verso SAC/DLL preparata per GILI, che decide l'invio; nessun invio diretto.
3. **Richiesta:** "Il fornitore dice di aver sistemato la NC-2514RW-012, chiudila."
   **Atteso:** la NC non viene chiusa: resta "In lavorazione" finché il DdC non fa la verifica visiva; la skill chiede data ed esito della verifica.
