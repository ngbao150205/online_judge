import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { SubmissionStatus } from '@prisma/client';

// 🟢 1. LẤY THÔNG TIN HỒ SƠ (Tự động thống kê theo Role)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // 📊 Thống kê dành riêng cho SINH VIÊN
    if (user.role === 'STUDENT') {
      const totalSubmissions = await prisma.submission.count({
        where: { userId },
      });

      const acceptedSubmissions = await prisma.submission.count({
        where: { userId, status: SubmissionStatus.ACCEPTED },
      });

      // Đếm số lượng bài tập UNIQUE đã giải thành công
      const solvedProblems = await prisma.submission.findMany({
        where: { userId, status: SubmissionStatus.ACCEPTED },
        distinct: ['problemId'],
        select: { problemId: true },
      });

      const acceptanceRate = totalSubmissions > 0 
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100) 
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          stats: {
            totalSubmissions,
            acceptedSubmissions,
            solvedCount: solvedProblems.length,
            acceptanceRate: `${acceptanceRate}%`,
          },
        },
      });
    }

    // 📊 Thống kê dành riêng cho ADMIN
    if (user.role === 'ADMIN') {
      const [totalProblems, totalCategories, totalUsers, totalSystemSubmissions] = await Promise.all([
        prisma.problem.count(),
        prisma.category.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.submission.count(),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          stats: {
            totalProblemsManaged: totalProblems,
            totalCategoriesManaged: totalCategories,
            totalStudents: totalUsers,
            totalSystemSubmissions,
          },
        },
      });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin hồ sơ', error });
  }
};

// 🟢 2. CẬP NHẬT THÔNG TIN CÁ NHÂN (Name,...)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Tên hiển thị không được để trống' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật hồ sơ', error });
  }
};

// 🟢 3. ĐỔI MẬT KHẨU
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.pwd);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
    }

    // Mã hóa và lưu mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { pwd: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu', error });
  }
};