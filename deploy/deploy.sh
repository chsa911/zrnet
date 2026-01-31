#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet

docker compose pull || true
docker compose up -d --build

echo "== containers =="
docker compose ps

echo "== last 80 lines of logs =="
docker compose logs --tail=80

# reload caddy if installed
if command -v caddy >/dev/null 2>&1; then
  sudo caddy reload --config /etc/caddy/Caddyfile || true
fi