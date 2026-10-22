import { installAuthFixture } from './auth-fixture.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import apiRoutes from '../dist/src/routes/index.js';
import { authenticate, authorize } from '../dist/src/middlewares/auth.middleware.js';
import { errorHandler, notFound } from '../dist/src/middlewares/error.middleware.js';
import { requestLogger } from '../dist/src/middlewares/request-logger.middleware.js';
import { AppError } from '../dist/src/errors/app-error.js';
import { generateToken } from '../dist/src/utils/auth.js';
import { redisClient } from '../dist/src/config/redis.js';
import prisma from '../dist/src/config/db.js';

redisClient.disconnect();
await prisma.$disconnect();
const contract = JSON.parse(await readFile(new URL('./routes.contract.json', import.meta.url), 'utf8'));
const names = new Set(contract.map(endpoint => endpoint.handler));
let controllerCalls = 0;
function stubControllers(router) {
  for (const layer of router.stack) {
    if (layer.route) {
      for (const handler of layer.route.stack) {
        if (names.has(handler.handle.name)) {
          handler.handle = (req, res) => {
            controllerCalls++;
            res.json({ body: req.body, params: req.params });
          };
        }
      }
    } else if (layer.handle.stack) stubControllers(layer.handle);
  }
}
stubControllers(apiRoutes);

test('middleware rejects unsafe requests before controllers and returns consistent JSON errors', async t => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRoutes);
  app.get('/failure', authenticate, () => { throw new Error('secret-database-connection-string'); });
  app.get('/conflict', (_req, _res, next) => next(new AppError(409, 'Conflict', 'CONFLICT')));
  app.get('/role-only', authorize('ADMIN'), (_req, res) => res.json({ ok: true }));
  app.use(notFound);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const userId = '11111111-1111-4111-8111-111111111111';
    const student = generateToken({ userId, role: 'STUDENT' });
    const admin = generateToken({ userId, role: 'ADMIN' });
    installAuthFixture(t, [student, admin]);
    const secret = process.env.JWT_SECRET || 'super_secret_key_2026';
    const sign = (payload, options = {}) => jwt.sign(payload, secret, options);
    async function request(method, path, { token, body, raw, authorization, cookie } = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(token ? { Cookie: `judge_session=${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(authorization ? { Authorization: authorization } : {}),
          ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, data: await response.json() };
    }
    async function rejected(method, path, options, status, code) {
      const before = controllerCalls;
      const result = await request(method, path, options);
      assert.equal(result.status, status, `${method} ${path}`);
      assert.equal(result.data.success, false);
      assert.equal(result.data.code, code);
      assert.equal(controllerCalls, before, 'controller must not run for rejected input');
      return result.data;
    }

    await rejected('POST', '/api/submissions/run', { body: {} }, 401, 'UNAUTHENTICATED');
    await rejected('POST', '/api/admin/problems', { token: student, body: {} }, 403, 'FORBIDDEN');
    await rejected('GET', '/role-only', {}, 401, 'UNAUTHENTICATED');
    for (const token of [
      'invalid', sign({ userId, role: 'ADMIN' }),
      sign({ userId: 'not-uuid', role: 'ADMIN' }, { expiresIn: '1m' }),
      sign({ userId, role: 'OWNER' }, { expiresIn: '1m' }),
      sign({ userId, role: 'ADMIN' }, { expiresIn: -1 }),
      sign({ userId, role: 'ADMIN' }, { expiresIn: '1m', algorithm: 'HS384' }),
    ]) await rejected('GET', '/api/auth/me', { cookie: `judge_session=${token}` }, 401, 'INVALID_TOKEN');
    await rejected('GET', '/api/auth/me', { authorization: `Bearer ${student} extra` }, 401, 'UNAUTHENTICATED');
    await rejected('GET', '/api/auth/me', { cookie: `judge_session=${student}; judge_session=${admin}` }, 401, 'UNAUTHENTICATED');
    assert.equal((await request('GET', '/api/auth/me', { token: student })).status, 200);

    const run = { language: 'python', sourceCode: 'print(1)', customInput: '' };
    for (const body of [null, [], {}, { ...run, language: 'java' }, { ...run, sourceCode: '  ' },
      { ...run, sourceCode: 'đ'.repeat(40000) }, { ...run, customInput: 1 }, { ...run, problemId: 'bad-id' }]) {
      await rejected('POST', '/api/submissions/run', { token: student, body }, 400, body === null ? 'INVALID_JSON' : 'VALIDATION_ERROR');
    }
    await rejected('GET', '/api/submissions/bad-id', { token: student }, 400, 'VALIDATION_ERROR');
    await rejected('GET', '/api/submissions/run-status/run-invalid', { token: student }, 400, 'VALIDATION_ERROR');
    for (const query of ['page=-1', 'limit=101', 'page=1&page=2', 'difficulty=IMPOSSIBLE', 'categoryId=bad-id']) {
      await rejected('GET', `/api/problems?${query}`, { token: student }, 400, 'VALIDATION_ERROR');
    }
    await rejected('PUT', `/api/admin/users/${userId}`, { token: admin, body: {} }, 400, 'VALIDATION_ERROR');
    await rejected('POST', '/api/admin/problems', {
      token: admin, body: { title: 'P', description: 'D', categoryIds: [userId, userId], timeLimit: -1 },
    }, 400, 'VALIDATION_ERROR');
    await rejected('POST', '/api/admin/roadmaps', {
      token: admin, body: { title: 'R', problems: [{ problemId: userId }, { problemId: userId }] },
    }, 400, 'VALIDATION_ERROR');
    await rejected('POST', '/api/auth/reset-password', { body: { otp: '12', newPassword: 'abcdef' } }, 400, 'VALIDATION_ERROR');
    await rejected('POST', '/api/auth/login', { raw: '{bad json' }, 400, 'INVALID_JSON');
    await rejected('POST', '/api/auth/login', { raw: JSON.stringify({ password: 'x'.repeat(1100000) }) }, 413, 'PAYLOAD_TOO_LARGE');
    const unsupportedEncoding = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=unsupported' }, body: '{}',
    });
    assert.equal(unsupportedEncoding.status, 415);
    assert.equal((await unsupportedEncoding.json()).code, 'UNSUPPORTED_ENCODING');

    const login = await request('POST', '/api/auth/login', { body: { email: ' User@Example.COM ', password: '  unchanged  ' } });
    assert.equal(login.data.body.email, 'user@example.com');
    assert.equal(login.data.body.password, '  unchanged  ');
    const created = await request('POST', '/api/admin/users', {
      token: admin, body: { name: ' Person ', email: 'USER@example.com', password: 'abcdef', ignored: 'value' },
    });
    assert.equal(created.status, 200);
    assert.deepEqual(created.data.body, { name: 'Person', email: 'user@example.com', pwd: 'abcdef' });
    await rejected('POST', '/api/auth/register', {
      body: { name: 'Person', email: 'p@example.com', password: 'abcdef' },
    }, 400, 'VALIDATION_ERROR');
    const registered = await request('POST', '/api/auth/register', {
      body: { name: 'Person', email: 'p@example.com', password: 'abcdef', acceptedTerms: true, role: 'ADMIN' },
    });
    assert.equal(registered.data.body.role, undefined);
    const sourceCode = 'print("hello")\n';
    assert.equal((await request('POST', '/api/submissions/run', { token: student, body: { ...run, sourceCode } })).data.body.sourceCode, sourceCode);

    const failure = await request('GET', '/failure', { token: student });
    assert.equal(failure.status, 500); // Must not be caught as an authentication failure.
    assert.equal(failure.data.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(failure.data).includes('secret-database'));
    assert.equal((await request('GET', '/conflict')).data.code, 'CONFLICT');
    await rejected('GET', '/not-found', {}, 404, 'NOT_FOUND');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('HTTP logger excludes request credentials, body and query', () => {
  const listeners = {};
  const lines = [];
  const original = console.info;
  console.info = line => lines.push(line);
  try {
    requestLogger({ method: 'POST', path: '/api/auth/login',
      headers: { authorization: 'secret-token' }, body: { password: 'secret-password' },
      query: { token: 'secret-query' },
    }, { statusCode: 400, on: (event, handler) => { listeners[event] = handler; } }, () => {});
    listeners.finish();
    assert.match(lines[0], /POST \/api\/auth\/login 400/);
    assert.ok(!lines.join('').includes('secret-'));
  } finally { console.info = original; }
});
