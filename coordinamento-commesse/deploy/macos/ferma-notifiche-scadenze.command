#!/bin/bash
# Disinstalla il controllo automatico orario delle scadenze. Le commesse
# restano configurate con il loro indirizzo email, pronte a ripartire se
# si rilancia deploy/macos/installa-notifiche-scadenze.command.

LABEL="com.fieldproject.coordinamento-commesse.notifiche-scadenze"
UID_NUM="$(id -u)"

launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"

echo "Notifiche automatiche di scadenza disinstallate."
read -n 1 -s -r -p "Premi un tasto per chiudere..."
