# Scoperte

Quello che è emerso strada facendo e non era noto all'inizio.

## Ricerche

**Struttura della commessa.** La commessa principale non è un blocco unico: dura circa
un anno ed è organizzata in Work Package, 4 attivi più uno in arrivo. Da qui lo schema
a tre livelli **Commessa → WP → Lavorazione**, che non era previsto all'avvio.

**Il processo NC è già consolidato.** Le non conformità si gestiscono in un'app dedicata
con un processo che funziona. Sostituirla subito sarebbe stato un peggioramento: BFP
registra il riferimento (codice, stato, link) e lascia il processo dov'è.

**Le presenze hanno due fonti.** Il badge di cantiere registra entrata e uscita in modo
oggettivo, ma i dati non sono accessibili digitalmente. Restano l'inserimento manuale e
il confronto con la dichiarazione.

**Il giornale non ha ancora un destinatario stabile.** Il report presenze ha un processo
consolidato (lo invia il preposto Gili al capo preposti del GC ogni mattina); il giornale
di fine giornata resta un documento interno fra Giovanni e Gili. È un'opportunità di
standardizzazione, non un requisito già definito.

## Vincoli identificati

**Contrattuali** — il perimetro del Direttore di Cantiere è definito dal contratto con
Gili Creations Srl e ha un OUT of scope esplicito (subappalti, pianificazione della
produzione, condizioni contrattuali dei fornitori). Il sistema non deve spingere oltre.

**Normativi** — Giovanni **non** è Preposto ai sensi del D.Lgs. 81/2008: è una figura
distinta, incaricata da Gili nel modello AT12. Giovanni la supporta, non la sostituisce.
È il vincolo più delicato, perché il confine è sottile sul campo.

**Tecnici**
- Tre dispositivi da servire: smartphone, tablet e MacBook Air 13" → mobile-first
- I dati vanno esportabili verso kDrive Infomaniak, con conservazione a tempo indefinito
- Il badge di cantiere non è integrabile
- L'app NC è integrabile solo se espone API — da verificare

**Di processo** — il rituale deve stare in 15 minuti. È il vincolo che ha guidato il
disegno del wizard: sette passi brevi, nessun campo obbligatorio oltre il cantiere.

## Soluzioni trovate

**Salvataggio transazionale.** La chiusura giornata salva tutto in una transazione: o
entra l'intera giornata o non entra niente. Evita lo stato peggiore, cioè una giornata
registrata a metà che sembra completa.

**Tempi in sola aggiunta.** Presenze, spese, materiali e NC vengono rimpiazzati se si
risalva la giornata; i tempi di montaggio **si aggiungono e non si sovrascrivono mai**,
perché sono lo storico che alimenta le stime.

**Il numero di campioni accanto alla media.** Nella pagina KPI il conteggio dei campioni
è in evidenza quanto la media: sotto le tre rilevazioni lo spread fra minimo e massimo
dice più della media stessa. Un dato deve presentarsi per quello che è.

**Il fuso orario come servizio unico.** `server/services/tempo.js` centralizza il calcolo
di data e ora locali. Nato per il promemoria, ha corretto un difetto più grave che già
esisteva (vedi `progressi.md`).

**Report modificabile prima dell'invio.** Il testo generato si può correggere nel riquadro
prima di mandarlo su WhatsApp o via email: il sistema prepara, Giovanni resta l'autore.

**Il promemoria tace nel weekend.** Impostazione predefinita: deve proteggere il rituale,
non inseguire Giovanni la domenica. Un sistema che avvisa troppo si impara a ignorare.
