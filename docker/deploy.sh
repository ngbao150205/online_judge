#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node docker/setup-env.mjs
node docker/configure-aws.mjs
docker compose build
docker compose up -d --wait postgres redis
# Provision/check AWS before stopping the current application.
docker compose run --rm --no-deps -e SQS_AUTO_CREATE=true backend node dist/src/workers/queue.ready.entry.js
docker compose stop frontend sandbox-worker backend
sh docker/backup.sh
docker compose run --rm --no-deps backend npm run db:deploy
docker compose up -d --remove-orphans --wait --wait-timeout 600
docker compose ps
