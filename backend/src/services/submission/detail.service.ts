import { TestcaseStatus } from '@prisma/client';
import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
export async function getSubmissionDetailService(userId: string, id: string) {
    const submission = await prisma.submission.findFirst({
        where: { id, userId },
        select: {
            id: true, language: true, sourceCode: true, status: true,
            totalTestcases: true, totalTime: true, maxMemory: true, testcaseVersion: true, createdAt: true,
            problem: { select: { id: true, title: true, slug: true } },
            results: { select: {
                    id: true, testcaseId: true, status: true, executionTime: true, memoryUsed: true, cpuTime: true, compileTime: true, output: true, errorLog: true,
                    testcase: { select: { orderIndex: true, isHidden: true, inputData: true } },
                } },
        },
    });
    if (!submission)
        throw new AppError(404, 'Không tìm thấy bài nộp', 'SUBMISSION_NOT_FOUND');
    const completed = submission.results.filter(item => item.status !== TestcaseStatus.PENDING).length;
    const passed = submission.results.filter(item => item.status === TestcaseStatus.AC).length;
    // Preserve existing visibility policy: hidden details are visible after all tests pass.
    const allPassed = completed === submission.totalTestcases && passed === submission.totalTestcases;
    const results = [...submission.results]
        .sort((a, b) => a.testcase.orderIndex - b.testcase.orderIndex || a.testcaseId.localeCompare(b.testcaseId))
        .map(({ testcase, errorLog, output, ...item }, index) => ({
        ...item, number: index + 1, isHidden: testcase.isHidden,
        input: allPassed || !testcase.isHidden ? testcase.inputData : null,
        output: allPassed || !testcase.isHidden ? output : null,
        errorLog: allPassed || !testcase.isHidden ? errorLog : null,
    }));
    return { ...submission, results, completed, passed, failed: completed - passed };
}
