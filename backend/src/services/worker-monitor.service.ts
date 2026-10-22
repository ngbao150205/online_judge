import { z } from 'zod';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';

export const heartbeatSchema = z.object({
  type: z.literal('WORKER_HEARTBEAT'), workerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.-]+$/),
  state: z.enum(['IDLE', 'BUSY']), observedAt: z.iso.datetime(),
  cpuUsage: z.number().finite().nonnegative().max(100000).nullable(),
  memoryBytes: z.number().int().nonnegative().nullable(), memoryLimitBytes: z.number().int().positive().nullable(),
});
const heartbeatScript = `
local previous = redis.call('ZSCORE', KEYS[1], ARGV[1])
if previous and tonumber(previous) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
redis.call('SET', KEYS[2], ARGV[3], 'EX', 86400)
return 1`;

export async function recordHeartbeat(input: z.output<typeof heartbeatSchema>) {
  const timestamp = Date.parse(input.observedAt);
  if (timestamp > Date.now() + 60000 || timestamp < Date.now() - 86400000) return;
  await redisClient.eval(heartbeatScript, 2, 'workers:registry', `worker:${input.workerId}`, input.workerId, timestamp, JSON.stringify(input));
}

export async function getWorkerSnapshots() {
  await redisClient.zremrangebyscore('workers:registry', '-inf', String(Date.now() - 86400000));
  const ids = await redisClient.zrange('workers:registry', '0', '-1');
  if (!ids.length) return [];
  const values = await redisClient.mget(...ids.map(id => `worker:${id}`));
  return values.flatMap(value => {
    if (!value) return [];
    const parsed = heartbeatSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return [];
    const worker = parsed.data;
    const offline = Date.now() - Date.parse(worker.observedAt) > env.WORKER_OFFLINE_SECONDS * 1000;
    return [{ id: worker.workerId, name: worker.workerId, status: offline ? 'OFFLINE' : worker.state,
      lastSeenAt: worker.observedAt, cpuUsage: offline ? null : worker.cpuUsage,
      memoryBytes: worker.memoryBytes, memoryLimitBytes: worker.memoryLimitBytes,
      ramUsage: worker.memoryBytes === null ? 'Chưa đo' : `${(worker.memoryBytes / 1048576).toFixed(1)} MiB${worker.memoryLimitBytes ? ` / ${(worker.memoryLimitBytes / 1048576).toFixed(0)} MiB` : ''}`,
    }];
  });
}
