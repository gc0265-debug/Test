#!/bin/bash
# Disinstalla il backup automatico e la sua verifica settimanale. I
# backup già fatti restano dove sono (non vengono cancellati); smette
# solo di crearne di nuovi da solo.

LABEL_BACKUP="com.fieldproject.coordinamento-commesse.backup"
LABEL_VERIFICA="com.fieldproject.coordinamento-commesse.backup-verifica"
UID_NUM="$(id -u)"

for LABEL in "$LABEL_BACKUP" "$LABEL_VERIFICA"; do
  launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
  rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
done

echo "Backup automatico disinstallato. I backup già salvati restano dove sono."
read -n 1 -s -r -p "Premi un tasto per chiudere..."
