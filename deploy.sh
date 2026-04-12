#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet

git fetch origin
git reset --hard origin/master

docker compose config >/dev/null
docker compose up -d --build api web

docker exec zrnet-caddy-1 caddy reload --config /etc/caddy/Caddyfile

echo
docker compose ps

echo
curl -fsS https://pagesinline.com/api/public/home-highlights >/dev/null
curl -fsS "https://pagesinline.com/media/covers/1fd5a6f4-552a-46c1-bf02-f2a48301f959-home.jpg?v=$(date +%s)" >/dev/null
echo "Deploy OK"
