import { SubmissionStatus, TestcaseStatus } from '@prisma/client';
import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
import type { JudgeResult } from '../../types/judge-result.js';
import { aggregateOfficialStatus, mapToTestcaseStatus, elapsedMilliseconds } from '../../utils/submission-status.js';
import { recordFinalizedAttempt } from './progress.service.js';
import { finalizeSystemError } from '../outbox.service.js';
export async function applySubmissionResult(result: JudgeResult): Promise<void> {
    const { submissionId, testcaseId, executionTime, output, error, compileLog, status } = result;
    if (!testcaseId)
        throw new AppError(400, 'Kết quả chính thức thiếu testcaseId', 'INVALID_RESULT');
    const officialTestcaseId = testcaseId;
    await prisma.$transaction(async (tx) => {
        // Hai consumer nhận kết quả cùng submission
        // sẽ cập nhật lần lượt, tránh ghi đè kết quả tổng hợp.
        await tx.$queryRaw `
    SELECT id
    FROM submissions
    WHERE id = ${submissionId}::uuid
    FOR UPDATE
  `;
        const submission = await tx.submission.findUnique({
            where: { id: submissionId },
            select: {
                id: true,
                userId: true,
                problemId: true,
                status: true,
                totalTestcases: true,
            },
        });
        if (!submission) {
            return;
        }
        // Đã kết thúc: bỏ qua kết quả trùng hoặc đến muộn.
        if (submission.status !== SubmissionStatus.PENDING &&
            submission.status !== SubmissionStatus.IN_PROGRESS) {
            return;
        }
        // Submission cũ chưa tạo danh sách testcase chờ
        // không được kết luận theo cơ chế mới.
        if (submission.totalTestcases <= 0) {
            throw new Error(`Submission has no initialized testcases: ${submissionId}`);
        }
        const testcaseResult = await tx.submissionResult.findFirst({
            where: {
                submissionId,
                testcaseId: officialTestcaseId,
            },
        });
        if (!testcaseResult) {
            throw new Error(`Unexpected testcase ${officialTestcaseId} for ${submissionId}`);
        }
        // Đã có kết quả: không cộng thêm và không ghi đè.
        if (testcaseResult.status !== TestcaseStatus.PENDING) {
            return;
        }
        const nextStatus = mapToTestcaseStatus(result.status);
        // Schema dùng Int; giới hạn giá trị trước khi ghi.
        const elapsedMs = elapsedMilliseconds(executionTime ?? undefined);
        await tx.submissionResult.update({
            where: { id: testcaseResult.id },
            data: {
                status: nextStatus,
                executionTime: elapsedMs,
                memoryUsed: result.memoryUsed == null ? null : elapsedMilliseconds(result.memoryUsed),
                cpuTime: result.cpuTime == null ? null : elapsedMilliseconds(result.cpuTime),
                compileTime: result.compileTime == null ? null : elapsedMilliseconds(result.compileTime),
                output: output !== undefined &&
                    output !== null
                    ? output
                    : null,
                errorLog: error ||
                    compileLog ||
                    (nextStatus === TestcaseStatus.SYSTEM_ERROR
                        ? `Unexpected worker status: ${status}`
                        : null),
            },
        });
        const rows = await tx.submissionResult.findMany({
            where: { submissionId },
            select: {
                status: true,
                executionTime: true,
                memoryUsed: true,
                errorLog: true,
            },
        });
        if (rows.length !== submission.totalTestcases) {
            await finalizeSystemError(tx, submissionId, 'Danh sách testcase của lần nộp không còn đầy đủ.');
            return;
        }
        const finishedRows = rows.filter((row) => row.status !== TestcaseStatus.PENDING);
        const durationSum = finishedRows.reduce((sum, row) => sum + row.executionTime, 0);
        // Không lưu tổng bị tràn kiểu Int.
        const recordedTotalTime = durationSum <= 2147483647 ? durationSum : null;
        const memories = finishedRows.flatMap(row => row.memoryUsed == null ? [] : [row.memoryUsed]);
        const maxMemory = memories.length ? Math.max(...memories) : null;
        if (finishedRows.length < submission.totalTestcases) {
            await tx.submission.update({
                where: { id: submissionId },
                data: {
                    status: SubmissionStatus.IN_PROGRESS,
                    totalTime: recordedTotalTime,
                    maxMemory,
                },
            });
            return;
        }
        const finalStatus = aggregateOfficialStatus(rows.map((row) => row.status));
        const diagnostics = rows
            .filter((row) => row.status === TestcaseStatus.CE ||
            row.status === TestcaseStatus.SYSTEM_ERROR)
            .map((row) => row.errorLog)
            .filter((message): message is string => Boolean(message))
            .join('\n');
        await tx.submission.update({
            where: { id: submissionId },
            data: {
                status: finalStatus,
                maxMemory,
                totalTime: recordedTotalTime,
                compileLog: diagnostics || null,
            },
        });
        await tx.outboxJob.updateMany({ where: { submissionId, sentAt: null, cancelledAt: null },
            data: { cancelledAt: new Date(), leaseUntil: null, leaseToken: null } });
        await recordFinalizedAttempt(tx, submission, finalStatus === SubmissionStatus.ACCEPTED);
    });
}
