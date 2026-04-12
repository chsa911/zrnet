#!/usr/bin/env bash
set -euo pipefail

cd /srv/zrnet-staging
git fetch origin
git reset --hard origin/staging

docker compose config >/dev/null
docker compose up -d --build api web

docker compose ps