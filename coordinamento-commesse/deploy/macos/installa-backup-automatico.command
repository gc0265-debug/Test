#!/bin/bash
# Installa il backup automatico cifrato del database: una copia ogni
# notte, più una verifica automatica settimanale che il ripristino
# funzioni davvero. Si può lanciare più volte: aggiorna l'installazione
# esistente invece di duplicarla.

set -e
LABEL_BACKUP="com.fieldproject.coordinamento-commesse.backup"
LABEL_VERIFICA="com.fieldproject.coordinamento-commesse.backup-verifica"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
LOG_DIR="$SERVER_DIR/logs"
PLIST_BACKUP="$HOME/Library/LaunchAgents/$LABEL_BACKUP.plist"
PLIST_VERIFICA="$HOME/Library/LaunchAgents/$LABEL_VERIFICA.plist"
CONFIG_PATH="$SERVER_DIR/backup-config.json"

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

# Destinazione di default: la cartella iCloud Drive, se sincronizzata su
# questo Mac, altrimenti una cartella nella home.
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
if [ -d "$ICLOUD_DIR" ]; then
  DEFAULT_DEST="$ICLOUD_DIR/Backup Coordinamento Commesse"
else
  DEFAULT_DEST="$HOME/Backup Coordinamento Commesse"
fi

if [ -f "$CONFIG_PATH" ]; then
  CURRENT_DEST="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_PATH','utf8')).destDir||'')}catch(e){}")"
  if [ -n "$CURRENT_DEST" ]; then DEFAULT_DEST="$CURRENT_DEST"; fi
fi

echo ""
echo "I backup verranno cifrati e salvati in una cartella a tua scelta —"
echo "usa una cartella sincronizzata (iCloud Drive, Google Drive, ecc.) così"
echo "restano al sicuro anche se questo Mac si guasta o viene smarrito."
echo ""
read -r -p "Cartella di destinazione [$DEFAULT_DEST]: " DEST_INPUT
DEST="${DEST_INPUT:-$DEFAULT_DEST}"
mkdir -p "$DEST"

node -e "
const fs = require('fs');
fs.writeFileSync('$CONFIG_PATH', JSON.stringify({ destDir: '$DEST' }, null, 2));
"
echo "Destinazione impostata: $DEST"

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

# Primo backup subito, così l'installazione si verifica da sola e non si
# scopre un problema solo la notte dopo. Genera anche la chiave di
# cifratura, se non esiste già.
echo ""
echo "Eseguo il primo backup di prova..."
(cd "$SERVER_DIR" && "$NODE_BIN" scripts/backup-db.js)

KEY_PATH="$SERVER_DIR/.backup-key"
KEY_JUST_CREATED_MARKER="$SERVER_DIR/.backup-key-shown"
if [ -f "$KEY_PATH" ] && [ ! -f "$KEY_JUST_CREATED_MARKER" ]; then
  echo ""
  echo "========================================================"
  echo " IMPORTANTE — chiave di cifratura dei backup"
  echo ""
  echo " I backup sono cifrati con questa chiave, generata ora:"
  echo ""
  base64 < "$KEY_PATH"
  echo ""
  echo " Conservane una copia in un posto sicuro e diverso da questo Mac"
  echo " (es. un password manager). Se un giorno perdi questo Mac, è"
  echo " l'unico modo per riaprire i backup salvati su iCloud/Drive."
  echo "========================================================"
  touch "$KEY_JUST_CREATED_MARKER"
fi

cat > "$PLIST_BACKUP" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL_BACKUP</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SERVER_DIR/scripts/backup-db.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SERVER_DIR</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>2</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/backup.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/backup.log</string>
</dict>
</plist>
PLIST_EOF

cat > "$PLIST_VERIFICA" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL_VERIFICA</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SERVER_DIR/scripts/backup-db.js</string>
    <string>--verify</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SERVER_DIR</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>0</integer>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/backup-verifica.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/backup-verifica.log</string>
</dict>
</plist>
PLIST_EOF

UID_NUM="$(id -u)"
for LABEL in "$LABEL_BACKUP" "$LABEL_VERIFICA"; do
  launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
done
launchctl bootstrap "gui/$UID_NUM" "$PLIST_BACKUP"
launchctl enable "gui/$UID_NUM/$LABEL_BACKUP" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID_NUM" "$PLIST_VERIFICA"
launchctl enable "gui/$UID_NUM/$LABEL_VERIFICA" >/dev/null 2>&1 || true

echo ""
echo "========================================================"
echo " Fatto. Da stanotte (02:00) il database verrà copiato e cifrato"
echo " ogni giorno in:"
echo " $DEST"
echo ""
echo " Ogni domenica alle 03:00 viene anche verificato in automatico che"
echo " l'ultimo backup si possa davvero riaprire — vedi il risultato in:"
echo " $LOG_DIR/backup-verifica.log"
echo ""
echo " Per controllare subito che tutto funzioni, usa"
echo " deploy/macos/verifica-backup-ora.command"
echo "========================================================"
read -n 1 -s -r -p "Premi un tasto per chiudere..."
