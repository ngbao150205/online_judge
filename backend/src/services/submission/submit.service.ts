import { randomUUID } from 'node:crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
import { requireJudgeQueue } from '../judge-queue.service.js';
import { env } from '../../config/env.js';
import type { ExecutionInput } from '../../types/execution.js';

export async function submitCodeService(userId: string, input: ExecutionInput) {
  requireJudgeQueue();
  return prisma.$transaction(async tx => {
    // Serialize with testcase version changes so results and outbox share one snapshot.
    await tx.$queryRaw`SELECT id FROM problems WHERE id = ${input.problemId}::uuid FOR SHARE`;
    const problem = await tx.problem.findUnique({ where: { id: input.problemId }, include: {
      testcases: { where: { deletedAt: null }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] },
    } });
    if (!problem || !problem.isActive || problem.deletedAt) throw new AppError(404, 'Bài tập không tồn tại hoặc đã đóng', 'PROBLEM_NOT_FOUND');
    if (!problem.testcases.length) throw new AppError(400, 'Bài tập chưa có testcase để chấm', 'NO_TESTCASES');
    const submissionId = randomUUID();
    const timeoutMs = Math.max(env.SUBMISSION_TIMEOUT_SECONDS * 1000,
      problem.testcases.length * (problem.timeLimit + 15000) + 300000);
    const data = await tx.submission.create({ data: {
      id: submissionId, userId, problemId: problem.id, language: input.language, sourceCode: input.sourceCode,
      status: 'PENDING', totalTestcases: problem.testcases.length, testcaseVersion: problem.testcaseVersion,
      deadlineAt: new Date(Date.now() + timeoutMs),
      results: { create: problem.testcases.map(testcase => ({ testcaseId: testcase.id, expectedOutput: testcase.expectedOutput })) },
    } });
    await tx.outboxJob.createMany({ data: problem.testcases.map(testcase => ({
      id: randomUUID(), submissionId, payload: {
        submissionId, problemId: problem.id, testcaseId: testcase.id, submissionType: 'PROBLEM_SUBMIT',
        checkerType: problem.checkerType, language: input.language, code: input.sourceCode,
        input: testcase.inputData, expectedOutput: testcase.expectedOutput,
        timeLimit: problem.timeLimit, memoryLimit: problem.memoryLimit, isCustomInput: false,
      },
    })) });
    return { submissionId, total: problem.testcases.length, data };
  });
}
