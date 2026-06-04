#!/usr/bin/env bash
# backup-covers.sh — pull ALL covers from the PRODUCTION server into ~/p_backup/covers/
# Usage:
#   ./backup-covers.sh              — sync + integrity check
#   ./backup-covers.sh --check-only — integrity check only (no rsync)

set -euo pipefail

REMOTE_HOST="root@46.224.178.235"
LOCAL_DIR="$HOME/p_backup"
LOG="$HOME/p_backup/backup.log"
CHECK_ONLY="${1:-}"

mkdir -p "$LOCAL_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [ "$CHECK_ONLY" != "--check-only" ]; then
  log "Starting cover backup from production…"

  ssh -T "$REMOTE_HOST" '
    name="zrnet-api-1"
    if ! docker ps --format "{{.Names}}" | grep -qx "$name"; then
      echo "ERROR: production container $name is not running" >&2
      exit 1
    fi
    docker exec "$name" tar -C /uploads -cf - covers
  ' | tar -xf - -C "$LOCAL_DIR"

  TOTAL=$(find "$LOCAL_DIR/covers" -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
  log "Backup complete. Total files: $TOTAL"
fi

# Integrity check: count covers per type
FULL=$(find "$LOCAL_DIR/covers/normalized" -name "*.jpg" ! -name "*-home.jpg" 2>/dev/null | wc -l | tr -d ' ')
HOME=$(find "$LOCAL_DIR/covers/normalized" -name "*-home.jpg" 2>/dev/null | wc -l | tr -d ' ')
RAW=$(find "$LOCAL_DIR/covers/raw" -name "*" -type f 2>/dev/null | wc -l | tr -d ' ')
ROOT=$(find "$LOCAL_DIR/covers" -maxdepth 1 -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')

log "Cover inventory: $FULL full, $HOME home, $RAW raw (normalized/), $ROOT root/"

if [ "$FULL" -eq 0 ] && [ "$ROOT" -eq 0 ]; then
  log "WARNING: No covers found — backup may have failed!"
  exit 1
fi

log "Done."
