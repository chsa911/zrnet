#!/usr/bin/env bash
# install-persistence-watch.sh — richtet den täglichen Persistenz-Wächter ein.
# Einmal ausführen:   ./install-persistence-watch.sh
# Entfernen:          ./install-persistence-watch.sh --uninstall

set -euo pipefail
LABEL="com.zrnet.persistencewatch"
SRC="$HOME/zrnet-clean/$LABEL.plist"
DST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  rm -f "$DST"
  echo "Wächter entfernt."
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/p_backup/waechter"
chmod +x "$HOME/zrnet-clean/watch-persistence.sh"
cp "$SRC" "$DST"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$DST"

echo "✅ Wächter eingerichtet – läuft alle 15 Minuten (7–23 Uhr), meldet sich nur bei Neuem + morgens als Erinnerung."
echo "   Berichte: $HOME/p_backup/waechter/"
echo
echo "Erster Probelauf jetzt …"
"$HOME/zrnet-clean/watch-persistence.sh" && echo "✅ Alles in Ordnung." || echo "⚠ Probleme oder Fehler – siehe Dialog / Bericht."
