import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import prisma from '../dist/src/config/db.js';
import { redisClient } from '../dist/src/config/redis.js';
import { sqsClient } from '../dist/src/config/sqs.js';
import { env, readEnvironment } from '../dist/src/config/env.js';
import { updateProblemService } from '../dist/src/services/problem.admin.service.js';
import { applySubmissionResult } from '../dist/src/services/submission/result.service.js';
import { processResultMessage } from '../dist/src/services/result.service.js';
import { getStudentRoadmapDetailService } from '../dist/src/services/roadmap.student.service.js';
import { forgotPasswordService, resetPasswordService, hashResetCode } from '../dist/src/services/auth/password.service.js';
import { registerService } from '../dist/src/services/auth/account.service.js';
import { deleteStudentAdminService } from '../dist/src/services/user.admin.service.js';
import { getRunStatusService } from '../dist/src/services/execution/status.service.js';
import { applyPlaygroundResult, applyRunResult } from '../dist/src/services/execution/result.service.js';
import { reconcileExpiredPlaygroundRuns } from '../dist/src/services/execution/history.service.js';
import { runResultWorker } from '../dist/src/workers/result.worker.js';
import { aggregateOfficialStatus, mapToTestcaseStatus } from '../dist/src/utils/submission-status.js';

redisClient.disconnect();
await prisma.$disconnect();
const userId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';
const testcaseId = '33333333-3333-4333-8333-333333333333';
function stub(t, object, key, implementation) {
  const original = object[key]; object[key] = t.mock.fn(implementation);
  t.after(() => { object[key] = original; }); return object[key];
}

test('problem edits preserve identical testcase IDs and retire older versions without deleting history', async t => {
  const old = { inputData: '1', expectedOutput: '1', isHidden: true, orderIndex: 1 };
  const updates = [];
  stub(t, prisma, '$transaction', async callback => callback({
    outboxJob: { updateMany: async () => ({ count: 0 }) },
    $queryRaw: async () => [],
    problem: { findUnique: async () => ({ title: 'Problem', testcaseVersion: 1, testcases: [{ ...old, id: testcaseId }] }),
      update: async query => { updates.push(query); return query.data; } },
  }));
  await updateProblemService(submissionId, { title: 'Problem', testcases: [old] });
  assert.equal(updates[0].data.testcases, undefined);
  assert.equal(updates[0].data.slug, undefined);
  await updateProblemService(submissionId, { testcases: [{ ...old, expectedOutput: '2' }] });
  assert.equal(updates[1].data.testcases.deleteMany, undefined);
  assert.equal(updates[1].data.testcases.create[0].version, 2);
  assert.ok(updates[1].data.testcases.updateMany.data.deletedAt instanceof Date);
  assert.deepEqual(updates[1].data.testcaseVersion, { increment: 1 });
});

test('result aggregation is deterministic, owner-scoped and idempotent', async t => {
  const submission = { id: submissionId, userId, problemId: userId, status: 'IN_PROGRESS', totalTestcases: 2 };
  const rows = [
    { id: 'row1', testcaseId, status: 'PENDING', executionTime: 0, errorLog: null },
    { id: 'row2', testcaseId: userId, status: 'PENDING', executionTime: 0, errorLog: null },
  ];
  const attempts = [];
  const tx = {
    outboxJob: { updateMany: async () => ({ count: 0 }) },
    $queryRaw: async strings => { assert.ok(strings.join('').includes('FOR UPDATE')); return []; },
    submission: { findUnique: async () => submission, update: async query => Object.assign(submission, query.data) },
    submissionResult: {
      findFirst: async query => rows.find(row => row.testcaseId === query.where.testcaseId),
      update: async query => Object.assign(rows.find(row => row.id === query.where.id), query.data),
      findMany: async () => rows,
    },
    roadmapProblem: { findMany: async () => [{ roadmapId: userId }] },
    roadmapProgress: { upsert: async query => { attempts.push(query); } },
  };
  stub(t, prisma, '$transaction', async callback => callback(tx));
  await applySubmissionResult({ submissionId, testcaseId, status: 'AC', executionTime: 10.9 });
  assert.equal(submission.status, 'IN_PROGRESS');
  assert.equal(rows[0].executionTime, 10);
  await applySubmissionResult({ submissionId, testcaseId, status: 'WA', executionTime: 100 });
  assert.equal(rows[0].status, 'AC');
  await applySubmissionResult({ submissionId, testcaseId: userId, status: 'WA', executionTime: 20 });
  assert.equal(submission.status, 'WRONG_ANSWER');
  assert.equal(submission.totalTime, 30);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].create.isSolved, false);
  assert.equal(attempts[0].update.isSolved, undefined); // A failed attempt never clears an earlier solve.
  assert.equal(attempts[0].where.userId_roadmapId_problemId.userId, userId);
  await applySubmissionResult({ submissionId, testcaseId: userId, status: 'AC' });
  assert.equal(attempts.length, 1);
  assert.equal(submission.status, 'WRONG_ANSWER');
  assert.equal(aggregateOfficialStatus(['WA', 'TLE']), aggregateOfficialStatus(['TLE', 'WA']));
  assert.equal(mapToTestcaseStatus('RUN_SUCCESS'), 'SYSTEM_ERROR');
  assert.equal(mapToTestcaseStatus('toString'), 'SYSTEM_ERROR');
});

test('accepted final result updates solved progress exactly once', async t => {
  const submission = { id: submissionId, userId, problemId: userId, status: 'PENDING', totalTestcases: 1 };
  const row = { id: 'row', status: 'PENDING', executionTime: 0, errorLog: null };
  let progress;
  stub(t, prisma, '$transaction', async callback => callback({
    outboxJob: { updateMany: async () => ({ count: 0 }) },
    $queryRaw: async () => [],
    submission: { findUnique: async () => submission, update: async query => Object.assign(submission, query.data) },
    submissionResult: { findFirst: async () => row, update: async query => Object.assign(row, query.data), findMany: async () => [row] },
    roadmapProblem: { findMany: async () => [{ roadmapId: userId }] },
    roadmapProgress: { upsert: async query => { progress = query; } },
  }));
  await applySubmissionResult({ submissionId, testcaseId, status: 'AC' });
  assert.equal(submission.status, 'ACCEPTED');
  assert.equal(progress.update.isSolved, true);
  assert.equal(progress.update.lastSubmissionId, submissionId);
  assert.deepEqual(progress.update.attemptCount, { increment: 1 });
});

test('run access rejects another owner and expired metadata', async t => {
  let owner = 'other-user';
  stub(t, prisma.playgroundRun, 'findUnique', async () => null);
  stub(t, redisClient, 'get', async key => key.startsWith('run_owner:') ? owner : JSON.stringify({ status: 'RUN_SUCCESS', output: '20' }));
  await assert.rejects(getRunStatusService(userId, `run-${userId}`), error => error.code === 'RUN_NOT_FOUND');
  owner = null;
  await assert.rejects(getRunStatusService(userId, `run-${userId}`), error => error.code === 'RUN_NOT_FOUND');
  owner = userId;
  assert.equal((await getRunStatusService(userId, `run-${userId}`)).output, '20');
});

test('Playground results update their durable database row and status is owner-scoped', async t => {
  const runId = `play-${submissionId}`;
  const run = { id: submissionId, userId, status: 'PENDING', output: null, error: null };
  stub(t, prisma.playgroundRun, 'findUnique', async query => query.where.id === submissionId ? run : null);
  stub(t, prisma.playgroundRun, 'updateMany', async query => {
    assert.deepEqual(query.where, { id: submissionId, status: { in: ['PENDING', 'RUNNING'] } });
    Object.assign(run, query.data);
    return { count: 1 };
  });
  stub(t, redisClient, 'eval', async () => { throw new Error('Playground result must not use Redis'); });

  assert.equal(await applyPlaygroundResult({ submissionId: runId, status: 'RUN_SUCCESS', output: '20\\n', executionTime: 12 }), 'ack');
  assert.equal(run.status, 'RUN_SUCCESS');
  assert.equal(run.output, '20\\n');
  assert.ok(run.completedAt instanceof Date);
  assert.equal((await getRunStatusService(userId, runId)).stdout, '20\\n');
  await assert.rejects(getRunStatusService('other-user', runId), error => error.code === 'RUN_NOT_FOUND');
});

test('expired pending Playground rows are finalized by maintenance', async t => {
  const now = new Date('2026-10-23T00:00:00.000Z');
  stub(t, prisma.playgroundRun, 'updateMany', async query => {
    assert.deepEqual(query.where, { status: { in: ['PENDING', 'RUNNING'] }, deadlineAt: { lt: now } });
    assert.equal(query.data.status, 'SYSTEM_ERROR');
    assert.equal(query.data.completedAt, now);
    return { count: 1 };
  });
  assert.equal((await reconcileExpiredPlaygroundRuns(now)).count, 1);
});

test('roadmap unlock requires all preceding problems to be solved', async t => {
  stub(t, prisma.roadmap, 'findFirst', async () => ({
    id: userId, title: 'Roadmap', description: '',
    problems: ['a', 'b', 'c'].map((id, orderIndex) => ({ problemId: id, orderIndex, problem: { id, title: id, slug: id, difficulty: 'EASY' } })),
    progress: [{ problemId: 'b', isSolved: true, solvedAt: new Date() }],
  }));
  const result = await getStudentRoadmapDetailService(userId, userId);
  assert.deepEqual(result.problems.map(problem => problem.isUnlocked), [true, false, false]);
});

test('password reset binds email and consumes the OTP at most once', async t => {
  stub(t, prisma.user, 'findFirst', async query => {
    assert.equal(query.where.email, 'user@example.com'); return { id: userId };
  });
  let consumed = false;
  stub(t, prisma.user, 'updateMany', async query => {
    assert.equal(query.where.resetPasswordToken, hashResetCode('user@example.com', '123456'));
    if (consumed) return { count: 0 };
    consumed = true; return { count: 1 };
  });
  const input = { email: 'USER@example.com', otp: '123456', newPassword: 'password123' };
  const results = await Promise.allSettled([resetPasswordService(input), resetPasswordService(input)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  await assert.rejects(resetPasswordService({ otp: '123456', newPassword: 'password123' }), error => error.code === 'INVALID_INPUT');
});

test('registration requires terms consent and stores the active terms version', async t => {
  const previousVersion = env.TERMS_VERSION;
  env.TERMS_VERSION = 'terms-2026-10';
  t.after(() => { env.TERMS_VERSION = previousVersion; });
  stub(t, prisma.user, 'findUnique', async () => null);
  let createInput;
  stub(t, prisma.user, 'create', async query => { createInput = query; return query.data; });
  await assert.rejects(registerService({ name: 'Test', email: 'test@example.com', password: 'password123' }), error => error.code === 'TERMS_REQUIRED');
  const user = await registerService({ name: ' Test ', email: 'TEST@example.com', password: 'password123', acceptedTerms: true });
  assert.equal(createInput.data.termsVersion, 'terms-2026-10');
  assert.ok(createInput.data.termsAcceptedAt instanceof Date);
  assert.equal(createInput.data.email, 'test@example.com');
  assert.equal(user.role, 'STUDENT');
});

test('forgot-password response is the same for missing accounts and unavailable SMTP', async t => {
  const previous = { user: env.SMTP_USER, pass: env.SMTP_PASS };
  env.SMTP_USER = undefined;
  env.SMTP_PASS = undefined;
  t.after(() => { env.SMTP_USER = previous.user; env.SMTP_PASS = previous.pass; });
  stub(t, prisma.user, 'findUnique', async query => query.where.email === 'active@example.com'
    ? { id: userId, email: 'active@example.com', deletedAt: null }
    : null);
  const missing = await forgotPasswordService('missing@example.com');
  const active = await forgotPasswordService('active@example.com');
  assert.equal(active, missing);
  assert.match(active, /dịch vụ email sẵn sàng/);
});

test('soft-deleting a user keeps their ID for history and releases their email address', async t => {
  stub(t, prisma.user, 'findUnique', async () => ({ id: userId, deletedAt: null }));
  let update;
  stub(t, prisma.user, 'update', async query => { update = query; return query.data; });
  await deleteStudentAdminService(userId);
  assert.equal(update.data.email, `deleted+${userId}@deleted.invalid`);
  assert.ok(update.data.deletedAt instanceof Date);
  assert.deepEqual(update.data.tokenVersion, { increment: 1 });
  assert.equal(update.data.resetPasswordToken, null);
});

test('worker retries malformed messages for DLQ and retries failed storage', async t => {
  assert.equal(await processResultMessage({ Body: 'invalid-json' }), 'retry');
  assert.equal(await processResultMessage({ Body: JSON.stringify({ submissionId: 'invalid' }) }), 'retry');
  const previous = env.RESULT_QUEUE_URL;
  env.RESULT_QUEUE_URL = 'https://sqs.example.invalid/results';
  t.after(() => { env.RESULT_QUEUE_URL = previous; });
  const abort = new AbortController();
  const deleted = [];
  stub(t, prisma, '$transaction', async () => { abort.abort(); throw new Error('storage-down'); });
  stub(t, sqsClient, 'send', async command => {
    if (command.constructor.name === 'ReceiveMessageCommand') return { Messages: [
      { Body: 'invalid-json', ReceiptHandle: 'bad' },
      { Body: JSON.stringify({ submissionId, testcaseId, status: 'AC' }), ReceiptHandle: 'good' },
    ] };
    deleted.push(command.input.ReceiptHandle); return {};
  });
  await runResultWorker(abort.signal);
  assert.deepEqual(deleted, []);
});

test('environment validation reports field names without echoing secret values', () => {
  const defaults = readEnvironment({ DATABASE_URL: 'postgresql://user:password@localhost/db', JWT_SECRET: 'test-secret' });
  assert.equal(defaults.PORT, 5001);
  assert.equal(defaults.RUN_TTL_SECONDS, 3600);
  assert.throws(() => readEnvironment({ DATABASE_URL: 'private-invalid-url', JWT_SECRET: '' }), error =>
    error.message.includes('DATABASE_URL') && !error.message.includes('private-invalid-url'));
});
