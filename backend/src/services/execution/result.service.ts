import { redisClient } from '../../config/redis.js';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import type { JudgeResult, ResultDisposition } from '../../types/judge-result.js';
import { runOwnerKey, runResultKey } from './run-store.service.js';
// Atomic update prevents concurrent consumers from overwriting each other's tests.
// The owner key supplies the lifetime: results never outlive access metadata.
export const applyRunResultScript = `
local ttl = redis.call('TTL', KEYS[2])
if ttl <= 0 then return 0 end
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local current = cjson.decode(raw)
if current.status == 'SYSTEM_ERROR' then return 1 end
local item = cjson.decode(ARGV[1])
if item.testcaseId and item.testcaseId ~= '' then
  if not current.results or not current.total then return -1 end
  if current.expectedTestcaseIds then
    local expected = false
    for _, id in ipairs(current.expectedTestcaseIds) do
      if id == item.testcaseId then expected = true end
    end
    if not expected then return 0 end
  end
  for _, result in ipairs(current.results) do
    if result.testcaseId == item.testcaseId then return 1 end
  end
  table.insert(current.results, {testcaseId=item.testcaseId,status=item.status,
    output=item.output or '',error=item.error or '',executionTime=item.executionTime or cjson.null,memoryUsed=item.memoryUsed or cjson.null,cpuTime=item.cpuTime or cjson.null,compileTime=item.compileTime or cjson.null})
  current.completed = #current.results
  current.passed = 0
  for _, result in ipairs(current.results) do
    if result.status == 'AC' or result.status == 'ACCEPTED' then current.passed = current.passed + 1 end
  end
  current.failed = current.completed - current.passed
  current.status = 'RUNNING'
  if current.completed >= current.total then
    current.status = current.failed == 0 and 'ACCEPTED' or 'COMPLETED'
  end
else
  if current.status ~= 'PENDING' and current.status ~= 'RUNNING' then return 1 end
  current = {submissionId=item.submissionId,status=item.status,output=item.output or '',
    error=item.error or '',executionTime=item.executionTime or cjson.null,memoryUsed=item.memoryUsed or cjson.null,cpuTime=item.cpuTime or cjson.null,compileTime=item.compileTime or cjson.null}
end
redis.call('SET', KEYS[1], cjson.encode(current), 'EX', math.min(ttl, tonumber(ARGV[2])))
return 1
`;
export async function applyRunResult(result: JudgeResult): Promise<ResultDisposition> {
    const code = Number(await redisClient.eval(applyRunResultScript, 2, runResultKey(result.submissionId), runOwnerKey(result.submissionId), JSON.stringify(result), env.RUN_TTL_SECONDS));
    return code === -1 ? 'retry' : 'ack'; // Expired/duplicate results can be acknowledged.
}

export async function applyPlaygroundResult(result: JudgeResult): Promise<ResultDisposition> {
    const id = result.submissionId.slice(5);
    const run = await prisma.playgroundRun.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!run) return 'ack'; // Stale result for a removed/unknown Playground record.
    if (run.status !== 'PENDING' && run.status !== 'RUNNING') return 'ack';

    await prisma.playgroundRun.updateMany({
        where: { id, status: { in: ['PENDING', 'RUNNING'] } },
        data: {
            status: result.status,
            output: result.output ?? '',
            error: result.error ?? '',
            executionTime: result.executionTime == null ? null : Math.trunc(result.executionTime),
            memoryUsed: result.memoryUsed == null ? null : Math.trunc(result.memoryUsed),
            cpuTime: result.cpuTime == null ? null : Math.trunc(result.cpuTime),
            compileTime: result.compileTime == null ? null : Math.trunc(result.compileTime),
            completedAt: new Date(),
        },
    });
    return 'ack'; // Duplicate or late results must not overwrite a final/expired run.
}
