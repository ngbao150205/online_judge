import { ensureJudgeQueues } from '../services/queue-admin.service.js';
import { sqsClient } from '../config/sqs.js';
try { await ensureJudgeQueues(); console.info('[SQS] Queues ready'); }
finally { sqsClient.destroy(); }
