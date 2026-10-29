#!/bin/bash
# Scarica gli ultimi aggiornamenti dell'app e riavvia il servizio in
# background, così le novità diventano subito attive. Da lanciare con un
# doppio click ogni volta che è stato pushato un aggiornamento.

set -e
LABEL="com.fieldproject.coordinamento-commesse"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Cartella del progetto: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ""
echo "--- Scarico gli aggiornamenti (git pull) ---"
git pull

echo ""
echo "--- Aggiorno le dipendenze del server, se servono ---"
npm run install:server

UID_NUM="$(id -u)"
if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
  echo ""
  echo "--- Riavvio il servizio in background ---"
  launchctl kickstart -k "gui/$UID_NUM/$LABEL"
  echo ""
  echo "========================================================"
  echo " Fatto. L'app è aggiornata e già disponibile su:"
  echo " http://localhost:3002"
  echo "========================================================"
else
  echo ""
  echo "Il servizio automatico non risulta installato: lancia prima"
  echo "'installa-avvio-automatico.command', oppure avvia l'app come fai di"
  echo "solito (npm start) — il codice è comunque già aggiornato."
fi
read -n 1 -s -r -p "Premi un tasto per chiudere..."
