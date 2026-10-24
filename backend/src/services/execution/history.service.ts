import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';

const pageSize = 10;

export async function getPlaygroundHistoryService(userId: string, requestedPage = 1) {
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000000) : 1;
  const where = { userId };
  const [total, runs] = await prisma.$transaction([
    prisma.playgroundRun.count({ where }),
    prisma.playgroundRun.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, problemTitle: true, language: true, status: true,
        executionTime: true, memoryUsed: true, createdAt: true, completedAt: true,
      },
    }),
  ]);

  return {
    data: runs.map(({ id, ...run }) => ({ ...run, id: `play-${id}` })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getPlaygroundRunDetailService(userId: string, runId: string) {
  const run = await prisma.playgroundRun.findFirst({
    where: { id: runId.slice(5), userId },
    select: {
      id: true, problemTitle: true, language: true, sourceCode: true, customInput: true,
      status: true, output: true, error: true, executionTime: true, memoryUsed: true,
      cpuTime: true, compileTime: true, createdAt: true, completedAt: true,
    },
  });
  if (!run) throw new AppError(404, 'Lần chạy không tồn tại', 'RUN_NOT_FOUND');
  const { id, ...detail } = run;
  return { ...detail, id: `play-${id}` };
}

export async function reconcileExpiredPlaygroundRuns(now = new Date()) {
  return prisma.playgroundRun.updateMany({
    where: { status: { in: ['PENDING', 'RUNNING'] }, deadlineAt: { lt: now } },
    data: {
      status: 'SYSTEM_ERROR',
      error: 'Hết thời hạn chờ worker trả kết quả.',
      completedAt: now,
    },
  });
}
