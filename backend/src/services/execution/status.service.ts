import { readOwnedRun } from './run-store.service.js';
import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';

export async function getRunStatusService(userId: string, runId: string) {
    if (runId.startsWith('play-')) {
        const playgroundRun = await prisma.playgroundRun.findUnique({ where: { id: runId.slice(5) } });
        if (!playgroundRun || playgroundRun.userId !== userId)
            throw new AppError(404, 'Lần chạy không tồn tại', 'RUN_NOT_FOUND');
        if (playgroundRun.status === 'PENDING' || playgroundRun.status === 'RUNNING')
            return { runId, status: playgroundRun.status, message: 'Hệ thống đang xử lý mã nguồn...' };
        return {
            runId, status: playgroundRun.status,
            output: playgroundRun.output || '', stdout: playgroundRun.output || '',
            error: playgroundRun.error || '', stderr: playgroundRun.error || '',
            executionTime: playgroundRun.executionTime, memoryUsed: playgroundRun.memoryUsed,
            cpuTime: playgroundRun.cpuTime, compileTime: playgroundRun.compileTime,
        };
    }

    // PROBLEM_TRIAL (and pre-migration runs still in flight) remain Redis-backed and expire by TTL.
    const result = await readOwnedRun(userId, runId);
    if (!result)
        return { runId, status: 'PENDING', message: 'Hệ thống đang xử lý mã nguồn...' };
    const parsed = JSON.parse(result);
    if (parsed.status === 'PENDING' && typeof parsed.total !== 'number') {
        return { runId, status: 'PENDING', message: 'Hệ thống đang xử lý mã nguồn...' };
    }
    if (typeof parsed.total === 'number') {
        return {
            runId: parsed.submissionId || runId, status: parsed.status || 'RUNNING', total: parsed.total,
            completed: parsed.completed ?? 0, passed: parsed.passed ?? 0, failed: parsed.failed ?? 0, results: Array.isArray(parsed.results) ? parsed.results : [],
            ...(parsed.error ? { error: parsed.error } : {}),
        };
    }
    return {
        runId: parsed.submissionId || runId, status: parsed.status || 'RUN_SUCCESS',
        output: parsed.output || '', stdout: parsed.stdout || parsed.output || '',
        error: parsed.error || '', stderr: parsed.stderr || parsed.error || '',
        executionTime: parsed.executionTime ?? parsed.duration ?? null,
        memoryUsed: parsed.memoryUsed ?? parsed.memory ?? null, cpuTime: parsed.cpuTime ?? null, compileTime: parsed.compileTime ?? null,
    };
}
