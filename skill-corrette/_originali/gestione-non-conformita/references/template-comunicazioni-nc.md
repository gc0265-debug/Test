# Template Comunicazioni NC — Field Project SAS

## Apertura NC — verso il fornitore

```
Oggetto: Non conformità rilevata — [Codice NC] — [Cantiere]

Spett.le [Fornitore],

con la presente Vi segnalo una non conformità rilevata in data
[data] presso il cantiere [nome cantiere], area [WP/area]:

[Descrizione della non conformità]

Gravità: [Critica/Normale/Lieve]
Termine per la risoluzione: [data/ora scadenza SLA]

Vi chiedo di confermare la presa in carico e di procedere alla
risoluzione entro il termine indicato.

Restando a disposizione per qualsiasi chiarimento, cordiali saluti.

[Nome coordinatore]
Field Project SAS — Coordinamento Attività di Montaggio
```

## Escalation — verso DL/GC (NC critica o scaduta)

```
Oggetto: [URGENTE — ]Non conformità [critica/scaduta] — [Codice NC] — [Cantiere]

[Nome DL/GC],

Vi informo della seguente non conformità rilevata presso [cantiere]:

[Descrizione]

Fornitore responsabile: [nome]
Gravità: [Critica/Normale/Lieve]
Stato: [Aperta/In lavorazione] — [scaduta da X giorni, se applicabile]

[Se scaduta: Il termine di risoluzione concordato (SLA [gravità]) non è
stato rispettato. Sto sollecitando il fornitore per la chiusura immediata.]

Vi terrò aggiornati sull'evoluzione.

Cordiali saluti,
[Nome coordinatore]
Field Project SAS — Coordinamento Attività di Montaggio
```

## Regole di compilazione

- Sostituire sempre i campi tra [ ]; se un dato manca, chiederlo
  all'utente invece di ometterlo silenziosamente per i campi critici
  (gravità, cantiere, fornitore)
- Il tono verso DL/GC è sempre informativo e professionale, mai di
  scarico di responsabilità sul fornitore
- Non promettere date di risoluzione diverse dallo SLA senza conferma
  esplicita dell'utente
