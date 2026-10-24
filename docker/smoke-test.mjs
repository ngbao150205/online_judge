// Run from root: docker compose exec -T backend node --input-type=module < docker/smoke-test.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { issueSession } from './dist/src/services/auth/session.service.js';
import prisma from './dist/src/config/db.js';
import { redisClient } from './dist/src/config/redis.js';
import { runOwnerKey, runResultKey } from './dist/src/services/execution/run-store.service.js';
import { closeInfrastructure } from './dist/src/config/shutdown.js';

if (process.env.JUDGE_INTEGRATION_TEST !== 'true') throw new Error('Chỉ chạy trên stack kiểm thử tạm bằng docker/test.sh');
const user = await prisma.user.create({ data: { name: 'Sandbox smoke test', email: `${randomUUID()}@example.invalid`, pwd: '' } });
const token = await issueSession(user);
const runs = [];
const trialRuns = [];
const headers = { 'Content-Type': 'application/json', Cookie: `judge_session=${encodeURIComponent(token)}` };
const base = 'http://frontend/api';
async function jsonRequest(path, options) {
  const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response.json();
}
try {
  const health = await fetch('http://127.0.0.1:5001/health');
  assert.equal(health.status, 200);
  assert.equal((await fetch('http://frontend/workspace/sandbox')).status, 200);
  await jsonRequest('/problems', { headers });
  console.info('PASS: PostgreSQL + Redis health, SPA fallback, Nginx API proxy');
  const cases = [
    { name: 'Python sum', language: 'python', sourceCode: 'a, b = map(int, input().split())\nprint(a + b)', customInput: '7 13\n', status: 'RUN_SUCCESS', output: '20' },
    { name: 'C++ sum', language: 'cpp', sourceCode: '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}', customInput: '7 13\n', status: 'RUN_SUCCESS', output: '20' },
    { name: 'Python timeout', language: 'python', sourceCode: 'while True: pass', customInput: '', status: 'TLE' },
    { name: 'Python memory limit', language: 'python', sourceCode: 'data = bytearray(512 * 1024 * 1024)\nprint(len(data))', customInput: '', status: 'MLE' },
    { name: 'C++ compile error', language: 'cpp', sourceCode: 'int main() { syntax error; }', customInput: '', status: 'CE' },
  ];
  for (const entry of cases) {
    const data = await jsonRequest('/submissions/run', { method: 'POST', headers, body: JSON.stringify({
      language: entry.language, sourceCode: entry.sourceCode, customInput: entry.customInput,
    }) });
    assert.ok(data.runId);
    runs.push(data.runId);
    const deadline = Date.now() + 60000;
    let result;
    while (Date.now() < deadline) {
      result = await jsonRequest(`/submissions/run-status/${data.runId}`, { headers });
      if (!['PENDING', 'RUNNING'].includes(result.status)) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(result?.status, entry.status, `${entry.name}: ${JSON.stringify(result)}`);
    if (entry.output) assert.equal(result.output.trim(), entry.output);
    if (entry.status !== 'CE') { assert.equal(typeof result.memoryUsed, 'number'); assert.ok(result.memoryUsed > 0); assert.equal(typeof result.cpuTime, 'number'); assert.ok(result.cpuTime >= 0); assert.equal(typeof result.executionTime, 'number'); assert.ok(result.executionTime >= 0); }
    if (entry.language === 'cpp') assert.ok(result.compileTime > 0);
    console.info(`PASS: ${entry.name} => ${result.status}${entry.output ? `, output=${result.output.trim()}` : ''}`);
  }

  const history = await jsonRequest('/submissions/playground-history?page=1', { headers });
  assert.deepEqual(new Set(history.data.map(run => run.id)), new Set(runs));
  const saved = await jsonRequest(`/submissions/playground-history/${runs[0]}`, { headers });
  assert.equal(saved.data.sourceCode, cases[0].sourceCode);
  assert.equal(saved.data.customInput, cases[0].customInput);
  assert.equal(saved.data.status, cases[0].status);
  console.info('PASS: Playground source, stdin, output and status persist in PostgreSQL history');

  const problem = await prisma.problem.create({ data: {
    title: 'Trial smoke test', slug: `trial-smoke-${randomUUID()}`,
    description: 'Temporary public testcase for the isolated integration stack.',
    testcases: { create: [{ inputData: '7 13\n', expectedOutput: '20\n', isHidden: false }] },
  }, include: { testcases: true } });
  const trial = await jsonRequest('/submissions/run-problem', { method: 'POST', headers, body: JSON.stringify({
    problemId: problem.id, language: 'python', sourceCode: cases[0].sourceCode,
  }) });
  trialRuns.push(trial.runId);
  const trialDeadline = Date.now() + 60000;
  let trialResult;
  while (Date.now() < trialDeadline) {
    trialResult = await jsonRequest(`/submissions/run-status/${trial.runId}`, { headers });
    if (!['PENDING', 'RUNNING'].includes(trialResult.status)) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(trialResult?.status, 'ACCEPTED');
  assert.ok(await redisClient.get(runOwnerKey(trial.runId)));
  assert.ok(await redisClient.get(runResultKey(trial.runId)));
  assert.equal(await prisma.playgroundRun.findUnique({ where: { id: trial.runId.slice(4) } }), null);
  console.info('PASS: PROBLEM_TRIAL remains in Redis and does not create Playground history');
} finally {
  try {
    if (trialRuns.length) await redisClient.del(...trialRuns.flatMap(id => [runOwnerKey(id), runResultKey(id)]));
  } finally { await closeInfrastructure(); }
}
