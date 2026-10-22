import { AppError } from '../errors/app-error.js';
import prisma from '../config/db.js';
export async function getPublicRoadmapsService() {
    const roadmaps = await prisma.roadmap.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
            problems: {
                where: { problem: { deletedAt: null, isActive: true } },
                orderBy: { orderIndex: 'asc' },
                include: {
                    problem: { select: { id: true, title: true, slug: true, difficulty: true } },
                },
            },
        },
    });
    return roadmaps.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        totalProblems: r.problems.length,
        problems: r.problems.map((rp) => ({
            ...rp.problem,
            orderIndex: rp.orderIndex,
        })),
    }));
}
export async function getStudentRoadmapDetailService(roadmapId: string, userId?: string) {
    const roadmap = await prisma.roadmap.findFirst({
        where: {
            id: roadmapId,
            isActive: true, deletedAt: null,
        },
        include: {
            problems: {
                where: { problem: { deletedAt: null, isActive: true } },
                orderBy: {
                    orderIndex: 'asc'
                },
                include: {
                    problem: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            difficulty: true,
                        }
                    }
                }
            },
            // lấy tiến độ của user trong roadmap này
            progress: userId
                ? {
                    where: {
                        userId
                    },
                    select: {
                        problemId: true,
                        isSolved: true,
                        solvedAt: true,
                    }
                }
                : false
        }
    });
    if (!roadmap) {
        throw new AppError(404, 'Lộ trình không tồn tại', 'ROADMAP_NOT_FOUND');
    }
    const progressMap = new Map((roadmap.progress || [])
        .map(p => [
        p.problemId,
        p
    ]));
    let previousSolved = true;
    const formattedProblems = roadmap.problems.map((rp, index) => {
        const progress = progressMap.get(rp.problemId);
        const isSolved = progress?.isSolved ?? false;
        const isUnlocked = index === 0 ||
            previousSolved;
        previousSolved = previousSolved && isSolved;
        return {
            id: rp.problem.id,
            title: rp.problem.title,
            slug: rp.problem.slug,
            difficulty: rp.problem.difficulty,
            orderIndex: rp.orderIndex,
            isSolved,
            isUnlocked,
            solvedAt: progress?.solvedAt ?? null,
            status: isSolved
                ? 'COMPLETED'
                : isUnlocked
                    ? 'UNLOCKED'
                    : 'LOCKED'
        };
    });
    return {
        id: roadmap.id,
        title: roadmap.title,
        description: roadmap.description,
        totalProblems: formattedProblems.length,
        completedCount: formattedProblems.filter(p => p.isSolved).length,
        problems: formattedProblems,
    };
}
