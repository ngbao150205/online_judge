import type { Prisma } from '@prisma/client';
export async function recordFinalizedAttempt(tx: Prisma.TransactionClient, submission: {
    id: string;
    userId: string;
    problemId: string;
}, accepted: boolean): Promise<void> {
    const links = await tx.roadmapProblem.findMany({ where: { problemId: submission.problemId } });
    const solved = accepted ? { isSolved: true, solvedAt: new Date(), lastSubmissionId: submission.id } : {};
    for (const link of links) {
        await tx.roadmapProgress.upsert({
            where: { userId_roadmapId_problemId: { userId: submission.userId, roadmapId: link.roadmapId, problemId: submission.problemId } },
            update: { ...solved, attemptCount: { increment: 1 } },
            create: { userId: submission.userId, roadmapId: link.roadmapId, problemId: submission.problemId,
                isSolved: accepted, attemptCount: 1, ...solved },
        });
    }
}
