import { Request, Response } from 'express';
import prisma from '../../config/db';

export const getWorkspaceDetail = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const problem = await prisma.problem.findFirst({
      where: { 
        slug: slug as string,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        timeLimit: true,
        memoryLimit: true,
        description: true,
        // 🟢 Lấy danh sách testcase công khai (isHidden: false)
        testcases: {
          where: {
            isHidden: false,
          },
          orderBy: {
            orderIndex: 'asc',
          },
          select: {
            id: true,
            inputData: true,
            expectedOutput: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Bài tập không tồn tại' });
    }

    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    console.error('Lỗi getWorkspaceDetail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu Workspace', error });
  }
};