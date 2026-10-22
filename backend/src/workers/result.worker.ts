import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { setTimeout as delay } from 'node:timers/promises';
import { sqsClient } from '../config/sqs.js';
import { env } from '../config/env.js';
import { processResultMessage } from '../services/result.service.js';

export async function runResultWorker(signal: AbortSignal): Promise<void> {
  const queueUrl = env.RESULT_QUEUE_URL;
  if (!queueUrl) { console.warn('[Worker] RESULT_QUEUE_URL chưa được cấu hình'); return; }
  while (!signal.aborted) {
    try {
      const { Messages = [] } = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20,
      }), { abortSignal: signal });
      for (const message of Messages) {
        if (signal.aborted) break;
        try {
          const disposition = await processResultMessage(message);
          if (disposition === 'ack' && message.ReceiptHandle) {
            await sqsClient.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }), { abortSignal: signal });
          }
        } catch (error) {
          if (!signal.aborted) console.error('[Worker] Message sẽ retry:', error instanceof Error ? error.name : 'UnknownError');
        }
      }
    } catch (error) {
      if (!signal.aborted) console.error('[Worker] Lỗi nhận result:', error instanceof Error ? error.name : 'UnknownError');
    }
    if (!signal.aborted) {
      try { await delay(1000, undefined, { signal }); } catch { break; }
    }
  }
}
