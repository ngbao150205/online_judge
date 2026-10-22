import { readOwnedRun } from './run-store.service.js';
export async function getRunStatusService(userId: string, runId: string) {
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
