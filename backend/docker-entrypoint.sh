#!/bin/sh
set -eu

# Normal startup only verifies deployment state; schema/queue changes are explicit.
if [ "$#" -eq 2 ] && [ "$1" = node ] && [ "$2" = dist/src/server.js ]; then
  printf '[Startup] Checking database migrations (run docker/deploy.sh if pending)...\n'
  npm run db:status
  printf '[Startup] Checking job/result queues...\n'
  node dist/src/workers/queue.ready.entry.js
fi

exec "$@"
