#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet
git fetch origin
git reset --hard origin/master

docker compose config >/dev/null
docker compose up -d --build api web

docker exec zrnet-caddy-1 caddy reload --config /etc/caddy/Caddyfile
docker compose ps