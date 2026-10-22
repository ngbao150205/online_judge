import { setTimeout as delay } from 'node:timers/promises';
import { ensureJudgeQueues } from '../services/queue-admin.service.js';
import { sqsClient } from '../config/sqs.js';

try {
  for (let attempt = 1; ; attempt++) {
    try {
      await ensureJudgeQueues();
      console.info('[Startup] Job/result queues and DLQs ready.');
      break;
    } catch {
      if (attempt >= 30) throw new Error('Không kết nối/cấu hình được SQS. Kiểm tra URLs và quyền IAM.');
      await delay(2000);
    }
  }
} finally {
  sqsClient.destroy();
}
