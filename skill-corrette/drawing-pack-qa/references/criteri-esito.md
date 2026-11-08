# Criteri di esito — drawing-pack-qa

Si applica il criterio più severo tra quelli che scattano.

| Condizione | Esito | Cosa si può fare nel take-off |
|---|---|---|
| Vettoriale, orientamento OK, formato dichiarato = reale, scala letta, sanity check entro 2% | **Pass** | conteggi da testo e misure a scala |
| Formato non dichiarato o scala non letta, senza sanity check | **Riserva** | conteggi da testo; misure solo dopo sanity check |
| Rotazione da applicare | **Riserva** | dopo la bonifica, ricontrollare |
| Pagina Ibrida (immagini > 30%) | **Riserva** | conteggi da testo solo nelle parti vettoriali |
| Nome file e contenuto di discipline diverse | **Riserva** | rinominare o dividere prima del take-off |
| Sanity check con scarto 2-5% | **Riserva** | ripetere su altra quota |
| Raster o Raster con OCR | **Fail** | nessun conteggio automatico, nessuna misura |
| Formato dichiarato ≠ reale, o sanity check oltre 5% | **Fail** | conteggi da testo sì, misure dirette no |
| File non leggibile | **Fail** | nulla |

## Soglie usate dagli script (modificabili se l'utente lo chiede)

- Formato ISO riconosciuto con tolleranza ±3% sui lati.
- Raster con OCR: immagini oltre il 70% della pagina e meno di 50 tracciati vettoriali.
- Orientamento: direzione di lettura prevalente se pesa almeno il 60% dei caratteri.
- Sanity check di scala: ≤ 2% confermata, 2-5% riserva, > 5% allerta.

Le soglie sono scelte di prudenza, non norme: se un caso reale le contraddice
(es. tavola con molto testo verticale), prevale la verifica a vista, scritta nel registro.
