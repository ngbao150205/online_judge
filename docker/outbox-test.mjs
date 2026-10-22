import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prisma from './dist/src/config/db.js';
import { sqsClient } from './dist/src/config/sqs.js';
import { submitCodeService } from './dist/src/services/submission/submit.service.js';
import { dispatchOutboxBatch, reconcileSubmissions } from './dist/src/services/outbox.service.js';
import { closeInfrastructure } from './dist/src/config/shutdown.js';

if (process.env.JUDGE_INTEGRATION_TEST !== 'true') throw new Error('Temporary test stack required');
const originalSend = sqsClient.send;
try {
  const user = await prisma.user.create({ data: { name: 'Outbox fixture', email: `${randomUUID()}@example.invalid`, pwd: '' } });
  const problem = await prisma.problem.create({ data: { title: 'Outbox fixture', slug: randomUUID(), description: 'Fixture', testcases: { create: [{ inputData: '', expectedOutput: '20' }, { inputData: '', expectedOutput: '20' }] } } });
  const submitted = await submitCodeService(user.id, { problemId: problem.id, language: 'python', sourceCode: 'print(20)' });
  assert.equal(await prisma.outboxJob.count({ where: { submissionId: submitted.submissionId } }), 2);
  sqsClient.send = async () => { throw new Error('simulated-transport-down'); };
  await dispatchOutboxBatch();
  const pending = await prisma.outboxJob.findMany({ where: { submissionId: submitted.submissionId } });
  assert.ok(pending.every(job => !job.sentAt && job.attempts === 1 && !job.leaseToken));
  assert.equal((await prisma.submission.findUnique({ where: { id: submitted.submissionId } })).status, 'PENDING');
  await prisma.outboxJob.updateMany({ where: { submissionId: submitted.submissionId }, data: { availableAt: new Date(0) } });
  const deliveries = [];
  sqsClient.send = async command => { deliveries.push(JSON.parse(command.input.MessageBody).testcaseId); return {}; };
  await Promise.all([dispatchOutboxBatch(), dispatchOutboxBatch()]);
  assert.equal(new Set(deliveries).size, 2); assert.equal(deliveries.length, 2);
  console.info('PASS: durable outbox survives SQS failure, retries, concurrent dispatchers claim each job once');

  const originalTransaction = prisma.$transaction.bind(prisma);
  const before = await prisma.submission.count();
  prisma.$transaction = callback => originalTransaction(async tx => {
    const originalCreate = tx.outboxJob.createMany;
    tx.outboxJob.createMany = async () => { throw new Error('simulated-outbox-storage-failure'); };
    try { return await callback(tx); } finally { tx.outboxJob.createMany = originalCreate; }
  });
  try { await assert.rejects(submitCodeService(user.id, { problemId: problem.id, language: 'python', sourceCode: 'print(20)' })); }
  finally { prisma.$transaction = originalTransaction; }
  assert.equal(await prisma.submission.count(), before);
  console.info('PASS: submission and outbox rollback together on storage failure');

  await prisma.submission.update({ where: { id: submitted.submissionId }, data: { deadlineAt: new Date(0) } });
  assert.equal(await reconcileSubmissions(), 1);
  assert.equal((await prisma.submission.findUnique({ where: { id: submitted.submissionId } })).status, 'SYSTEM_ERROR');
  assert.equal(await reconcileSubmissions(), 0);
  assert.equal(await prisma.submissionResult.count({ where: { submissionId: submitted.submissionId, status: 'PENDING' } }), 0);
  console.info('PASS: deadline reconciliation finalizes stuck submissions exactly once');
} finally { sqsClient.send = originalSend; await closeInfrastructure(); }
