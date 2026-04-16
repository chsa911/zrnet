#!/usr/bin/env bash
set -euo pipefail

cd ~/zrnet
git checkout master
git pull origin master
git push origin master

ssh root@46.224.178.235 '
cd /srv/zrnet &&
git fetch origin &&
git reset --hard origin/master &&
chmod +x deploy.prod.sh &&
bash deploy.prod.sh
'