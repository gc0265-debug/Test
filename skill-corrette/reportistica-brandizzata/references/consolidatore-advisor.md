# Consolidatore Advisor — dettagli operativi

## Template input PM (assets/Input_PM_Settimanale.xlsx)

Un foglio, una riga per tema. Cinque campi obbligatori più due opzionali:

| Campo | Tipo | Note |
|-------|------|------|
| WP | elenco | WP1 FOH / WP2 CORRIDOI / WP3 SUITE / WP4 SCALA B / WP5 20 ROOM / Trasversale |
| Tema | testo | una frase, es. "Approvazione SD banco reception" |
| Stato | elenco | In corso / Bloccato / Risolto / In attesa terzi / Nuovo |
| Azione richiesta | testo | cosa serve e da chi |
| Scadenza | data | quando serve la risposta/azione |
| Fonte (opz.) | testo | email del..., call del... |
| Rilevante per instabilità progettuale (opz.) | elenco | SÌ/NO — se SÌ, l'episodio va anche nel registro IP |

Regole d'uso da comunicare al PM:
- Compilazione incrementale durante la settimana, non tutta il giorno prima
- Un tema = una riga; se un tema si sdoppia, si sdoppia la riga
- I temi "Risolto" restano nel file una settimana (servono alla
  riconciliazione: il campo deve confermare che risulti risolto anche lì)

## Logica di riconciliazione

Matching tra input per (WP + tema/zona/pacchetto). Non serve matching
perfetto automatico: il consolidatore propone gli accoppiamenti e le
tre categorie di esito:

1. **Allineato** — stessi fatti in entrambe le fonti → una riga normale
2. **DA ALLINEARE** — stati contraddittori → riga evidenziata rosso con
   colonne "Versione campo" / "Versione PM" / "Fonte" affiancate
3. **Solo in una fonte** — segnalato come "non riscontrato in
   [campo/flusso PM]": spesso è solo ritardo di comunicazione, ma se
   ricorre sullo stesso canale indica dove il flusso perde pezzi

## Layout report consolidato (Word)

Struttura di base: tabelle e piè di pagina vanno usati sempre; ordine e
dettaglio delle righe adattali alla settimana.


- Identità visiva da `brand-identity.md` (header con logo, palette
  nero/rosso, Montserrat maiuscolo spaziato per i titoli)
- Sezione 1-2 pagine: tabelle asciutte, niente prosa lunga
- Tabella milestone: colonne Milestone / Data programma / Stato
  (Raggiunta 🟢 / A rischio 🟠 / Mancata 🔴) / Causa sintetica /
  Riferimento (episodio IP, nodo, NC)
- Tabella "Decisioni richieste": colonne Domanda (chiusa, rispondibile
  SÌ/NO o con una scelta) / A chi / Entro / Impatto se non decisa.
  Questa tabella è pensata per essere portata anche al tavolo DLL come
  contro-agenda.
- Piè di pagina: "Documento riservato GILI / Field Project SAS — non
  distribuire senza vaglio Advisor"

## Nomi file

- Report: `Consolidato_Advisor_[COMMESSA]_[AAAA-MM-GG].docx`
- Input PM compilato: `Input_PM_[COMMESSA]_[AAAA-MM-GG].xlsx`

## Cosa NON è il consolidato

- Non è il report DLL/GC (quello resta il documento formale verso
  l'esterno); il consolidato è riservato GILI / Field Project SAS, serve
  all'Advisor
- Non sostituisce il registro instabilità progettuale: lo cita
- Non è un verbale: fotografa lo stato PRIMA della riunione
