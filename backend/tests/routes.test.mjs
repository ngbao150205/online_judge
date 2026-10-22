import { installAuthFixture } from './auth-fixture.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import { errorHandler, notFound } from '../dist/src/middlewares/error.middleware.js';
import apiRoutes from '../dist/src/routes/index.js';
import { generateToken } from '../dist/src/utils/auth.js';
import { redisClient } from '../dist/src/config/redis.js';
import prisma from '../dist/src/config/db.js';

// Routing checks never need infrastructure connections or real controller calls.
redisClient.disconnect();
await prisma.$disconnect();

const contract = JSON.parse(await readFile(new URL('./routes.contract.json', import.meta.url), 'utf8'));
const controllerNames = new Set(contract.map(endpoint => endpoint.handler));

function replaceControllers(router) {
  for (const layer of router.stack) {
    if (layer.route) {
      for (const handler of layer.route.stack) {
        const name = handler.handle.name;
        if (controllerNames.has(name)) {
          handler.handle = (req, res) => res.json({ handler: name, params: req.params });
        }
      }
    } else if (layer.handle.stack) {
      replaceControllers(layer.handle);
    }
  }
}

replaceControllers(apiRoutes);

const uuid = '11111111-1111-4111-8111-111111111111';
// Representative valid client requests; keeps the original endpoint contract checks.
const validBodies = {
  register: { name: 'Route Test', email: 'test@example.com', password: 'password123', acceptedTerms: true },
  login: { email: 'test@example.com', password: 'password123' },
  googleLogin: { credential: 'test-credential', acceptedTerms: true },
  forgotPassword: { email: 'test@example.com' },
  resetPassword: { email: 'test@example.com', otp: '123456', newPassword: 'password123' },
  updateProfile: { name: 'Updated Name' },
  changePassword: { currentPassword: 'password123', newPassword: 'password456' },
  runCustomInput: { language: 'python', sourceCode: 'print(1)', customInput: '' },
  runProblem: { problemId: uuid, language: 'cpp', sourceCode: 'int main() {}' },
  submitCode: { problemId: uuid, language: 'python', sourceCode: 'print(1)' },
  explainErrorWithAI: { language: 'python', sourceCode: 'print(1)', errorMessage: '' },
  createStudentAdminController: { name: 'Student', email: 'student@example.com', password: 'password123' },
  updateStudentAdminController: { name: 'Updated Student' },
  createProblem: { title: 'Sum', description: 'Sum numbers', categoryIds: [uuid], testcases: [] },
  updateProblem: { title: 'New Title' },
  createRoadmap: { title: 'Roadmap', problems: [{ problemId: uuid, orderIndex: 1 }] },
  updateRoadmap: { title: 'New Roadmap' },
  createCategory: { name: 'Math' },
  updateCategory: { name: 'Arithmetic' },
};


test('51 API routes (48 existing and 3 additions) preserve handlers, parameters and access rules', async t => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const tokens = {
      student: generateToken({ userId: '11111111-1111-4111-8111-111111111111', role: 'STUDENT' }),
      admin: generateToken({ userId: '22222222-2222-4222-8222-222222222222', role: 'ADMIN' }),
    };
    installAuthFixture(t, Object.values(tokens));
    async function request(method, url, token, body) {
      return fetch(`${base}${url}`, {
        method,
        headers: { ...(token ? { Cookie: `judge_session=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(5000),
      });
    }

    let checked = 0;
    for (const endpoint of contract) {
      const params = {};
      const url = endpoint.path.replace(/:([A-Za-z]+)/g, (_, key) => {
        const value = key === 'slug' ? 'example-problem' : key === 'runId' ? 'run-11111111-1111-4111-8111-111111111111' : '11111111-1111-4111-8111-111111111111';
        params[key] = value;
        return value;
      });
      for (const identity of ['anonymous', 'student', 'admin']) {
        const response = await request(endpoint.method, url, tokens[identity], validBodies[endpoint.handler]);
        const expectedStatus = endpoint.access === 'public' ? 200
          : identity === 'anonymous' ? 401
          : endpoint.access === 'admin' && identity !== 'admin' ? 403 : 200;
        assert.equal(response.status, expectedStatus, `${identity}: ${endpoint.method} ${url}`);
        if (expectedStatus === 200) {
          const data = await response.json();
          assert.equal(data.handler, endpoint.handler, `controller: ${endpoint.method} ${url}`);
          assert.deepEqual(data.params, params, `parameters: ${endpoint.method} ${url}`);
        }
        checked++;
      }
    }
    assert.equal((await request('GET', '/auth/me', 'invalid-token')).status, 401);
    assert.equal((await request('GET', '/does-not-exist')).status, 404);
    assert.equal((await request('GET', '/auth/does-not-exist')).status, 404);
    assert.equal((await request('GET', '/admin/does-not-exist', tokens.admin)).status, 404);
    console.log(`Verified ${contract.length} endpoints, ${checked} access/dispatch requests and invalid-token/404 checks.`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
