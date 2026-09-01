// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendResetPasswordEmail } from '../utils/emailService';

// ================= 1. ĐĂNG KÝ (REGISTER) =================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Name, Email và Password' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email này đã tồn tại trên hệ thống' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        pwd: hashedPassword,
        role: 'STUDENT',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: { token, user },
    });
  } catch (error) {
    console.error('LỖI REGISTER CHI TIẾT:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error });
  }
};

// ================= 2. ĐĂNG NHẬP (LOGIN) =================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền Email và Mật khẩu' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const isPasswordValid = await comparePassword(password, user.pwd);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    const { pwd, ...userWithoutPwd } = user;

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { token, user: userWithoutPwd },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error });
  }
};

// ================= 3. LẤY THÔNG TIN CÁ NHÂN (GET ME) =================
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error });
  }
};

// ================= 4. YÊU CẦU ĐẶT LẠI MẬT KHẨU (FORGOT PASSWORD) =================
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email này không tồn tại trên hệ thống' });
    }

    // Tạo token xác thực ngẫu nhiên và thiết lập thời gian hết hạn (15 phút)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Lưu thông tin Token vào Database
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    // Gửi email chứa link kích hoạt
    await sendResetPasswordEmail(user.email, resetToken);

    return res.json({
      success: true,
      message: 'Link xác thực đã được gửi đến Email của bạn. Vui lòng kiểm tra hộp thư!',
    });
  } catch (error) {
    console.error('LỖI FORGOT PASSWORD:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi gửi mail xác thực', error });
  }
};

// ================= 5. XÁC THỰC VÀ ĐẶT LẠI MẬT KHẨU MỚI (RESET PASSWORD) =================
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Token và Mật khẩu mới' });
    }

    // Kiểm tra token có khớp và còn hiệu lực không
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await hashPassword(newPassword);

    // Cập nhật mật khẩu mới và hủy bỏ token cũ
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pwd: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.',
    });
  } catch (error) {
    console.error('LỖI RESET PASSWORD:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu', error });
  }
};