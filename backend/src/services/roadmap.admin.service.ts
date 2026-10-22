import { AppError } from '../errors/app-error.js';
import prisma from '../config/db.js';
interface CreateRoadmapInput {
    title: string;
    description?: string;
    problems?: {
        problemId: string;
        orderIndex?: number;
    }[];
}
interface UpdateRoadmapInput {
    title?: string;
    description?: string;
    isActive?: boolean;
    problems?: {
        problemId: string;
        orderIndex?: number;
    }[];
}
export async function getAllRoadmapsAdminService() {
    return await prisma.roadmap.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
            problems: { orderBy: { orderIndex: 'asc' } },
        },
    });
}
export async function createRoadmapAdminService(data: CreateRoadmapInput) {
    const problemList = Array.isArray(data.problems) ? data.problems : [];
    return await prisma.roadmap.create({
        data: {
            title: data.title,
            description: data.description,
            problems: {
                create: problemList.map((p, index) => ({
                    problemId: p.problemId,
                    orderIndex: p.orderIndex ?? index + 1,
                })),
            },
        },
        include: {
            problems: {
                orderBy: { orderIndex: 'asc' },
                include: { problem: { select: { id: true, title: true, difficulty: true } } },
            },
        },
    });
}
export async function updateRoadmapAdminService(roadmapId: string, data: UpdateRoadmapInput) {
    const existingRoadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!existingRoadmap || existingRoadmap.deletedAt) {
        throw new AppError(404, 'Lộ trình không tồn tại', 'ROADMAP_NOT_FOUND');
    }
    return await prisma.$transaction(async (tx) => {
        await tx.roadmap.update({
            where: { id: roadmapId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        if (data.problems && Array.isArray(data.problems)) {
            await tx.roadmapProblem.deleteMany({ where: { roadmapId } });
            if (data.problems.length > 0) {
                await tx.roadmapProblem.createMany({
                    data: data.problems.map((p, index) => ({
                        roadmapId,
                        problemId: p.problemId,
                        orderIndex: p.orderIndex ?? index + 1,
                    })),
                });
            }
        }
        return tx.roadmap.findUnique({
            where: { id: roadmapId },
            include: {
                problems: {
                    orderBy: { orderIndex: 'asc' },
                    include: { problem: { select: { id: true, title: true, difficulty: true } } },
                },
            },
        });
    });
}
export async function deleteRoadmapAdminService(roadmapId: string) {
    const existingRoadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!existingRoadmap || existingRoadmap.deletedAt) {
        throw new AppError(404, 'Lộ trình không tồn tại', 'ROADMAP_NOT_FOUND');
    }
    await prisma.roadmap.update({ where: { id: roadmapId }, data: { deletedAt: new Date(), isActive: false } });
}
