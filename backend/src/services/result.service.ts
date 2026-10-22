import type { Message } from '@aws-sdk/client-sqs';
import { judgeResultSchema } from '../types/judge-result.js';
import type { ResultDisposition } from '../types/judge-result.js';
import { applyRunResult } from './execution/result.service.js';
import { applySubmissionResult } from './submission/result.service.js';
import { heartbeatSchema, recordHeartbeat } from './worker-monitor.service.js';
export async function processResultMessage(message: Pick<Message, 'Body'>): Promise<ResultDisposition> {
    let body: unknown;
    try {
        body = JSON.parse(message.Body || '');
    }
    catch {
        console.warn('[Result] Bỏ message JSON không hợp lệ');
        return 'retry';
    }
    if (typeof body === 'object' && body !== null && 'type' in body && body.type === 'WORKER_HEARTBEAT') {
        const heartbeat = heartbeatSchema.safeParse(body);
        if (!heartbeat.success) return 'retry';
        await recordHeartbeat(heartbeat.data);
        return 'ack';
    }
    const parsed = judgeResultSchema.safeParse(body);
    if (!parsed.success) {
        console.warn('[Result] Bỏ message sai định dạng');
        return 'retry';
    }
    if (parsed.data.submissionId.startsWith('run-'))
        return applyRunResult(parsed.data);
    await applySubmissionResult(parsed.data);
    return 'ack';
}
