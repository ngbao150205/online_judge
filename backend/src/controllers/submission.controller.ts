import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';
import { SubmissionStatus } from '@prisma/client';

// 🟢 NỘP BÀI LÀM (Yêu cầu đăng nhập)
export const submitCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId, language, sourceCode } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    if (!problemId || !language || !sourceCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã bài tập, ngôn ngữ hoặc mã nguồn' });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId as string },
    });

    if (!problem || !problem.isActive) {
      return res.status(404).json({ success: false, message: 'Bài tập không tồn tại hoặc đã đóng' });
    }

    // Tạo bản ghi Submission ở trạng thái PENDING
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        language,
        sourceCode,
        status: SubmissionStatus.PENDING,
      },
    });

    // TODO: Gửi submission.id vào Message Queue (RabbitMQ / Redis BullMQ) để Judge Engine chấm điểm

    return res.status(201).json({
      success: true,
      message: 'Nộp bài thành công, hệ thống đang xử lý chấm điểm',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi nộp bài', error });
  }
};

// 🟢 LẤY LỊCH SỬ NỘP BÀI CỦA CHÍNH HỌC VIÊN
export const getMySubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const submissions = await prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        language: true,
        status: true,
        totalTime: true,
        maxMemory: true,
        createdAt: true,
        problem: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử nộp bài', error });
  }
};