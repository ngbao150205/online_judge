import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';
import { slugify } from '../utils/slugify';
import { Difficulty } from '@prisma/client';

// Type helper cho dữ liệu testcase đầu vào
interface TestCaseInput {
  inputData: string;
  expectedOutput: string;
  isHidden?: boolean;
  orderIndex?: number;
}

// 🟢 1. TẠO BÀI TẬP MỚI (BẮT BUỘC CÓ ÍT NHẤT 1 CATEGORY)
export const createProblem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      difficulty,
      timeLimit,
      memoryLimit,
      isActive,
      categoryIds, // Array string UUIDs: ["cat-id-1", "cat-id-2"]
      testcases,   // Array objects: [{ inputData, expectedOutput, isHidden, orderIndex }]
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin tiêu đề hoặc mô tả' });
    }

    // 🛑 Kiểm tra bắt buộc truyền ít nhất 1 Category
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bài tập bắt buộc phải thuộc ít nhất một danh mục (Category)',
      });
    }

    // 🛑 Kiểm tra xem các categoryIds truyền lên có tồn tại trong DB không
    const validCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (validCategories.length !== categoryIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Một hoặc nhiều danh mục được chọn không tồn tại',
      });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

    const newProblem = await prisma.problem.create({
      data: {
        title,
        slug,
        description,
        difficulty: (difficulty as Difficulty) || Difficulty.MEDIUM,
        timeLimit: timeLimit || 1000,
        memoryLimit: memoryLimit || 256,
        isActive: isActive !== undefined ? isActive : true,

        // Liên kết bắt buộc với bảng trung gian ProblemCategory
        categories: {
          create: categoryIds.map((catId: string) => ({
            categoryId: catId,
          })),
        },

        // Tạo danh sách Testcase ban đầu
        testcases: testcases && testcases.length > 0 ? {
          create: testcases.map((tc: TestCaseInput, index: number) => ({
            inputData: tc.inputData,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
            orderIndex: tc.orderIndex || index + 1,
          })),
        } : undefined,
      },
      include: {
        categories: { include: { category: true } },
        testcases: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo bài tập thành công',
      data: newProblem,
    });
  } catch (error) {
    console.error('Lỗi createProblem:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo bài tập', error });
  }
};

// 🟢 2. XEM DANH SÁCH BÀI TẬP DÀNH CHO ADMIN
export const getAdminProblems = async (req: AuthRequest, res: Response) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        isActive: true,
        timeLimit: true,
        memoryLimit: true,
        categories: {
          select: { category: { select: { id: true, name: true } } },
        },
        _count: {
          select: { testcases: true, submissions: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return res.status(200).json({ success: true, data: problems });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách bài tập', error });
  }
};

// 🟢 3. XEM CHI TIẾT BÀI TẬP (Bao gồm cả Testcase ẩn dành cho Admin)
export const getAdminProblemDetail = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        testcases: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error });
  }
};

// 🟢 4. CẬP NHẬT BÀI TẬP
export const updateProblem = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, difficulty, timeLimit, memoryLimit, isActive, categoryIds } = req.body;

    const existingProblem = await prisma.problem.findUnique({ where: { id } });
    if (!existingProblem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }

    // 🛑 Nếu người dùng truyền categoryIds lên để cập nhật, kiểm tra ràng buộc không được rỗng
    let categoryUpdateData;
    if (categoryIds !== undefined) {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Bài tập bắt buộc phải thuộc ít nhất một danh mục (Category)',
        });
      }

      const validCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });

      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Một hoặc nhiều danh mục được chọn không tồn tại',
        });
      }

      categoryUpdateData = {
        deleteMany: {}, // Xóa liên kết cũ
        create: categoryIds.map((catId: string) => ({ categoryId: catId })), // Tạo liên kết mới
      };
    }

    const updatedProblem = await prisma.problem.update({
      where: { id },
      data: {
        ...(title && { title, slug: `${slugify(title)}-${Date.now().toString().slice(-4)}` }),
        ...(description && { description }),
        ...(difficulty && { difficulty }),
        ...(timeLimit && { timeLimit }),
        ...(memoryLimit && { memoryLimit }),
        ...(isActive !== undefined && { isActive }),
        ...(categoryUpdateData && { categories: categoryUpdateData }),
      },
      include: {
        categories: { include: { category: true } },
        testcases: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bài tập thành công',
      data: updatedProblem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật', error });
  }
};

// 🟢 5. XÓA BÀI TẬP
export const deleteProblem = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.problem.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Xóa bài tập thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi xóa bài tập', error });
  }
};