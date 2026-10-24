import { z } from 'zod';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const judgeResultSchema = z.object({
  submissionId: z.string().refine(value => uuidPattern.test(value)
    || (value.startsWith('run-') && uuidPattern.test(value.slice(4)))
    || (value.startsWith('play-') && uuidPattern.test(value.slice(5)))),
  testcaseId: z.union([z.string().regex(uuidPattern), z.literal('')]).optional(),
  status: z.string().min(1).max(50), output: z.string().optional(), error: z.string().optional(),
  executionTime: z.number().finite().nonnegative().nullable().optional(), compileLog: z.string().optional(),
  memoryUsed: z.number().finite().nonnegative().nullable().optional(),
  cpuTime: z.number().finite().nonnegative().nullable().optional(),
  compileTime: z.number().finite().nonnegative().nullable().optional(),
}).refine(result => result.submissionId.startsWith('run-') || result.submissionId.startsWith('play-') || Boolean(result.testcaseId), 'Kết quả chính thức phải có testcaseId');
export type JudgeResult = z.output<typeof judgeResultSchema>;
export type ResultDisposition = 'ack' | 'retry';
