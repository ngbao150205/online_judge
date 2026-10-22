import { TestcaseStatus } from '@prisma/client';
import prisma from '../../config/db.js';
export async function getSubmissionHistoryService(userId: string, requestedPage = 1) {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000000) : 1;
    const pageSize = 10;
    const where = { userId };
    const [total, submissions] = await prisma.$transaction([
        prisma.submission.count({ where }),
        prisma.submission.findMany({
            where, skip: (page - 1) * pageSize, take: pageSize,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
                id: true, language: true, status: true, totalTestcases: true, totalTime: true, createdAt: true,
                problem: { select: { id: true, title: true, slug: true } },
                results: { select: { status: true } },
            },
        }),
    ]);
    const data = submissions.map(({ results, ...submission }) => {
        const completed = results.filter(item => item.status !== TestcaseStatus.PENDING).length;
        const passed = results.filter(item => item.status === TestcaseStatus.AC).length;
        return { ...submission, completed, passed, failed: completed - passed };
    });
    return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}
