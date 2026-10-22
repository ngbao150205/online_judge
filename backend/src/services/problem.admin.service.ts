import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import prisma from '../config/db.js';
import { slugify } from '../utils/slugify.js';
import { Difficulty } from '@prisma/client';
export interface CreateProblemInput {
    title: string;
    description: string;
    difficulty?: Difficulty;
    timeLimit?: number;
    memoryLimit?: number;
    isActive?: boolean;
    categoryIds: string[];
    testcases?: Array<{
        inputData: string;
        expectedOutput: string;
        isHidden?: boolean;
        orderIndex?: number;
    }>;
}
export interface UpdateProblemInput {
    title?: string;
    description?: string;
    difficulty?: Difficulty;
    timeLimit?: number;
    memoryLimit?: number;
    isActive?: boolean;
    categoryIds?: string[];
    testcases?: Array<{
        inputData: string;
        expectedOutput: string;
        isHidden?: boolean;
        orderIndex?: number;
    }>;
}
// 🟢 1. Tạo bài tập mới
export async function createProblemService(data: CreateProblemInput) {
    const { title, description, difficulty, timeLimit, memoryLimit, isActive, categoryIds, testcases } = data;
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
        throw new AppError(400, 'Bài tập bắt buộc phải thuộc ít nhất một danh mục', 'INVALID_INPUT');
    }
    const validCategories = await prisma.category.findMany({ where: { id: { in: categoryIds }, deletedAt: null } });
    if (validCategories.length !== categoryIds.length) {
        throw new AppError(400, 'Một hoặc nhiều danh mục được chọn không tồn tại', 'INVALID_INPUT');
    }
    const slug = `${slugify(title)}-${randomUUID().slice(0, 8)}`;
    return await prisma.problem.create({
        data: {
            title,
            slug,
            description,
            difficulty: difficulty || Difficulty.MEDIUM,
            timeLimit: timeLimit || 1000,
            memoryLimit: memoryLimit || 256,
            isActive: isActive ?? true,
            categories: {
                create: categoryIds.map((catId) => ({ categoryId: catId })),
            },
            testcases: testcases && testcases.length > 0 ? {
                create: testcases.map((tc, index) => ({
                    inputData: tc.inputData,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden ?? true,
                    orderIndex: tc.orderIndex ?? index + 1,
                })),
            } : undefined,
        },
        include: { categories: { include: { category: true } }, testcases: { where: { deletedAt: null } } },
    });
}
// 🟢 2. Lấy danh sách bài tập cho Admin
export async function getAdminProblemsService() {
    return await prisma.problem.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            timeLimit: true,
            memoryLimit: true,
            isActive: true,
            categories: {
                select: { category: { select: { id: true, name: true } } },
            },
            testcases: {
                where: { deletedAt: null },
                select: { isHidden: true },
            },
            _count: {
                select: { testcases: { where: { deletedAt: null } }, submissions: true },
            },
        },
        orderBy: { title: 'asc' },
    });
}
// 🟢 3. Lấy chi tiết 1 bài tập theo ID
export async function getAdminProblemDetailService(id: string) {
    const problem = await prisma.problem.findUnique({
        where: { id },
        include: {
            categories: { include: { category: true } },
            testcases: { where: { deletedAt: null }, orderBy: { orderIndex: 'asc' } },
        },
    });
    if (!problem || problem.deletedAt)
        throw new AppError(404, 'Không tìm thấy bài tập', 'PROBLEM_NOT_FOUND');
    return problem;
}
// 🟢 4. Cập nhật bài tập
export async function updateProblemService(id: string, data: UpdateProblemInput) {
    return prisma.$transaction(async tx => {
        // Serialize problem edits and block new FK references while checking testcase history.
        await tx.$queryRaw`SELECT id FROM problems WHERE id = ${id}::uuid FOR UPDATE`;
        const existing = await tx.problem.findUnique({
            where: { id }, include: { testcases: { where: { deletedAt: null }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] } },
        });
        if (!existing || existing.deletedAt) throw new AppError(404, 'Không tìm thấy bài tập', 'PROBLEM_NOT_FOUND');
        let categoryUpdate;
        if (data.categoryIds !== undefined) {
            const valid = await tx.category.count({ where: { id: { in: data.categoryIds }, deletedAt: null } });
            if (!data.categoryIds.length || valid !== data.categoryIds.length) {
                throw new AppError(400, 'Một hoặc nhiều danh mục được chọn không tồn tại', 'INVALID_INPUT');
            }
            categoryUpdate = { deleteMany: {}, create: data.categoryIds.map(categoryId => ({ categoryId })) };
        }
        let testcaseUpdate;
        if (data.testcases !== undefined) {
            const normalize = (items: NonNullable<UpdateProblemInput['testcases']>) => items.map((tc, index) => ({
                inputData: tc.inputData, expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden ?? true, orderIndex: tc.orderIndex ?? index + 1,
            })).sort((a, b) => a.orderIndex - b.orderIndex);
            const next = normalize(data.testcases);
            if (JSON.stringify(normalize(existing.testcases)) !== JSON.stringify(next)) {
                const version = existing.testcaseVersion + 1;
                // Keep old testcase IDs and content for historical submissions.
                testcaseUpdate = {
                    updateMany: { where: { deletedAt: null }, data: { deletedAt: new Date() } },
                    create: next.map(testcase => ({ ...testcase, version })),
                };

            }
        }
        return tx.problem.update({
            where: { id }, data: {
                ...(data.title !== undefined && { title: data.title,
                    ...(data.title !== existing.title && { slug: `${slugify(data.title)}-${randomUUID().slice(0, 8)}` }) }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
                ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
                ...(data.memoryLimit !== undefined && { memoryLimit: data.memoryLimit }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(categoryUpdate && { categories: categoryUpdate }),
                ...(testcaseUpdate && { testcases: testcaseUpdate, testcaseVersion: { increment: 1 } }),
            }, include: { categories: { include: { category: true } }, testcases: { where: { deletedAt: null } } },
        });
    });
}

export async function deleteProblemService(id: string) {
    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new AppError(404, 'Bài tập không tồn tại', 'PROBLEM_NOT_FOUND');
    return prisma.problem.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}

export async function getTestcaseVersionsService(id: string) {
    const problem = await prisma.problem.findUnique({ where: { id }, select: { id: true, testcaseVersion: true } });
    if (!problem) throw new AppError(404, 'Bài tập không tồn tại', 'PROBLEM_NOT_FOUND');
    const testcases = await prisma.testcase.findMany({ where: { problemId: id }, orderBy: [{ version: 'desc' }, { orderIndex: 'asc' }, { id: 'asc' }] });
    return { currentVersion: problem.testcaseVersion, testcases };
}
