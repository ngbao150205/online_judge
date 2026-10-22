import { randomUUID } from 'node:crypto';
import type { OutboxJob, Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { sendJudgeJob } from './judge-queue.service.js';
import type { JudgeJob } from '../types/execution.js';
import { recordFinalizedAttempt } from './submission/progress.service.js';
import { env } from '../config/env.js';

export async function finalizeSystemError(tx: Prisma.TransactionClient, submissionId: string, message: string) {
  await tx.$queryRaw`SELECT id FROM submissions WHERE id = ${submissionId}::uuid FOR UPDATE`;
  const submission = await tx.submission.findUnique({ where: { id: submissionId } });
  if (!submission || !['PENDING', 'IN_PROGRESS'].includes(submission.status)) return;
  await tx.submissionResult.updateMany({ where: { submissionId, status: 'PENDING' }, data: { status: 'SYSTEM_ERROR', errorLog: message } });
  await tx.submission.update({ where: { id: submissionId }, data: { status: 'SYSTEM_ERROR', compileLog: message } });
  await tx.outboxJob.updateMany({ where: { submissionId, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), leaseUntil: null, leaseToken: null } });
  await recordFinalizedAttempt(tx, submission, false);
}

export async function dispatchOutboxBatch(signal?: AbortSignal) {
  const leaseToken = randomUUID();
  const jobs = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<OutboxJob[]>`
      SELECT j.* FROM outbox_jobs j JOIN submissions s ON s.id = j."submissionId"
      WHERE j."sentAt" IS NULL AND j."cancelledAt" IS NULL AND j."availableAt" <= NOW()
      AND (j."leaseUntil" IS NULL OR j."leaseUntil" < NOW())
      AND s.status IN ('PENDING', 'IN_PROGRESS') AND (s."deadlineAt" IS NULL OR s."deadlineAt" > NOW())
      ORDER BY j."availableAt", j.id LIMIT 10 FOR UPDATE OF j SKIP LOCKED`;
    if (rows.length) await tx.outboxJob.updateMany({ where: { id: { in: rows.map(job => job.id) } },
      data: { leaseToken, leaseUntil: new Date(Date.now() + 120000), attempts: { increment: 1 } } });
    return rows;
  });
  for (const job of jobs) {
    if (signal?.aborted) break;
    try {
      const stillLeased = await prisma.outboxJob.findFirst({ where: { id: job.id, leaseToken, sentAt: null, cancelledAt: null, leaseUntil: { gt: new Date() } } });
      if (!stillLeased) continue;
      await sendJudgeJob(job.payload as unknown as JudgeJob, signal);
      await prisma.outboxJob.updateMany({ where: { id: job.id, leaseToken, cancelledAt: null },
        data: { sentAt: new Date(), leaseToken: null, leaseUntil: null, lastError: null } });
      await prisma.submission.updateMany({ where: { id: job.submissionId, status: 'PENDING' }, data: { status: 'IN_PROGRESS' } });
    } catch {
      await prisma.outboxJob.updateMany({ where: { id: job.id, leaseToken, cancelledAt: null }, data: {
        leaseToken: null, leaseUntil: null, lastError: 'SQS_DISPATCH_FAILED',
        availableAt: new Date(Date.now() + Math.min(60, 2 ** Math.min(job.attempts + 1, 6)) * 1000),
      } });
      if (job.attempts + 1 >= 10) await prisma.$transaction(tx => finalizeSystemError(tx, job.submissionId, 'Không thể gửi bài sau 10 lần thử.'));
    }
  }
  if (signal?.aborted) await prisma.outboxJob.updateMany({ where: { leaseToken, sentAt: null, cancelledAt: null }, data: { leaseToken: null, leaseUntil: null } });
  return jobs.length;
}

export async function reconcileSubmissions() {
  return prisma.$transaction(async tx => {
    const expired = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM submissions WHERE status IN ('PENDING', 'IN_PROGRESS') AND
      ("deadlineAt" < NOW() OR ("deadlineAt" IS NULL AND "createdAt" < ${new Date(Date.now() - env.SUBMISSION_TIMEOUT_SECONDS * 1000)}))
      ORDER BY "createdAt" LIMIT 100 FOR UPDATE SKIP LOCKED`;
    for (const item of expired) await finalizeSystemError(tx, item.id, 'Hết thời hạn xử lý bài nộp do worker/hàng đợi không trả đủ kết quả.');
    return expired.length;
  }, { timeout: 15000 });
}

export async function cleanupExpiredSessions() {
  await prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
