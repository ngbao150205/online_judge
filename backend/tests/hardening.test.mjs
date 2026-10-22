import 'dotenv/config';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { explainErrorService } from '../dist/src/services/ai.service.js';
import { env } from '../dist/src/config/env.js';
import { rateLimit } from '../dist/src/middlewares/rate-limit.middleware.js';
import { redisClient } from '../dist/src/config/redis.js';
import { closeInfrastructure } from '../dist/src/config/shutdown.js';
import { readSession } from '../dist/src/services/auth/session.service.js';
import prisma from '../dist/src/config/db.js';

redisClient.disconnect();
test('AI provider uses supplied source/error and bounds malformed/error/timeout responses', async t => {
  const previous = { url: env.AI_API_URL, key: env.AI_API_KEY, model: env.AI_MODEL, timeout: env.AI_TIMEOUT_MS };
  env.AI_API_URL = undefined;
  await assert.rejects(explainErrorService({ language: 'python', sourceCode: 'print(1)' }), error => error.code === 'AI_UNAVAILABLE');
  let behavior = 'valid';
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ body: JSON.parse(body), authorization: req.headers.authorization });
    if (behavior === 'timeout') return;
    if (behavior === 'failed') { res.writeHead(429); res.end('private-provider-error'); return; }
    res.setHeader('Content-Type', 'application/json');
    if (behavior === 'oversized') return res.end('x'.repeat(300000));
    if (behavior === 'malformed') return res.end(JSON.stringify({ choices: [] }));
    res.end(JSON.stringify({ choices: [{ message: { content: 'Lỗi chia cho 0 ở dòng 1.' } }] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => {
    env.AI_API_URL = previous.url; env.AI_API_KEY = previous.key; env.AI_MODEL = previous.model; env.AI_TIMEOUT_MS = previous.timeout;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await closeInfrastructure();
  });
  env.AI_API_URL = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
  env.AI_API_KEY = 'local-fixture-key'; env.AI_MODEL = 'fixture-model'; env.AI_TIMEOUT_MS = 100;
  const input = { language: 'python', sourceCode: 'print(1/0)', errorMessage: 'ZeroDivisionError' };
  const result = await explainErrorService(input);
  assert.equal(result.suggestion, 'Lỗi chia cho 0 ở dòng 1.');
  assert.equal(requests[0].authorization, 'Bearer local-fixture-key');
  assert.deepEqual(JSON.parse(requests[0].body.messages[1].content), input);
  assert.equal(requests[0].body.store, false);
  for (behavior of ['failed', 'malformed', 'oversized']) await assert.rejects(explainErrorService(input), error => error.code === 'AI_PROVIDER_ERROR' && !error.message.includes('private-provider'));
  behavior = 'timeout';
  await assert.rejects(explainErrorService(input), error => error.code === 'AI_TIMEOUT');
});

test('rate limit normalizes email, returns Retry-After and fails closed when Redis is unavailable', async t => {
  const previous = env.RATE_LIMIT_ENABLED, originalEval = redisClient.eval;
  env.RATE_LIMIT_ENABLED = true;
  t.after(() => { env.RATE_LIMIT_ENABLED = previous; redisClient.eval = originalEval; });
  let count = 0; const keys = [];
  redisClient.eval = async (_script, _count, key, milliseconds) => { keys.push(key); assert.equal(milliseconds, 900000); return [++count, 1200]; };
  const middleware = rateLimit('fixture', 1, 900, 'email');
  const response = { setHeader: (_name, value) => { assert.equal(value, 2); } };
  let failure;
  await middleware({ body: { email: ' USER@example.com ' } }, response, error => { failure = error; });
  assert.equal(failure, undefined);
  await middleware({ body: { email: 'user@example.com' } }, response, error => { failure = error; });
  assert.equal(failure.statusCode, 429); assert.equal(keys[0], keys[1]); assert.ok(!keys[0].includes('user@example.com'));
  redisClient.eval = async () => { throw new Error('private redis endpoint'); };
  await middleware({ body: { email: 'x@example.com' } }, response, error => { failure = error; });
  assert.equal(failure.statusCode, 503);
});

test('sessions reject missing/deleted users and token-version mismatch and expose current database role', async t => {
  const original = prisma.authSession.findFirst;
  t.after(() => { prisma.authSession.findFirst = original; });
  let session = null;
  prisma.authSession.findFirst = async () => session;
  await assert.rejects(readSession('user', 'session', 0), error => error.code === 'SESSION_REVOKED');
  session = { tokenVersion: 0, user: { id: 'user', role: 'STUDENT', tokenVersion: 0, deletedAt: null } };
  assert.equal((await readSession('user', 'session', 0)).role, 'STUDENT');
  session.user.role = 'ADMIN'; assert.equal((await readSession('user', 'session', 0)).role, 'ADMIN');
  session.user.tokenVersion = 1;
  await assert.rejects(readSession('user', 'session', 0), error => error.code === 'SESSION_REVOKED');
  session.user.tokenVersion = 0; session.user.deletedAt = new Date();
  await assert.rejects(readSession('user', 'session', 0), error => error.code === 'SESSION_REVOKED');
});
