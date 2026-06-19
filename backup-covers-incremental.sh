#!/usr/bin/env bash
# backup-covers-incremental.sh — pull only NEW covers (not already in ~/p_backup)
# from the PRODUCTION server. Existing local files are left untouched and not
# re-transferred, so repeat runs are fast and only fetch what's missing.
#
# Usage:
#   ./backup-covers-incremental.sh              — sync new covers only
#   ./backup-covers-incremental.sh --dry-run     — show what WOULD be copied, copy nothing

set -euo pipefail

REMOTE_HOST="root@46.224.178.235"
PROD_COVERS_ROOT="/srv/zrnet/uploads/covers"   # host path, bind-mounted into the container at /uploads/covers
LOCAL_DIR="$HOME/p_backup"
LOCAL_COVERS_DIR="$LOCAL_DIR/covers"
LOG="$LOCAL_DIR/backup.log"
MODE="${1:-}"

mkdir -p "$LOCAL_COVERS_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

RSYNC_FLAGS=(-avz --ignore-existing)
if [ "$MODE" = "--dry-run" ]; then
  RSYNC_FLAGS+=(--dry-run)
  log "Dry run: listing covers that would be pulled (none will be copied)…"
else
  log "Pulling new covers only (skipping anything already in $LOCAL_COVERS_DIR)…"
fi

# --ignore-existing: if a file with that name already exists locally, skip it
# entirely (no overwrite, no re-transfer) — this is what makes the backup
# incremental. Trailing slashes matter: copies CONTENTS of covers/ into covers/.
rsync "${RSYNC_FLAGS[@]}" \
  -e "ssh" \
  "$REMOTE_HOST:$PROD_COVERS_ROOT/" "$LOCAL_COVERS_DIR/" \
  | tee -a "$LOG"

if [ "$MODE" != "--dry-run" ]; then
  TOTAL=$(find "$LOCAL_COVERS_DIR" -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
  log "Done. Local cover count: $TOTAL"
fi
