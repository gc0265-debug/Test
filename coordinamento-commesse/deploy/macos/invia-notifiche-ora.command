#!/bin/bash
# Esegue subito, a mano, un controllo delle scadenze (cut-off Approvazioni
# Drawings, criticità urgenti) e invia le email dovute alle commesse con
# un indirizzo configurato — utile per verificare che SMTP funzioni senza
# aspettare la prossima esecuzione oraria.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  echo "Non trovo 'node' su questo Mac."
  read -n 1 -s -r -p "Premi un tasto per chiudere..."
  exit 1
fi

cd "$SERVER_DIR"
"$NODE_BIN" scripts/invia-notifiche-scadenze.js
echo ""
echo "Controllo completato (vedi sopra l'esito per ogni commessa)."
read -n 1 -s -r -p "Premi un tasto per chiudere..."
