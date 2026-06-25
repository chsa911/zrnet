#!/usr/bin/env bash
# backup-covers-incremental-staging.sh — pull only NEW covers (not already in ~/p_backup/covers)
# from the STAGING stack on the same box (/srv/zrnet-staging/uploads/covers).
# Same dest dir as the production script (~/p_backup/covers) so the two backups merge:
# --ignore-existing means a file already pulled from prod is left alone, and anything
# that only exists on staging gets filled in here.
#
# Usage:
#   ./backup-covers-incremental-staging.sh              — sync new covers only
#   ./backup-covers-incremental-staging.sh --dry-run     — show what WOULD be copied, copy nothing

set -euo pipefail

REMOTE_HOST="root@46.224.178.235"
STAGING_COVERS_ROOT="/srv/zrnet-staging/uploads/covers"   # separate docker-compose stack, separate bind mount
LOCAL_DIR="$HOME/p_backup"
LOCAL_COVERS_DIR="$LOCAL_DIR/covers"
LOG="$LOCAL_DIR/backup.log"
MODE="${1:-}"

mkdir -p "$LOCAL_COVERS_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

RSYNC_FLAGS=(-avz --ignore-existing)
if [ "$MODE" = "--dry-run" ]; then
  RSYNC_FLAGS+=(--dry-run)
  log "Dry run: listing STAGING covers that would be pulled (none will be copied)…"
else
  log "Pulling new covers from STAGING only (skipping anything already in $LOCAL_COVERS_DIR)…"
fi

rsync "${RSYNC_FLAGS[@]}" \
  -e "ssh" \
  "$REMOTE_HOST:$STAGING_COVERS_ROOT/" "$LOCAL_COVERS_DIR/" \
  | tee -a "$LOG"

if [ "$MODE" != "--dry-run" ]; then
  TOTAL=$(find "$LOCAL_COVERS_DIR" -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
  log "Done. Local cover count: $TOTAL"
fi
