# Libreria assemblies — come scriverla

Un *assembly* lega una quantità primaria (contata o letta) alle quantità
secondarie che se ne ricavano. Si scrive nel Passo 1 e si fa approvare
dall'utente prima di calcolare.

## Formato

| Primaria | UM | Secondaria | Formula | Parametro | Valore | Origine del parametro |
|---|---|---|---|---|---|---|
| plinto `P1` | pz | cls | `{P}*a*b*h` | a, b, h | 1,20 / 1,20 / 0,60 m | sezione S-201 p.2 |
| presa `E3` | pz | cavo | `{P}*k` | k | 15 m/presa | **dato dall'utente il [data]** |
| soletta | m² (da quote) | cls | `{P}*s` | s | TBD | spessore non indicato → registro |

## Regole

- **Ogni parametro ha un'origine**: tavola e pagina, oppure "dato dall'utente"
  con data. Un rapporto di prassi (es. 15 m di cavo per presa) è un esempio, non
  un valore di default: si usa solo se l'utente lo conferma per quella commessa.
- **Parametro senza origine = `TBD`** e riga nel registro incertezze; la
  secondaria non si calcola.
- **Una formula, una riga di nota**: in boq.csv la colonna note riporta i
  parametri e la loro origine, così il QS rifà il conto senza aprire la chat.
- **Non si mescolano unità**: se la primaria è in pz e il parametro in cm,
  si converte nel valore del parametro (0,60 m), non nella formula.
