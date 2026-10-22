import prisma from '../config/db.js';
import { getWorkerSnapshots } from './worker-monitor.service.js';
import { getQueueDepths } from './queue-admin.service.js';

export async function getAdminStatsService() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [totalStudents, totalProblems, totalRoadmaps, submissionsToday, workers] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }), prisma.problem.count({ where: { deletedAt: null } }),
    prisma.roadmap.count({ where: { deletedAt: null } }), prisma.submission.count({ where: { createdAt: { gte: today } } }), getWorkerSnapshots(),
  ]);
  return { totalStudents, totalProblems, totalRoadmaps, submissionsToday, activeWorkers: workers.filter(worker => worker.status !== 'OFFLINE').length, totalWorkers: workers.length };
}
export async function getLiveSubmissionsService() {
  const rows = await prisma.submission.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, problem: { select: { title: true } } } });
  return rows.map(row => ({ id: `#SUB${row.id}`, user: row.user.name, problem: row.problem.title, lang: row.language, result: row.status,
    cpu: row.totalTime === null ? 'Chưa đo' : `${row.totalTime} ms`, time: row.createdAt.toLocaleTimeString('vi-VN') }));
}
export const getWorkersService = getWorkerSnapshots;
export async function getAlertsService() {
  const [workers, queues, retrying, systemErrors] = await Promise.all([
    getWorkerSnapshots(), getQueueDepths(), prisma.outboxJob.count({ where: { sentAt: null, cancelledAt: null, attempts: { gt: 0 } } }),
    prisma.submission.count({ where: { status: 'SYSTEM_ERROR', createdAt: { gte: new Date(Date.now() - 3600000) } } }),
  ]);
  const alerts: Array<{ id: string; type: string; title: string; message: string }> = [];
  if (!workers.some(worker => worker.status !== 'OFFLINE')) alerts.push({ id: 'workers-offline', type: 'WARNING', title: 'Không có worker online', message: 'Chưa nhận heartbeat gần đây; bài nộp sẽ chờ worker hoặc hết deadline.' });
  for (const queue of queues) {
    if (!queue.available) alerts.push({ id: `queue-${queue.name}`, type: 'DANGER', title: 'Queue không truy cập được', message: `Không thể đọc trạng thái ${queue.name}.` });
    if (queue.deadLetters) alerts.push({ id: `dlq-${queue.name}`, type: 'DANGER', title: 'Có message trong DLQ', message: `${queue.name}: ${queue.deadLetters} message cần kiểm tra.` });
  }
  if (retrying) alerts.push({ id: 'outbox-retry', type: 'WARNING', title: 'Outbox đang thử gửi lại', message: `${retrying} job chưa được SQS xác nhận.` });
  if (systemErrors) alerts.push({ id: 'system-errors', type: 'WARNING', title: 'Bài nộp lỗi hệ thống', message: `${systemErrors} bài nộp lỗi hệ thống trong giờ qua.` });
  return alerts;
}
export async function getAnalyticsService() {
  const [groups, size] = await Promise.all([
    prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.$queryRaw<Array<{ bytes: bigint }>>`SELECT pg_database_size(current_database()) AS bytes`,
  ]);
  const counts = Object.fromEntries(groups.map(group => [group.status, group._count._all]));
  const total = groups.filter(group => !['PENDING', 'IN_PROGRESS'].includes(group.status)).reduce((sum, group) => sum + group._count._all, 0);
  const percent = (count: number) => total ? Math.round(count / total * 1000) / 10 : 0;
  const acCount = counts.ACCEPTED || 0, waCount = counts.WRONG_ANSWER || 0, tleCount = counts.TIME_LIMIT_EXCEEDED || 0, ceCount = counts.COMPILE_ERROR || 0;
  return { acCount, waCount, tleCount, ceCount, acPercent: percent(acCount), waPercent: percent(waCount), tlePercent: percent(tleCount), cePercent: percent(ceCount),
    otherCount: total - acCount - waCount - tleCount - ceCount, otherPercent: percent(total - acCount - waCount - tleCount - ceCount), counts, total, storageUsedGb: Number(size[0]?.bytes || 0n) / 1073741824, storageTotalGb: null };
}
