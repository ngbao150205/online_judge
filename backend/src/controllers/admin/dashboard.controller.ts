import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';

// 🟢 1. THỐNG KÊ TỔNG SỐ HỌC VIÊN, BÀI TẬP, LỘ TRÌNH TỪ DATABASE
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalStudents, totalProblems, totalRoadmaps, submissionsToday] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.problem.count(),
      prisma.roadmap.count(),
      prisma.submission.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalProblems,
        totalRoadmaps,
        submissionsToday,
        activeWorkers: 8,
        totalWorkers: 12,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy thống kê hệ thống', error });
  }
};

// 🟢 2. LẤY DANH SÁCH LƯỢT NỘP BÀI MỚI NHẤT (LIVE FEED)
export const getLiveSubmissions = async (req: Request, res: Response) => {
  try {
    const recentSubmissions = await prisma.submission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        problem: { select: { id: true, title: true } },
      },
    });

    const formattedFeed = recentSubmissions.map((sub: any) => ({
      id: `#SUB${sub.id}`,
      user: sub.user?.name || sub.user?.email || 'Student',
      problem: sub.problem?.title || 'P101',
      lang: sub.language || 'C++',
      result: sub.status || 'ACCEPTED',
      cpu: `${sub.totalTime || 0} ms`,
      time: new Date(sub.createdAt).toLocaleTimeString('vi-VN'),
    }));

    return res.status(200).json({ success: true, data: formattedFeed });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách nộp bài', error });
  }
};

// 🟢 3. TRẠNG THÁI CỤM WORKERS CHẤM BÀI
export const getWorkers = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: [
        { id: '1', name: 'Node #01 (Docker 1)', status: 'IDLE', cpuUsage: 18.2, ramUsage: '1.2 GB/4GB' },
        { id: '2', name: 'Node #02 (Docker 2)', status: 'BUSY', cpuUsage: 64.5, ramUsage: '2.4 GB/4GB' },
      ],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy trạng thái workers', error });
  }
};

// 🟢 4. CẢNH BÁO HỆ THỐNG
export const getAlerts = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: [
        { id: '1', type: 'WARNING', title: 'Cảnh báo Bài tập (High TLE)', message: 'Bài toán p205 có tỷ lệ TLE vượt 40%.' },
        { id: '2', type: 'INFO', title: 'Auto-scaling Kích hoạt', message: 'Tự động kích hoạt thêm +2 Worker Nodes.' },
      ],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách cảnh báo', error });
  }
};

// 🟢 5. PHÂN BỔ KẾT QUẢ CHẤM BÀI
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        acPercent: 64.2, acCount: 3094,
        waPercent: 22.1, waCount: 1065,
        tlePercent: 8.4, tleCount: 405,
        cePercent: 5.3, ceCount: 256,
        storageUsedGb: 42.8,
        storageTotalGb: 100,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy phân tích dữ liệu', error });
  }
};

// 🟢 6. LẤY DANH SÁCH TẤT CẢ NGƯỜI DÙNG
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error });
  }
};