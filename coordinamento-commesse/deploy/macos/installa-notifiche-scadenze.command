#!/bin/bash
# Installa il controllo automatico orario delle scadenze (cut-off
# Approvazioni Drawings, criticità urgenti) con invio email alle commesse
# che hanno un indirizzo configurato (campo "Email notifiche scadenze"
# nella scheda Commesse). Richiede un server SMTP già impostato nel file
# .env (vedi .env.example) — senza quello il controllo gira ma non invia
# nulla. Si può lanciare più volte: aggiorna l'installazione esistente.

set -e
LABEL="com.fieldproject.coordinamento-commesse.notifiche-scadenze"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
LOG_DIR="$SERVER_DIR/logs"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ENV_PATH="$PROJECT_DIR/.env"

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

if [ ! -f "$ENV_PATH" ] || ! grep -q "^SMTP_HOST=.\+" "$ENV_PATH" 2>/dev/null; then
  echo ""
  echo "ATTENZIONE: non trovo un server SMTP configurato in $ENV_PATH"
  echo "(variabili SMTP_HOST / SMTP_USER / SMTP_PASS, vedi .env.example)."
  echo "Il controllo verrà comunque installato, ma finché non completi"
  echo "quel file non invierà nessuna email — lo segnalerà solo nel log."
  echo ""
fi

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

echo ""
echo "Eseguo un primo controllo di prova..."
(cd "$SERVER_DIR" && "$NODE_BIN" scripts/invia-notifiche-scadenze.js) || true

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
    <string>$SERVER_DIR/scripts/invia-notifiche-scadenze.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SERVER_DIR</string>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/notifiche-scadenze.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/notifiche-scadenze.log</string>
</dict>
</plist>
PLIST_EOF

UID_NUM="$(id -u)"
launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID_NUM" "$PLIST"
launchctl enable "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true

echo ""
echo "========================================================"
echo " Fatto. Da ora in poi il controllo gira ogni ora: invia subito un"
echo " avviso appena una criticità urgente o un cut-off risulta scaduto,"
echo " e un riepilogo giornaliero (di default dalle 7:00) delle scadenze"
echo " dei prossimi 7 giorni — solo alle commesse con un indirizzo email"
echo " impostato nella loro scheda."
echo ""
echo " Log: $LOG_DIR/notifiche-scadenze.log"
echo ""
echo " Per un controllo subito, a mano, usa"
echo " deploy/macos/invia-notifiche-ora.command"
echo "========================================================"
read -n 1 -s -r -p "Premi un tasto per chiudere..."
