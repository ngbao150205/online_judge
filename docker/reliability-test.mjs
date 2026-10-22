import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prisma from './dist/src/config/db.js';
import { issueSession } from './dist/src/services/auth/session.service.js';
import { hashResetCode } from './dist/src/services/auth/password.service.js';
import { createProblemService, updateProblemService, deleteProblemService } from './dist/src/services/problem.admin.service.js';
import { getWorkerSnapshots, recordHeartbeat } from './dist/src/services/worker-monitor.service.js';
import { getQueueDepths } from './dist/src/services/queue-admin.service.js';
import { closeInfrastructure } from './dist/src/config/shutdown.js';

if (process.env.JUDGE_INTEGRATION_TEST !== 'true') throw new Error('Temporary test stack required');
const base = 'http://frontend/api';
async function request(path, { token, body, method = body ? 'POST' : 'GET', status = 200, extraHeaders = {} } = {}) {
  const response = await fetch(base + path, { method, headers: { ...extraHeaders, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
  return { data, response };
}
try {
  const email = `${randomUUID()}@example.invalid`, password = 'individual-password-123';
  const registered = await request('/auth/register', { body: { name: 'Security fixture', email, password }, status: 201 });
  const userId = registered.data.data.user.id;
  let token = registered.data.data.token;
  await request('/admin/stats', { token, status: 403 });
  await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
  await request('/admin/stats', { token });
  await prisma.user.update({ where: { id: userId }, data: { role: 'STUDENT' } });
  await request('/admin/stats', { token, status: 403 });
  await request('/auth/logout', { token, method: 'POST' });
  await request('/auth/me', { token, status: 401 });
  const login = await request('/auth/login', { body: { email, password } });
  token = login.data.data.token;
  const second = await issueSession(await prisma.user.findUnique({ where: { id: userId } }));
  await request('/auth/logout-all', { token, method: 'POST' });
  await request('/auth/me', { token, status: 401 });
  await request('/auth/me', { token: second, status: 401 });
  token = (await request('/auth/login', { body: { email, password } })).data.data.token;
  console.info('PASS: live role changes, single-session logout and logout-all invalidate access');

  const allowed = await request('/categories', { extraHeaders: { Origin: 'http://localhost:8080' } });
  assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  const forbidden = await request('/categories', { extraHeaders: { Origin: 'https://untrusted.example' } });
  assert.equal(forbidden.response.headers.get('access-control-allow-origin'), null);
  console.info('PASS: CORS only grants configured browser origins');

  const category = await prisma.category.create({ data: { name: randomUUID() } });
  const problem = await createProblemService({ title: 'Distinct solve fixture', description: 'sum', categoryIds: [category.id], testcases: [{ inputData: '7 13', expectedOutput: '20', isHidden: false }] });
  const input = { problemId: problem.id, language: 'python', sourceCode: 'a,b=map(int,input().split()); print(a+b)' };
  async function submit(expected) {
    const submitted = await request('/submissions', { token, body: input, status: 201 });
    const id = submitted.data.submissionId;
    const deadline = Date.now() + 60000; let result;
    do {
      result = (await request(`/submissions/${id}`, { token })).data.data;
      if (!['PENDING', 'IN_PROGRESS'].includes(result.status)) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (Date.now() < deadline);
    assert.equal(result.status, expected, JSON.stringify(result));
    return result;
  }
  const first = await submit('ACCEPTED');
  await submit('ACCEPTED');
  assert.ok(first.maxMemory > 0); assert.equal(typeof first.results[0].cpuTime, 'number'); assert.ok(first.results[0].cpuTime >= 0);
  const ranking = (await request('/leaderboard')).data.data.find(row => row.id === userId);
  assert.equal(ranking.solvedProblems, 1); assert.equal(ranking.acceptedSubmissions, 2);
  console.info('PASS: official SQS judging stores peak KiB/CPU; leaderboard counts distinct solved problems');

  await updateProblemService(problem.id, { testcases: [{ inputData: '7 13', expectedOutput: '300', isHidden: false }] });
  const old = (await request(`/submissions/${first.id}`, { token })).data.data;
  assert.equal(old.testcaseVersion, 1); assert.equal(old.results[0].output.trim(), '20');
  assert.equal((await prisma.testcase.findUnique({ where: { id: first.results[0].testcaseId } })).expectedOutput, '20');
  const updated = await submit('WRONG_ANSWER'); assert.equal(updated.testcaseVersion, 2);
  assert.notEqual(updated.results[0].testcaseId, first.results[0].testcaseId);
  await assert.rejects(prisma.problem.delete({ where: { id: problem.id } }), error => error.code === 'P2003');
  await deleteProblemService(problem.id);
  await request(`/problems/${problem.slug}`, { status: 404 });
  assert.equal((await request(`/submissions/${first.id}`, { token })).data.data.status, 'ACCEPTED');
  console.info('PASS: testcase versions and soft deletion preserve immutable submission history; physical cascade is blocked');

  const workers = await getWorkerSnapshots(); assert.ok(workers.some(worker => worker.status !== 'OFFLINE'));
  await recordHeartbeat({ type: 'WORKER_HEARTBEAT', workerId: 'stale-fixture', state: 'IDLE', observedAt: new Date(Date.now() - 60000).toISOString(), cpuUsage: null, memoryBytes: null, memoryLimitBytes: null });
  assert.equal((await getWorkerSnapshots()).find(worker => worker.id === 'stale-fixture').status, 'OFFLINE');
  const queues = await getQueueDepths(); assert.ok(queues.every(queue => queue.available && queue.deadLetters !== null));
  console.info('PASS: real worker heartbeat, stale-worker detection and queue/DLQ monitoring');

  const otp = '938271';
  await prisma.user.update({ where: { id: userId }, data: { resetPasswordToken: hashResetCode(email, otp), resetPasswordExpires: new Date(Date.now() + 600000) } });
  assert.notEqual((await prisma.user.findUnique({ where: { id: userId } })).resetPasswordToken, otp);
  const reset = await fetch(base + '/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword: 'replacement-password' }) });
  assert.equal(reset.status, 200);
  await request('/auth/reset-password', { body: { email, otp, newPassword: 'replacement-password' }, status: 400 });
  await request('/auth/me', { token, status: 401 });
  console.info('PASS: HMAC OTP is single-use, bound to email and revokes previous sessions');

  const limitedEmail = `${randomUUID()}@example.invalid`;
  for (let index = 0; index < 10; index++) await request('/auth/login', { body: { email: limitedEmail, password: 'invalid-password' }, status: 401 });
  const limited = await request('/auth/login', { body: { email: limitedEmail, password: 'invalid-password' }, status: 429 });
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
  console.info('PASS: Redis rate limiting enforces failed-login budget and Retry-After');
} finally { await closeInfrastructure(); }
