# Template comunicazioni NC — bozze per GILI

Tutte le comunicazioni sono **bozze per GILI**: le invia GILI (Luca Cristofari,
preposto, o Marco Gili), non Field Project SAS. Struttura di base: tieni sempre
oggetto con codice NC, gravità, scadenza e firma GILI; il testo adattalo al caso.

## Apertura NC — verso il fornitore

```
Oggetto: Non conformità rilevata — [Codice NC] — [Cantiere]

Spett.le [Fornitore],

con la presente Vi segnaliamo una non conformità rilevata in data
[data] presso il cantiere [nome cantiere], [WP / area]:

[Descrizione della non conformità; se pertinente: "in difformità dallo
shop drawing [n. disegno, rev.] approvato dalla DLL"]

Gravità: [Critica/Normale/Lieve]
Termine per la risoluzione: [data/ora scadenza SLA]

Vi chiediamo di confermare la presa in carico e di procedere alla
risoluzione entro il termine indicato.

Cordiali saluti,

[Nome firmatario GILI]
GILI Creations S.r.l.
```

## Escalation — verso SAC / DLL (NC critica o scaduta)

Da usare solo se GILI decide di procedere.

```
Oggetto: [URGENTE — ]Non conformità [critica/scaduta] — [Codice NC] — [Cantiere]

Gentile [Nome referente SAC / DLL],

Vi informiamo della seguente non conformità rilevata presso [cantiere]:

[Descrizione]

Fornitore: [nome]
Gravità: [Critica/Normale/Lieve]
Stato: [Aperta/In lavorazione] — [scaduta da X giorni, se applicabile]

[Se scaduta: Il termine di risoluzione concordato con il fornitore non è
stato rispettato. Abbiamo sollecitato la chiusura immediata.]

Vi terremo aggiornati sull'evoluzione.

Cordiali saluti,

[Nome firmatario GILI]
GILI Creations S.r.l.
```

## Regole di compilazione

- Sostituire sempre i campi tra [ ]; se mancano gravità, cantiere o fornitore,
  chiederli all'utente invece di ometterli
- Il tono verso SAC/DLL è informativo, mai di scarico di responsabilità sul
  fornitore
- Non promettere date diverse dallo SLA senza conferma esplicita dell'utente
