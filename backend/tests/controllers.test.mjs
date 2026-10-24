import { installAuthFixture } from './auth-fixture.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import { Prisma } from '@prisma/client';
import apiRoutes from '../dist/src/routes/index.js';
import { errorHandler, notFound } from '../dist/src/middlewares/error.middleware.js';
import { generateToken } from '../dist/src/utils/auth.js';
import prisma from '../dist/src/config/db.js';
import { env } from '../dist/src/config/env.js';
import { redisClient } from '../dist/src/config/redis.js';
import { sqsClient } from '../dist/src/config/sqs.js';

// Use actual controllers/services, but replace infrastructure at the client boundary.
redisClient.disconnect();
await prisma.$disconnect();
const userId = '11111111-1111-4111-8111-111111111111';
const problemId = '22222222-2222-4222-8222-222222222222';
const submissionId = '33333333-3333-4333-8333-333333333333';
const token = generateToken({ userId, role: 'STUDENT' });
const admin = generateToken({ userId, role: 'ADMIN' });
const execution = { problemId, language: 'python', sourceCode: 'print(20)\n' };

// Prisma delegates are proxies; Node mock.method cannot discover their descriptors.
function mockMethod(t, object, key, implementation) {
  const original = object[key];
  const mocked = t.mock.fn(implementation);
  object[key] = mocked;
  t.after(() => { object[key] = original; });
  return mocked;
}

const problem = {
  id: problemId, testcaseVersion: 1, isActive: true, checkerType: 'TOKENS', timeLimit: 1000, memoryLimit: 256,
  testcases: [
    { id: 'test-public', inputData: '1 2', expectedOutput: '3' },
    { id: 'test-hidden', inputData: '4 5', expectedOutput: '9' },
  ],
};

test('actual controllers delegate business logic and preserve execution/submission responses', async t => {
  installAuthFixture(t, [token, admin]);
  mockMethod(t, prisma, '$transaction', async value => Array.isArray(value) ? Promise.all(value) : value(prisma));
  mockMethod(t, prisma, '$queryRaw', async () => []);
  mockMethod(t, redisClient, 'multi', () => {
    const chain = { set: () => chain, exec: async () => [[null, 'OK'], [null, 'OK']] };
    return chain;
  });
  const previousQueue = env.SQS_QUEUE_URL;
  env.SQS_QUEUE_URL = 'https://sqs.example.invalid/jobs';
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(method, path, body, identity = token) {
      const response = await fetch(base + path, {
        method, headers: { Cookie: `judge_session=${identity}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, data: await response.json() };
    }

    await t.test('custom run stores durable Playground history and dispatches the PLAYGROUND job', async t => {
      const jobs = [];
      let savedRun;
      mockMethod(t, prisma.playgroundRun, 'create', async query => { savedRun = query.data; return query.data; });
      mockMethod(t, sqsClient, 'send', async command => { jobs.push(JSON.parse(command.input.MessageBody)); });
      mockMethod(t, prisma.submission, 'create', () => { throw new Error('Must not create official submission'); });
      const redisWritesBefore = redisClient.multi.mock.callCount();
      const response = await request('POST', '/submissions/run', {
        language: 'cpp', sourceCode: 'int main() {}\n', customInput: '4 7 -2 11\n',
      });
      assert.equal(response.status, 200);
      assert.match(response.data.runId, /^play-/);
      assert.equal(jobs[0].submissionId, response.data.runId);
      assert.equal(jobs[0].submissionType, 'PLAYGROUND');
      assert.equal(jobs[0].input, '4 7 -2 11\n');
      assert.equal(jobs[0].code, 'int main() {}\n');
      assert.equal(jobs[0].timeLimit, 2000);
      assert.equal(jobs[0].memoryLimit, 256);
      assert.equal(savedRun.userId, userId);
      assert.equal(savedRun.language, 'cpp');
      assert.equal(savedRun.sourceCode, 'int main() {}\n');
      assert.equal(savedRun.customInput, '4 7 -2 11\n');
      assert.equal(savedRun.status, 'PENDING');
      assert.equal(redisClient.multi.mock.callCount(), redisWritesBefore);
    });

    await t.test('trial selects public tests and initializes Redis before dispatch', async t => {
      const actions = [];
      mockMethod(t, prisma.problem, 'findUnique', async query => {
        assert.deepEqual(query.select.testcases.where, { isHidden: false, deletedAt: null });
        return { ...problem, testcases: [problem.testcases[0]] };
      });
      mockMethod(t, redisClient, 'multi', () => {
        const chain = { set: (key, value) => {
          if (key.startsWith('run_result:')) assert.equal(JSON.parse(value).total, 1);
          return chain;
        }, exec: async () => { actions.push('redis'); return [[null, 'OK'], [null, 'OK']]; } };
        return chain;
      });
      mockMethod(t, sqsClient, 'send', async command => {
        actions.push('sqs'); const job = JSON.parse(command.input.MessageBody);
        assert.equal(job.testcaseId, 'test-public');
        assert.equal(job.submissionType, 'PROBLEM_TRIAL');
      });
      const response = await request('POST', '/submissions/run-problem', execution);
      assert.equal(response.status, 200);
      assert.equal(response.data.total, 1);
      assert.deepEqual(actions, ['redis', 'sqs']);
    });

    await t.test('trial without public tests falls back to playground', async t => {
      mockMethod(t, prisma.problem, 'findUnique', async () => ({ ...problem, testcases: [] }));
      mockMethod(t, redisClient, 'set', async () => {});
      const jobs = [];
      mockMethod(t, sqsClient, 'send', async command => { jobs.push(JSON.parse(command.input.MessageBody)); });
      const response = await request('POST', '/submissions/run-problem', execution);
      assert.equal(response.data.total, 1);
      assert.equal(jobs[0].submissionType, 'PLAYGROUND');
      assert.equal(jobs[0].testcaseId, '');
    });

    await t.test('official submission atomically stores testcase snapshots and outbox jobs before SQS dispatch', async t => {
      mockMethod(t, prisma.problem, 'findUnique', async query => {
        assert.deepEqual(query.include.testcases.where, { deletedAt: null }); return problem;
      });
      mockMethod(t, prisma.submission, 'create', async query => {
        assert.equal(query.data.userId, userId); assert.equal(query.data.totalTestcases, 2);
        assert.ok(query.data.deadlineAt instanceof Date);
        assert.deepEqual(query.data.results.create.map(item => item.expectedOutput), ['3', '9']);
        return query.data;
      });
      let jobs;
      mockMethod(t, prisma.outboxJob, 'createMany', async query => { jobs = query.data; return { count: jobs.length }; });
      const send = mockMethod(t, sqsClient, 'send', async () => { throw new Error('API must not directly dispatch official jobs'); });
      const response = await request('POST', '/submissions', execution);
      assert.equal(response.status, 201);
      assert.equal(response.data.data.status, 'PENDING');
      assert.deepEqual(jobs.map(job => job.payload.testcaseId), ['test-public', 'test-hidden']);
      assert.ok(jobs.every(job => job.submissionId === response.data.submissionId));
      assert.equal(send.mock.callCount(), 0);
    });
    await t.test('transaction failure does not dispatch partially created official jobs', async t => {
      mockMethod(t, prisma, '$transaction', async () => { throw new Error('private-storage-error'); });
      const send = mockMethod(t, sqsClient, 'send', async () => {});
      const response = await request('POST', '/submissions', execution);
      assert.equal(response.status, 500);
      assert.equal(send.mock.callCount(), 0);
      assert.ok(!JSON.stringify(response.data).includes('private-storage'));
    });

    await t.test('missing/inactive problem and missing queue return domain errors', async t => {
      const create = mockMethod(t, prisma.submission, 'create', () => { throw new Error('Unexpected creation'); });
      mockMethod(t, prisma.problem, 'findUnique', async () => null);
      const missing = await request('POST', '/submissions', execution);
      assert.equal(missing.status, 404);
      assert.equal(missing.data.code, 'PROBLEM_NOT_FOUND');
      delete env.SQS_QUEUE_URL;
      try {
        const unavailable = await request('POST', '/submissions/run', execution);
        assert.equal(unavailable.status, 503);
        assert.equal(unavailable.data.code, 'QUEUE_UNAVAILABLE');
      } finally { env.SQS_QUEUE_URL = 'https://sqs.example.invalid/jobs'; }
      assert.equal(create.mock.callCount(), 0);
    });

    await t.test('submission detail checks owner, sorts results and preserves hidden policy', async t => {
      let accepted = false;
      mockMethod(t, prisma.submission, 'findFirst', async query => {
        assert.deepEqual(query.where, { id: submissionId, userId });
        return { id: submissionId, totalTestcases: 2, results: [
          { id: 'b', testcaseId: 'b', status: accepted ? 'AC' : 'WA', output: 'hidden-output', errorLog: 'hidden-error',
            testcase: { orderIndex: 2, isHidden: true, inputData: 'hidden-input' } },
          { id: 'a', testcaseId: 'a', status: 'AC', output: 'public-output', errorLog: '',
            testcase: { orderIndex: 1, isHidden: false, inputData: 'public-input' } },
        ] };
      });
      const incomplete = await request('GET', `/submissions/${submissionId}`);
      assert.equal(incomplete.data.data.passed, 1);
      assert.deepEqual(incomplete.data.data.results.map(item => item.testcaseId), ['a', 'b']);
      assert.equal(incomplete.data.data.results[1].input, null);
      assert.equal(incomplete.data.data.results[1].output, null);
      assert.equal(incomplete.data.data.results[1].errorLog, null);
      accepted = true;
      const complete = await request('GET', `/submissions/${submissionId}`);
      assert.equal(complete.data.data.results[1].input, 'hidden-input');
    });

    await t.test('history remains owner-scoped and returns existing pagination/counts', async t => {
      mockMethod(t, prisma.submission, 'count', async query => {
        assert.deepEqual(query.where, { userId }); return 11;
      });
      mockMethod(t, prisma.submission, 'findMany', async query => {
        assert.deepEqual(query.where, { userId }); assert.equal(query.skip, 10);
        return [{ id: submissionId, results: [{ status: 'AC' }, { status: 'WA' }, { status: 'PENDING' }] }];
      });
      mockMethod(t, prisma, '$transaction', async queries => Promise.all(queries));
      const response = await request('GET', '/submissions/history?page=2');
      assert.deepEqual(response.data.pagination, { page: 2, pageSize: 10, total: 11, totalPages: 2 });
      assert.deepEqual({ completed: response.data.data[0].completed, passed: response.data.data[0].passed,
        failed: response.data.data[0].failed }, { completed: 2, passed: 1, failed: 1 });
    });

    await t.test('Redis status preserves pending, stdout aliases and trial counts', async t => {
      let stored = null;
      mockMethod(t, prisma.playgroundRun, 'findUnique', async () => null);
      mockMethod(t, redisClient, 'get', async key => key.startsWith('run_owner:') ? userId : stored);
      const path = `/submissions/run-status/run-${userId}`;
      assert.equal((await request('GET', path)).data.status, 'PENDING');
      stored = JSON.stringify({ submissionId: `run-${userId}`, status: 'RUN_SUCCESS', output: '20\n', error: '', executionTime: 10 });
      const done = await request('GET', path);
      assert.equal(done.data.stdout, '20\n'); assert.equal(done.data.memoryUsed, null);
      stored = JSON.stringify({ total: 2, completed: 1, passed: 1, failed: 0, results: [] });
      assert.equal((await request('GET', path)).data.completed, 1);
    });

    await t.test('Playground history endpoints are persistent and owner-scoped', async t => {
      const runId = `play-${submissionId}`;
      mockMethod(t, prisma.playgroundRun, 'count', async query => { assert.deepEqual(query.where, { userId }); return 1; });
      mockMethod(t, prisma.playgroundRun, 'findMany', async query => {
        assert.equal(query.skip, 0);
        return [{ id: submissionId, problemTitle: null, language: 'python', status: 'RUN_SUCCESS', createdAt: new Date(), completedAt: new Date(), executionTime: 5, memoryUsed: 10 }];
      });
      const list = await request('GET', '/submissions/playground-history');
      assert.equal(list.status, 200);
      assert.equal(list.data.data[0].id, runId);
      assert.equal(list.data.pagination.total, 1);

      mockMethod(t, prisma.playgroundRun, 'findFirst', async query => {
        assert.deepEqual(query.where, { id: submissionId, userId });
        return { id: submissionId, problemTitle: null, language: 'python', sourceCode: 'print(1)', customInput: '', status: 'RUN_SUCCESS', output: '1\\n', error: '', executionTime: 5, memoryUsed: 10, cpuTime: 2, compileTime: null, createdAt: new Date(), completedAt: new Date() };
      });
      const detail = await request('GET', `/submissions/playground-history/${runId}`);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.data.sourceCode, 'print(1)');
    });

    await t.test('not-found, conflicts, invalid login and infrastructure failures use shared errors', async t => {
      mockMethod(t, prisma.roadmap, 'findFirst', async () => null);
      assert.equal((await request('GET', `/roadmaps/${problemId}`)).status, 404);
      mockMethod(t, prisma.category, 'findUnique', async () => ({ id: problemId }));
      assert.equal((await request('POST', '/admin/categories', { name: 'Existing' }, admin)).status, 409);
      mockMethod(t, prisma.category, 'update', async () => {
        throw new Prisma.PrismaClientKnownRequestError('internal-query-details', { code: 'P2025', clientVersion: 'test' });
      });
      assert.equal((await request('PUT', `/admin/categories/${problemId}`, { name: 'Name' }, admin)).status, 404);
      mockMethod(t, prisma.user, 'findUnique', async () => null);
      assert.equal((await request('POST', '/auth/login', { email: 'user@example.com', password: 'password' })).status, 401);
      mockMethod(t, prisma.category, 'findMany', async () => { throw new Error('secret-postgres-error'); });
      const failure = await request('GET', '/categories');
      assert.equal(failure.status, 500);
      assert.equal(failure.data.code, 'INTERNAL_ERROR');
      assert.ok(!JSON.stringify(failure.data).includes('secret-postgres'));
    });
  } finally {
    if (previousQueue === undefined) delete env.SQS_QUEUE_URL;
    else env.SQS_QUEUE_URL = previousQueue;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
