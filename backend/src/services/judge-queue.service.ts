import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '../config/sqs.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { JudgeJob } from '../types/execution.js';
export function requireJudgeQueue(): string {
    const queueUrl = env.SQS_QUEUE_URL;
    if (!queueUrl)
        throw new AppError(503, 'Hệ thống hàng đợi chưa được cấu hình', 'QUEUE_UNAVAILABLE');
    return queueUrl;
}
export async function sendJudgeJob(job: JudgeJob, signal?: AbortSignal): Promise<void> {
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: requireJudgeQueue(), MessageBody: JSON.stringify(job),
    }), { abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
}
