#!/usr/bin/env bash
set -euo pipefail

BOOK_ID="${1:-}"
LOCAL_DIR="/Users/chsa911/p_uploads/covers"
REMOTE_HOST="root@46.224.178.235"
REMOTE_DIR="/srv/zrnet/uploads/covers"

if [ -z "$BOOK_ID" ]; then
  echo "Usage: ./sync-book.prod.sh <book_id>"
  exit 1
fi

FOUND=0

if [ -f "$LOCAL_DIR/${BOOK_ID}.jpg" ]; then
  rsync -av "$LOCAL_DIR/${BOOK_ID}.jpg" "${REMOTE_HOST}:${REMOTE_DIR}/"
  FOUND=1
fi

if [ -f "$LOCAL_DIR/${BOOK_ID}-home.jpg" ]; then
  rsync -av "$LOCAL_DIR/${BOOK_ID}-home.jpg" "${REMOTE_HOST}:${REMOTE_DIR}/"
  FOUND=1
fi

if [ "$FOUND" -eq 0 ]; then
  echo "No local image found for ${BOOK_ID}"
  echo "Expected one of:"
  echo "  $LOCAL_DIR/${BOOK_ID}.jpg"
  echo "  $LOCAL_DIR/${BOOK_ID}-home.jpg"
  exit 1
fi

echo
echo "Verifying on prod..."
ssh "$REMOTE_HOST" "
  ls -lah ${REMOTE_DIR}/${BOOK_ID}.jpg 2>/dev/null || true
  ls -lah ${REMOTE_DIR}/${BOOK_ID}-home.jpg 2>/dev/null || true
"

echo
echo "Testing live URLs..."
curl -I "https://pagesinline.com/media/covers/${BOOK_ID}.jpg?v=$(date +%s)" || true
curl -I "https://pagesinline.com/media/covers/${BOOK_ID}-home.jpg?v=$(date +%s)" || true