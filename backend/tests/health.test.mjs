import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/src/app.js';
import prisma from '../dist/src/config/db.js';
import { redisClient } from '../dist/src/config/redis.js';
import { closeInfrastructure } from '../dist/src/config/shutdown.js';

test('health reports database/cache availability without exposing infrastructure errors', async t => {
  redisClient.disconnect();
  const query = prisma.$queryRaw;
  const ping = redisClient.ping;
  prisma.$queryRaw = async () => [{ '?column?': 1 }];
  redisClient.ping = async () => 'PONG';
  const server = createApp().listen(0, '127.0.0.1');
  t.after(async () => {
    prisma.$queryRaw = query;
    redisClient.ping = ping;
    await new Promise(resolve => server.close(resolve));
    await closeInfrastructure();
  });
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/health`;
  const healthy = await fetch(url);
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: 'ok' });
  for (const component of ['database', 'redis']) {
    prisma.$queryRaw = async () => {
      if (component === 'database') throw new Error('private-db-password');
      return [];
    };
    redisClient.ping = async () => {
      if (component === 'redis') throw new Error('private-redis-url');
      return 'PONG';
    };
    const failed = await fetch(url);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { status: 'unavailable' });
  }
});
