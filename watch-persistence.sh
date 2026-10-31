#!/usr/bin/env bash
# watch-persistence.sh — Persistenz-Wächter (läuft per launchd alle 15 Minuten)
#
# Prüft die Datenbank auf offene Vorgänge (abgelehnte Registrierungen) und
# neue Doppel-Barcodes (backend/scripts/checkPersistence.js, nur lesend).
#
# Meldet sich nur, wenn es etwas zu tun gibt:
#   - sofort bei NEUEN Funden (spätestens 15 Minuten nach der Ablehnung)
#   - einmal am Morgen (ab 8 Uhr), solange noch etwas offen ist
#   - wenn die Datenbank nicht erreichbar ist (höchstens alle 3 Stunden)
# Nachts (23–7 Uhr) läuft er nicht.
#
# Spart Neon-Compute-Stunden: Automatische Läufe prüfen nur, wenn die
# Datenbank ohnehin gerade wach ist (also jemand die Seite/DB benutzt).
# Schläft sie, wird der Lauf übersprungen – sie wird nicht aufgeweckt.
# Abfrage über die Neon-API (backend/scripts/neonComputeActive.js),
# braucht NEON_API_KEY in .env. Ohne Key: Verhalten wie früher.
#
# Manuell:  ./watch-persistence.sh          (Ruhezeit wird dabei ignoriert)

set -uo pipefail

PROJECT="$HOME/zrnet-clean"
REPORT_DIR="$HOME/p_backup/waechter"
REPORT="$REPORT_DIR/bericht-$(date +%Y-%m-%d).txt"
LATEST="$REPORT_DIR/letzter-bericht.txt"
STATE="$REPORT_DIR/state.json"
ERR_MARK="$REPORT_DIR/.last-error-alert"
ADMIN_URL="${ADMIN_URL:-https://pagesinline.com/admin/open-issues}"

mkdir -p "$REPORT_DIR"

# Ruhezeit nur für automatische Läufe (launchd setzt kein TERM)
HOUR=$(date +%H)
if [ -z "${TERM:-}" ] && { [ "$HOUR" -lt 7 ] || [ "$HOUR" -ge 23 ]; }; then
  exit 0
fi

cd "$PROJECT/backend" || exit 2

# Nur prüfen, wenn die Datenbank wach ist (manuelle Läufe prüfen immer)
if [ -z "${TERM:-}" ]; then
  NEON=$(node scripts/neonComputeActive.js 2>/dev/null)
  case $? in
    3) exit 0 ;;   # schläft → nicht aufwecken
    2) echo "$(date '+%F %T') $NEON – prüfe trotzdem" >> "$REPORT_DIR/verlauf.log" ;;
  esac
fi

OUT=$(ALERT_STATE="$STATE" node scripts/checkPersistence.js 2>&1)
STATUS=$?
{
  echo "Persistenz-Wächter – $(date '+%Y-%m-%d %H:%M')"
  echo
  echo "$OUT"
} > "$LATEST"
# Tagesbericht: letzten Stand des Tages behalten
cp "$LATEST" "$REPORT"

dialog() {
  # $1 = Text. Bleibt stehen, bis man ihn wegklickt (max. 1 Stunde).
  local answer
  answer=$(osascript \
    -e "display dialog \"$1\" with title \"zrnet Wächter\" buttons {\"Später\", \"Bericht\", \"Vorgänge öffnen\"} default button \"Vorgänge öffnen\" with icon caution giving up after 3600" \
    -e 'button returned of result' 2>/dev/null)
  case "$answer" in
    "Vorgänge öffnen") open "$ADMIN_URL" ;;
    "Bericht") open -e "$LATEST" ;;
  esac
}

case "$STATUS" in
  0)
    echo "$(date '+%F %T') ok" >> "$REPORT_DIR/verlauf.log"
    ;;
  1)
    TEXT=$(printf '%s\n' "$OUT" | sed -n 's/^ALERT: //p' | tail -1 | tr -d '"\\')
    echo "$(date '+%F %T') MELDUNG: $TEXT" >> "$REPORT_DIR/verlauf.log"
    dialog "Registrierung nicht gespeichert – bitte erledigen. $TEXT"
    ;;
  *)
    echo "$(date '+%F %T') FEHLER (Exit $STATUS)" >> "$REPORT_DIR/verlauf.log"
    # höchstens alle 3 Stunden melden (z. B. wenn offline)
    if [ ! -f "$ERR_MARK" ] || [ -n "$(find "$ERR_MARK" -mmin +180 2>/dev/null)" ]; then
      touch "$ERR_MARK"
      dialog "Der Wächter konnte die Datenbank nicht prüfen (Exit $STATUS). Internet / DATABASE_URL prüfen."
    fi
    ;;
esac

find "$REPORT_DIR" -name 'bericht-*.txt' -mtime +60 -delete 2>/dev/null || true
exit "$STATUS"
