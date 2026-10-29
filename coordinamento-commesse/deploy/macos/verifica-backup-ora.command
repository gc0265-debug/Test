#!/bin/bash
# Verifica subito, a mano, che l'ultimo backup cifrato si possa davvero
# ricostruire: lo decifra in una copia temporanea, controlla l'integrità
# del database e la cancella. Non tocca in alcun modo il database reale.

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
if "$NODE_BIN" scripts/backup-db.js --verify; then
  echo ""
  echo "Il backup più recente è a posto: si decifra e il database al suo interno è integro."
else
  echo ""
  echo "ATTENZIONE: la verifica ha trovato un problema (vedi sopra). Avvisa chi segue l'app."
fi
read -n 1 -s -r -p "Premi un tasto per chiudere..."
