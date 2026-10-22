import { redisClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
export const runResultKey = (runId: string) => `run_result:${runId}`;
export const runOwnerKey = (runId: string) => `run_owner:${runId}`;
export async function initializeRun(userId: string, runId: string, initial: Record<string, unknown>): Promise<void> {
    const replies = await redisClient.multi()
        .set(runOwnerKey(runId), userId, 'EX', env.RUN_TTL_SECONDS)
        .set(runResultKey(runId), JSON.stringify(initial), 'EX', env.RUN_TTL_SECONDS)
        .exec();
    if (!replies || replies.some(([error]) => error))
        throw new Error('Không thể khởi tạo run trong Redis');
}
export async function readOwnedRun(userId: string, runId: string): Promise<string | null> {
    const owner = await redisClient.get(runOwnerKey(runId));
    if (owner !== userId)
        throw new AppError(404, 'Lần chạy không tồn tại hoặc đã hết hạn', 'RUN_NOT_FOUND');
    return redisClient.get(runResultKey(runId));
}

export async function markRunFailed(runId: string): Promise<void> {
  await redisClient.eval(`
local ttl = redis.call('TTL', KEYS[2])
local raw = redis.call('GET', KEYS[1])
if ttl <= 0 or not raw then return 0 end
local current = cjson.decode(raw)
if current.status ~= 'PENDING' and current.status ~= 'RUNNING' then return 0 end
current.status = 'SYSTEM_ERROR'
current.error = 'Không thể hoàn tất gửi yêu cầu chạy thử'
redis.call('SET', KEYS[1], cjson.encode(current), 'EX', ttl)
return 1
`, 2, runResultKey(runId), runOwnerKey(runId));
}
