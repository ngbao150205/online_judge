#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p .local/backups
backup=".local/backups/judge-db-$(date +%Y%m%d-%H%M%S)-$$.dump"
if docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"; then
  printf 'Database backup: %s\n' "$backup"
else
  rm -f "$backup"
  exit 1
fi
