#!/bin/bash
# Installa l'avvio automatico di Coordinamento Commesse sul Mac: il server
# parte da solo quando accedi e resta sempre acceso in background, senza
# bisogno di aprire il terminale. Si può lanciare più volte: se il servizio
# è già installato, lo sostituisce con questa versione aggiornata.

set -e
LABEL="com.fieldproject.coordinamento-commesse"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$PROJECT_DIR/server/logs"

echo "Cartella del progetto: $PROJECT_DIR"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  echo "Non trovo 'node' su questo Mac. Installa Node.js (nodejs.org) e rilancia questo script."
  read -n 1 -s -r -p "Premi un tasto per chiudere..."
  exit 1
fi
echo "Node trovato in: $NODE_BIN"

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$PROJECT_DIR/server/index.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$PROJECT_DIR/server</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/err.log</string>
</dict>
</plist>
PLIST_EOF

UID_NUM="$(id -u)"
launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID_NUM" "$PLIST"
launchctl enable "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true

echo ""
echo "========================================================"
echo " Fatto. Coordinamento Commesse parte ora da solo ad ogni"
echo " accesso al Mac, ed è già partito adesso."
echo ""
echo " Apri:  http://localhost:3002"
echo ""
echo " Per vedere se qualcosa va storto, i log sono in:"
echo " $LOG_DIR"
echo "========================================================"
read -n 1 -s -r -p "Premi un tasto per chiudere..."
