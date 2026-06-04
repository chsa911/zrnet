#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet

# Snapshot covers before deploying — stored as dated tar on the server
SNAP="/srv/zrnet-backups/covers-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p /srv/zrnet-backups
tar -czf "$SNAP" -C /srv/zrnet/uploads covers 2>/dev/null && echo "Cover snapshot: $SNAP" || echo "Cover snapshot skipped (no covers yet)"

# Keep only the last 14 snapshots
ls -t /srv/zrnet-backups/covers-*.tar.gz 2>/dev/null | tail -n +15 | xargs rm -f || true

git fetch origin
git reset --hard origin/master

docker compose config >/dev/null
docker compose up -d --build api web

docker exec zrnet-caddy-1 caddy reload --config /etc/caddy/Caddyfile
docker compose ps