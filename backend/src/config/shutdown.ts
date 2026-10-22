import prisma, { databasePool } from './db.js';
import { redisClient } from './redis.js';
import { sqsClient } from './sqs.js';

export async function closeInfrastructure(): Promise<void> {
  const results = await Promise.allSettled([
    (async () => { await prisma.$disconnect(); if (!databasePool.ended) await databasePool.end(); })(),
    (async () => {
      try { if (redisClient.status === 'ready') await redisClient.quit(); }
      finally { redisClient.disconnect(); }
    })(),
  ]);
  sqsClient.destroy();
  if (results.some(result => result.status === 'rejected')) throw new Error('Không thể đóng toàn bộ kết nối hạ tầng');
}
