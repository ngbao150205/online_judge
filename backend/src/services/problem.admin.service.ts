import prisma from '../config/db';
import { slugify } from '../utils/slugify';
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
export const createProblemService = async (data: CreateProblemInput) => {
  const { title, description, difficulty, timeLimit, memoryLimit, isActive, categoryIds, testcases } = data;

  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new Error('Bài tập bắt buộc phải thuộc ít nhất một danh mục');
  }

  const validCategories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  if (validCategories.length !== categoryIds.length) {
    throw new Error('Một hoặc nhiều danh mục được chọn không tồn tại');
  }

  const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

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
          orderIndex: tc.orderIndex || index + 1,
        })),
      } : undefined,
    },
    include: { categories: { include: { category: true } }, testcases: true },
  });
};

// 🟢 2. Lấy danh sách bài tập cho Admin
export const getAdminProblemsService = async () => {
  return await prisma.problem.findMany({
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
        select: { isHidden: true },
      },
      _count: {
        select: { testcases: true, submissions: true },
      },
    },
    orderBy: { title: 'asc' },
  });
};

// 🟢 3. Lấy chi tiết 1 bài tập theo ID
export const getAdminProblemDetailService = async (id: string) => {
  const problem = await prisma.problem.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      testcases: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (!problem) throw new Error('Không tìm thấy bài tập');
  return problem;
};

// 🟢 4. Cập nhật bài tập
export const updateProblemService = async (id: string, data: UpdateProblemInput) => {
  const { title, description, difficulty, timeLimit, memoryLimit, isActive, categoryIds, testcases } = data;

  const existingProblem = await prisma.problem.findUnique({ where: { id } });
  if (!existingProblem) throw new Error('Không tìm thấy bài tập');

  let categoryUpdateData;
  if (categoryIds !== undefined) {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new Error('Bài tập bắt buộc phải thuộc ít nhất một danh mục');
    }

    const validCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (validCategories.length !== categoryIds.length) {
      throw new Error('Một hoặc nhiều danh mục được chọn không tồn tại');
    }

    categoryUpdateData = {
      deleteMany: {},
      create: categoryIds.map((catId: string) => ({ categoryId: catId })),
    };
  }

  let testcaseUpdateData;
  if (testcases && Array.isArray(testcases)) {
    testcaseUpdateData = {
      deleteMany: {},
      create: testcases.map((tc, index) => ({
        inputData: tc.inputData,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden ?? true,
        orderIndex: tc.orderIndex || index + 1,
      })),
    };
  }

  return await prisma.problem.update({
    where: { id },
    data: {
      ...(title && { title, slug: `${slugify(title)}-${Date.now().toString().slice(-4)}` }),
      ...(description && { description }),
      ...(difficulty && { difficulty }),
      ...(timeLimit !== undefined && { timeLimit: Number(timeLimit) }),
      ...(memoryLimit !== undefined && { memoryLimit: Number(memoryLimit) }),
      ...(isActive !== undefined && { isActive }),
      ...(categoryUpdateData && { categories: categoryUpdateData }),
      ...(testcaseUpdateData && { testcases: testcaseUpdateData }),
    },
    include: {
      categories: { include: { category: true } },
      testcases: true,
    },
  });
};

// 🟢 5. Xóa bài tập (Transaction)
export const deleteProblemService = async (id: string) => {
  const existingProblem = await prisma.problem.findUnique({ where: { id } });
  if (!existingProblem) throw new Error('Bài tập không tồn tại');

  return await prisma.$transaction([
    prisma.problemCategory.deleteMany({ where: { problemId: id } }),
    prisma.testcase.deleteMany({ where: { problemId: id } }),
    prisma.roadmapProblem.deleteMany({ where: { problemId: id } }),
    prisma.problem.delete({ where: { id } }),
  ]);
};