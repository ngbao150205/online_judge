import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Difficulty } from '@prisma/client';

// 🟢 1. LẤY DANH SÁCH BÀI TẬP (Có tìm kiếm, lọc theo Danh mục, Độ khó & Phân trang)
export const getPublicProblems = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { search, categoryId, difficulty } = req.query;

    const whereCondition: any = {
      isActive: true, // Chỉ lấy bài tập đang hiển thị
    };

    if (search) {
      whereCondition.title = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    if (difficulty) {
      whereCondition.difficulty = difficulty as Difficulty;
    }

    if (categoryId) {
      whereCondition.categories = {
        some: { categoryId: categoryId as string },
      };
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

    return res.status(200).json({
      success: true,
      data: problems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách bài tập', error });
  }
};

// 🟢 2. XEM CHI TIẾT BÀI TẬP THEO SLUG (Bảo mật: Ẩn tuyệt đối Testcase ẩn)
export const getPublicProblemDetail = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    const problem = await prisma.problem.findFirst({
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
        // 🛑 BẮT BUỘC: Chỉ lấy các Testcase mẫu (isHidden = false)
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

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Bài tập không tồn tại hoặc đã dừng mở' });
    }

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết bài tập', error });
  }
};