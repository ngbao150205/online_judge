#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node docker/setup-env.mjs
export SQS_ENDPOINT_URL=http://sqs:9324
export SQS_QUEUE_URL=http://sqs:9324/000000000000/judge-jobs
export RESULT_QUEUE_URL=http://sqs:9324/000000000000/judge-results
export AWS_REGION=ap-southeast-1
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export AWS_SESSION_TOKEN=
export SQS_AUTO_CREATE=true
export TEST_RESULT_WORKER_ENABLED=true
compose() {
  docker compose -p judge-packaging-smoke -f docker-compose.yml -f docker/compose.test.yml "$@"
}
# All resources under this project name are disposable test data.
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    compose logs --tail=80 backend sandbox-worker sqs || true
  fi
  compose down -v --remove-orphans
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
compose build
compose up -d --wait postgres redis sqs
compose run --rm --no-deps backend npm run db:deploy
compose run --rm --no-deps -e SQS_AUTO_CREATE=true backend node dist/src/workers/queue.ready.entry.js
compose up -d --wait --wait-timeout 600
compose exec -T backend node --input-type=module < docker/smoke-test.mjs
export TEST_RESULT_WORKER_ENABLED=false
compose up -d --no-deps --no-build --wait backend
compose exec -T backend node --input-type=module < docker/outbox-test.mjs
export TEST_RESULT_WORKER_ENABLED=true
compose up -d --no-deps --no-build --wait backend
# Nginx resolves the backend address at startup; refresh after backend recreation.
compose restart frontend
compose exec -T backend node --input-type=module < docker/reliability-test.mjs
# Verify pg_dump/pg_restore with real fixture data in another DB of this temporary server.
original_count=$(compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM submissions;"')
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/restore-check.dump; createdb -U "$POSTGRES_USER" judge_restore_check; pg_restore -U "$POSTGRES_USER" -d judge_restore_check --no-owner --exit-on-error /tmp/restore-check.dump'
restored_count=$(compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d judge_restore_check -Atc "SELECT count(*) FROM submissions;"')
[ "$original_count" -gt 0 ]
[ "$original_count" = "$restored_count" ]
printf 'PASS: PostgreSQL backup and restore into an independent test database\n' 
