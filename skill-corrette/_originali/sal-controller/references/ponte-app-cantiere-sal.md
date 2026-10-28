# Ponte app di cantiere → Libretto misure → SAL

## Il problema che questo modulo risolve

Senza ponte, la contabilità nasce da una fonte sbagliata: le **fatture dei
materiali consegnati**. Il consegnato non è il montato — un SAL costruito
sulle bolle misura l'approvvigionamento, non l'avanzamento lavori, e
diverge sistematicamente dalla realtà di cantiere (in eccesso all'inizio,
in difetto alla fine). Nel frattempo il cantiere traccia già il montato
reale nell'app (liste per WP/zona, foto, stati) — dati che senza ponte non
arrivano mai alla contabilità.

**Principio cardine: il SAL contabilizza il MONTATO documentato
dall'app di cantiere. Il consegnato-non-montato entra solo se e nella
misura in cui il contratto riconosce i materiali approvvigionati a piè
d'opera (parametro contrattuale da verificare, mai da assumere).**

## Mappatura campi app di cantiere → libretto misure

| Campo libretto | Fonte app di cantiere | Note |
|---|---|---|
| Data rilievo | data completamento item in lista | |
| Rilevato da | utente che ha chiuso l'item (DdC/preposto) | |
| WP | lista di appartenenza | denominazioni ufficiali commessa |
| Locale/Area | zona/piano dell'item in lista | coerente con WBS |
| Codice voce | **via tabella di transcodifica** item lista → voce contrattuale | vedi sotto |
| Quantità / % | quantità item o stato lista (montato/parziale) | |
| Riferimento documentale | ID lista + ID foto nell'app | la foto milestone È il riferimento |
| Stato | montato / parziale / da verificare / conteso | mapping diretto dagli stati lista |

## La tabella di transcodifica (il pezzo critico)

Gli item delle liste dell'app e le voci del computo contrattuale NON
coincidono uno a uno: più item possono comporre una voce, una voce può
distribuirsi su più zone. Serve una tabella di transcodifica stabile:

`[Codice WBS item] → [Codice voce contrattuale] → [quota o UM di conversione]`

Regole:
1. La transcodifica si costruisce UNA volta a setup e si tocca solo per
   varianti approvate — mai riscritta ad ogni SAL.
2. Ogni item WBS punta a UNA sola voce contrattuale. Se un item sembra
   appartenere a due voci, va spezzato a livello WBS, non conteggiato due
   volte.
3. Item senza voce contrattuale corrispondente = campanello: extra
   (→ possibile variante, project-controller) o errore di codifica.
4. La codifica WBS di commessa (formato `commessa.WP.piano.zona.item`) è
   la chiave primaria: se l'Excel dell'amministrazione non la contiene,
   il ponte non è ricostruibile — è LA colonna da pretendere nel formato.

## Divisione dei ruoli nel flusso mensile

| Passo | Chi | Cosa |
|---|---|---|
| 1. Chiusura periodo | DdC | congela le liste app al giorno di cutoff, esporta/riepiloga il montato del periodo |
| 2. Transcodifica | DdC (con skill) | montato per item → quantità/% per voce contrattuale, con riferimenti |
| 3. Libretto misure | DdC | consegna il libretto del periodo firmato ad amministrazione |
| 4. Valorizzazione | Amministrazione | quantità × prezzi, cascata economica, emissione SAL |
| 5. Riconciliazione | DdC + Amministrazione | progressivo(N) − progressivo(N−1) = periodo; scarto consegnato vs montato esplicitato |

Il DdC risponde delle QUANTITÀ e della loro documentazione;
l'amministrazione risponde della VALORIZZAZIONE e della cascata. Il
libretto firmato è l'interfaccia tra le due responsabilità.

## Riconciliazione consegnato vs montato

Ad ogni SAL, produrre il prospetto a tre colonne per WP:
`Consegnato (da bolle/fatture)` · `Montato (da app)` · `Scarto a piè d'opera`.
Lo scarto è fisiologico (il materiale arriva prima del montaggio) ma va
esposto: è la risposta preventiva alla domanda della DL "perché fatturate
meno di quanto è entrato in cantiere" — o del GC "perché fatturate di più".

## Errori da evitare specifici del ponte

- Non costruire il SAL dalle fatture materiali "perché i dati ci sono
  già": misura la cosa sbagliata.
- Non accettare un formato di raccolta dati privo di codice WBS e
  riferimento documentale (ID lista/foto): senza quelle colonne il dato
  non è difendibile in contraddittorio.
- Non rifare la transcodifica a ogni SAL: si congela a setup.
- Non far transitare il consegnato-non-montato nell'importo se il
  contratto non riconosce l'approvvigionato — e se lo riconosce, tenerlo
  su righe separate con la quota contrattuale applicata.
