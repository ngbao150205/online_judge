import { randomUUID } from 'node:crypto';
import prisma from '../../config/db.js';
import { initializeRun, markRunFailed } from './run-store.service.js';
import { AppError } from '../../errors/app-error.js';
import { requireJudgeQueue, sendJudgeJob } from '../judge-queue.service.js';
import type { CustomRunInput, ExecutionInput } from '../../types/execution.js';
export async function runCustomInputService(userId: string, input: CustomRunInput) {
    requireJudgeQueue();
    let timeLimit = 2000;
    let memoryLimit = 256;
    if (input.problemId) {
        const problem = await prisma.problem.findUnique({
            where: { id: input.problemId }, select: { isActive: true, deletedAt: true, timeLimit: true, memoryLimit: true },
        });
        if (!problem || !problem.isActive || problem.deletedAt) {
            throw new AppError(404, 'Bài tập không tồn tại hoặc đã đóng', 'PROBLEM_NOT_FOUND');
        }
        ({ timeLimit, memoryLimit } = problem);
    }
    const runId = `run-${randomUUID()}`;
    await initializeRun(userId, runId, { submissionId: runId, status: 'PENDING' });
    try {
    await sendJudgeJob({
        submissionId: runId, problemId: input.problemId || null, testcaseId: '',
        submissionType: 'PLAYGROUND', checkerType: '', language: input.language, code: input.sourceCode,
        timeLimit, memoryLimit, input: input.customInput ?? '', expectedOutput: '', isCustomInput: true,
    });
    } catch {
        try { await markRunFailed(runId); } catch { console.error("[Run] Không thể ghi lỗi gửi job"); }
        throw new AppError(503, "Không thể gửi yêu cầu chạy thử", "RUN_DISPATCH_FAILED", { runId });
    }
    return { runId };
}
export async function runProblemService(userId: string, input: ExecutionInput) {
    const problem = await prisma.problem.findUnique({
        where: { id: input.problemId },
        select: {
            id: true, isActive: true, deletedAt: true, timeLimit: true, memoryLimit: true, checkerType: true,
            testcases: {
                where: { isHidden: false, deletedAt: null }, orderBy: { orderIndex: 'asc' },
                select: { id: true, inputData: true, expectedOutput: true },
            },
        },
    });
    if (!problem || problem.deletedAt)
        throw new AppError(404, 'Không tìm thấy bài tập', 'PROBLEM_NOT_FOUND');
    if (!problem.isActive)
        throw new AppError(400, 'Bài tập hiện không hoạt động', 'PROBLEM_INACTIVE');
    requireJudgeQueue();
    const runId = `run-${randomUUID()}`;
    const total = problem.testcases.length || 1;
    await initializeRun(userId, runId, {
        submissionId: runId, status: 'RUNNING', total, completed: 0, passed: 0, failed: 0, results: [],
        expectedTestcaseIds: problem.testcases.map(testcase => testcase.id),
    });
    const common = {
        submissionId: runId, problemId: problem.id, checkerType: problem.checkerType,
        language: input.language, code: input.sourceCode, timeLimit: problem.timeLimit, memoryLimit: problem.memoryLimit,
    };
    try {
    if (problem.testcases.length) {
        for (const testcase of problem.testcases) {
            await sendJudgeJob({ ...common, testcaseId: testcase.id, submissionType: 'PROBLEM_TRIAL',
                input: testcase.inputData ?? '', expectedOutput: testcase.expectedOutput ?? '' });
        }
    }
    else {
        await sendJudgeJob({ ...common, testcaseId: '', submissionType: 'PLAYGROUND', input: '', expectedOutput: '' });
    }
    } catch {
        try { await markRunFailed(runId); } catch { console.error("[Run] Không thể ghi lỗi gửi job"); }
        throw new AppError(503, "Không thể gửi yêu cầu chạy thử", "RUN_DISPATCH_FAILED", { runId });
    }
    return { runId, total };
}
