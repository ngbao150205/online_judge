import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { redisClient } from '../dist/src/config/redis.js';
import { initializeRun, runOwnerKey, runResultKey, markRunFailed } from '../dist/src/services/execution/run-store.service.js';
import { applyRunResult } from '../dist/src/services/execution/result.service.js';
import { getRunStatusService } from '../dist/src/services/execution/status.service.js';

const enabled = process.env.RUN_REDIS_INTEGRATION === 'true';
if (!enabled) redisClient.disconnect();
test('real Redis: atomic concurrent results, duplicate delivery, owner and expiry', { skip: !enabled }, async () => {
  const runId = `run-${randomUUID()}`;
  const owner = randomUUID();
  const failedRunId = `run-${randomUUID()}`;
  const keys = [runOwnerKey(runId), runResultKey(runId), runOwnerKey(failedRunId), runResultKey(failedRunId)];
  try {
    const a = { submissionId: runId, testcaseId: randomUUID(), status: 'AC' };
    const b = { submissionId: runId, testcaseId: randomUUID(), status: 'WA' };
    await initializeRun(owner, runId, { submissionId: runId, status: 'RUNNING', total: 2,
      completed: 0, passed: 0, failed: 0, results: [], expectedTestcaseIds: [a.testcaseId, b.testcaseId] });
    await Promise.all([applyRunResult(a), applyRunResult(b), applyRunResult(a)]);
    await applyRunResult({ submissionId: runId, testcaseId: randomUUID(), status: 'AC' });
    const result = await getRunStatusService(owner, runId);
    assert.equal(result.completed, 2);
    assert.equal(result.passed, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.results.length, 2);
    assert.ok(await redisClient.ttl(runResultKey(runId)) > 0);
    await assert.rejects(getRunStatusService(randomUUID(), runId), error => error.code === 'RUN_NOT_FOUND');
    await initializeRun(owner, failedRunId, { submissionId: failedRunId, status: 'PENDING' });
    await markRunFailed(failedRunId);
    await applyRunResult({ submissionId: failedRunId, status: 'RUN_SUCCESS', output: 'late-output' });
    assert.equal((await getRunStatusService(owner, failedRunId)).status, 'SYSTEM_ERROR');
    await redisClient.expire(runOwnerKey(runId), 1);
    await delay(1200);
    assert.equal(await applyRunResult(a), 'ack');
    await assert.rejects(getRunStatusService(owner, runId), error => error.code === 'RUN_NOT_FOUND');
  } finally {
    await redisClient.del(...keys); // Only unique keys created by this test.
    redisClient.disconnect();
  }
});
