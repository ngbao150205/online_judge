import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';

test('migration SQL creates all model columns in an isolated PostgreSQL container', {
  skip: process.env.RUN_POSTGRES_INTEGRATION !== 'true', timeout: 60000,
}, async () => {
  const name = `judge-migrations-test-${randomUUID().slice(0, 8)}`;
  const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 15000 });
  let created = false;
  try {
    docker('create', '--name', name, '--network', 'none', '--memory', '256m', '--cpus', '1',
      '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_PASSWORD=temporary-test-password',
      '-e', 'POSTGRES_DB=judge_migrations_test', 'postgres:15-alpine');
    created = true;
    docker('start', name);
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      // The image starts a socket-only temporary server during initdb; wait for final TCP readiness.
      if (spawnSync('docker', ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'judge_migrations_test'], { timeout: 5000 }).status === 0) { ready = true; break; }
      await delay(100);
    }
    assert.ok(ready, 'temporary PostgreSQL must be ready');
    const root = new URL('../prisma/migrations/', import.meta.url);
    const migrations = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    async function apply(name) {
      const sql = await readFile(new URL(`${name}/migration.sql`, root), 'utf8');
      const result = spawnSync('docker', ['exec', '-i', nameContainer, 'psql', '-U', 'postgres', '-d', 'judge_migrations_test', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', timeout: 15000 });
      assert.equal(result.status, 0, `migration ${name}: ${result.stderr}`);
    }
    const nameContainer = name;
    for (const migration of migrations) await apply(migration);
    await apply('20261013000000_add_roadmap_progress'); // Safe when an existing database already has the table.
    const columns = JSON.parse(docker('exec', name, 'psql', '-U', 'postgres', '-d', 'judge_migrations_test', '-At', '-c',
      "SELECT json_agg(t) FROM (SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public') t;"));
    for (const model of Prisma.dmmf.datamodel.models) {
      for (const field of model.fields.filter(field => field.kind !== 'object')) {
        assert.ok(columns.some(column => column.table_name === (model.dbName || model.name) && column.column_name === (field.dbName || field.name)), `${model.name}.${field.name}`);
      }
    }
  } finally {
    if (created) docker('rm', '-f', name); // Only the isolated container created by this test.
  }
});
