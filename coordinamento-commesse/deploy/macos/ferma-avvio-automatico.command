#!/bin/bash
# Disinstalla l'avvio automatico: il server si ferma e non ripartirà più da
# solo al prossimo accesso. Da usare solo se si vuole tornare ad avviare
# l'app a mano con "npm start", come prima.

LABEL="com.fieldproject.coordinamento-commesse"
UID_NUM="$(id -u)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
rm -f "$PLIST"

echo "Avvio automatico disinstallato. Il server non è più in esecuzione."
echo "Per usare di nuovo l'app, avviala a mano con 'npm start' come prima."
read -n 1 -s -r -p "Premi un tasto per chiudere..."
