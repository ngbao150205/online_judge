import prisma from '../config/db';
import { Difficulty } from '@prisma/client';

export interface GetProblemsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  difficulty?: Difficulty;
}

export class ProblemStudentService {
  // 🟢 1. Lấy danh sách bài tập + Phân trang
  static async getPublicProblems(
  params: GetProblemsParams,
  userId?: string
) {
    const page = params.page || 1;
    const limit = params.limit || 100;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      isActive: true,
    };

    if (params.search) {
      whereCondition.title = {
        contains: params.search,
        mode: 'insensitive',
      };
    }

    if (params.difficulty) {
      whereCondition.difficulty = params.difficulty;
    }

    if (params.categoryId) {
      whereCondition.categories = {
        some: { categoryId: params.categoryId },
      };
    }

    let solvedProblemIds = new Set<string>();

    if (userId) {
      const solved = await prisma.submission.findMany({
        where: {
          userId,
          status: 'ACCEPTED',
        },
        select:{
          problemId:true,
        },
        distinct:['problemId'],
      });


      solvedProblemIds = new Set(
        solved.map(
          s => s.problemId
        )
      );
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where: whereCondition,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          timeLimit: true,
          memoryLimit: true,
          categories: {
            select: { category: { select: { id: true, name: true } } },
          },
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { title: 'asc' },
      }),
      prisma.problem.count({ where: whereCondition }),
    ]);

    return {
      problems: problems.map(problem => ({
      ...problem,

      isSolved:
        solvedProblemIds.has(problem.id),

    })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🟢 2. Lấy chi tiết bài tập theo Slug
  static async getPublicProblemDetail(slug: string) {
    return await prisma.problem.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        timeLimit: true,
        memoryLimit: true,
        categories: {
          select: { category: { select: { id: true, name: true } } },
        },
        testcases: {
          where: { isHidden: false },
          select: {
            id: true,
            inputData: true,
            expectedOutput: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }
}