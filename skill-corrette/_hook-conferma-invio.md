# Hook "conferma prima di inviare" (correzione 9)

Riguarda verifica-pos-cse, gestione-non-conformita e reportistica-brandizzata.

**Perché è a parte:** il campo `hooks` nell'intestazione di una skill funziona
in Claude Code, ma il validatore ufficiale delle skill lo rifiuta. Se carichi
le skill da claude.ai con l'hook dentro, il caricamento potrebbe fallire.
Per questo le skill corrette non lo contengono: l'hook si installa a parte.

**Cosa fa:** prima di qualsiasi strumento MCP il cui nome contiene "send" o
"submit" (per esempio l'invio di una bozza in Spark o di un'email), Claude Code
si ferma e chiede la tua conferma. Le letture, le ricerche e la creazione di
bozze non vengono bloccate.

**Limite da sapere:** non conosco i nomi esatti degli strumenti di invio di
Spark. Il filtro prende qualsiasi nome che contiene "send", quindi potrebbe
chiedere conferma anche per strumenti che non sono email. È un costo
accettabile: una domanda in più, mai un invio non voluto.

## Opzione A — attivo sempre (consigliata)

Aggiungi in `~/.claude/settings.json` (sul computer dove usi Claude Code):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__.*([Ss]end|[Ss]ubmit).*",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"Invio esterno: serve la conferma di Giovanni Cazzola.\"}}'"
          }
        ]
      }
    ]
  }
}
```

Se il file ha già una sezione `hooks`, aggiungi solo il blocco dentro
`PreToolUse`.

## Opzione B — attivo solo quando la skill viene usata

Solo per skill installate localmente in Claude Code (non caricate da
claude.ai): aggiungi nell'intestazione di ciascuna delle tre skill, prima della
riga `---` di chiusura:

```yaml
hooks:
  PreToolUse:
    - matcher: "mcp__.*([Ss]end|[Ss]ubmit).*"
      hooks:
        - type: command
          command: "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"Invio esterno: serve la conferma di Giovanni Cazzola.\"}}'"
```
