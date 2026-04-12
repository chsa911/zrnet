#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet

git fetch origin
git reset --hard origin/master

docker compose config >/dev/null
docker compose up -d --build api web

docker exec zrnet-caddy-1 caddy reload --config /etc/caddy/Caddyfile

echo "Waiting for site to come up..."
for i in {1..20}; do
  if curl -fsS https://pagesinline.com/ >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo
docker compose ps

echo
curl -I https://pagesinline.com || true
echo
curl -s https://pagesinline.com/api/public/home-highlights || true