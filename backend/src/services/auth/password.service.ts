import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
import { randomInt, createHmac } from 'node:crypto';

import { env } from '../../config/env.js';
import { hashPassword, comparePassword } from '../../utils/auth.js';
import { sendResetPasswordEmail } from '../../utils/emailService.js';

export const hashResetCode = (email: string, code: string) => createHmac('sha256', env.JWT_SECRET).update('reset-password\0' + email.trim().toLowerCase() + '\0' + code).digest('hex');

export async function forgotPasswordService(email?: string) {
    if (!email) {
        throw new AppError(400, 'Vui lòng nhập Email', 'INVALID_INPUT');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const message = 'Nếu email thuộc tài khoản đang hoạt động, hướng dẫn đặt lại mật khẩu sẽ được gửi nếu dịch vụ email sẵn sàng.';
    if (!user || user.deletedAt) return message;
    // Keep the same response for unknown accounts and unavailable email delivery.
    if (!env.SMTP_USER || !env.SMTP_PASS) return message;
    const resetToken = randomInt(0, 1000000).toString().padStart(6, '0');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // Hết hạn sau 15 phút
    await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
            resetPasswordToken: hashResetCode(normalizedEmail, resetToken),
            resetPasswordExpires,
        },
    });
    try {
      await sendResetPasswordEmail(user.email, resetToken);
    } catch {
      try {
        await prisma.user.updateMany({
          where: { id: user.id, resetPasswordToken: hashResetCode(normalizedEmail, resetToken) },
          data: { resetPasswordToken: null, resetPasswordExpires: null },
        });
      } catch {
        console.error('Password reset cleanup failed after email delivery error');
      }
      // Do not expose account existence or mail-provider state through this endpoint.
      console.error('Password reset email delivery failed');
    }
    return message;
}

export async function resetPasswordService(data: {
    token?: string;
    otp?: string;
    email?: string;
    newPassword?: string;
}) {
    const { token, otp, email, newPassword } = data;
    const code = otp || token;
    if (!code || !newPassword || !email) {
        throw new AppError(400, 'Vui lòng cung cấp Email, Mã xác nhận (6 số) và Mật khẩu mới', 'INVALID_INPUT');
    }
    if (newPassword.length < 6) {
        throw new AppError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự', 'INVALID_INPUT');
    }
    if (!/^\d{6}$/.test(code)) throw new AppError(400, 'Mã xác thực không hợp lệ', 'INVALID_RESET_CODE');
    const normalizedEmail = email.trim().toLowerCase();
    const digest = hashResetCode(normalizedEmail, code);
    const user = await prisma.user.findFirst({ where: {
      email: normalizedEmail, deletedAt: null, resetPasswordToken: digest, resetPasswordExpires: { gt: new Date() },
    } });
    if (!user) {
        throw new AppError(400, 'Mã xác thực không chính xác hoặc đã hết hạn', 'INVALID_RESET_CODE');
    }
    const hashedPassword = await hashPassword(newPassword);
    // Conditional update consumes the code once even for concurrent requests.
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, resetPasswordToken: digest, resetPasswordExpires: { gt: new Date() } },
      data: { pwd: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null, tokenVersion: { increment: 1 } },
    });
    if (!consumed.count) throw new AppError(400, 'Mã xác thực không chính xác hoặc đã hết hạn', 'INVALID_RESET_CODE');
    return 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.';
}

export async function changePasswordService(userId: string, data: {
    currentPassword?: string;
    oldPassword?: string;
    newPassword?: string;
}) {
    const currentPassword = data.currentPassword || data.oldPassword;
    const { newPassword } = data;
    if (!currentPassword || !newPassword) {
        throw new AppError(400, 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới', 'INVALID_INPUT');
    }
    if (newPassword.length < 6) {
        throw new AppError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự', 'INVALID_INPUT');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt)
        throw new AppError(404, 'Người dùng không tồn tại', 'USER_NOT_FOUND');
    // Khắc phục lỗi: Tài khoản tạo bằng Google chưa tạo mật khẩu
    if (!user.pwd || user.pwd === '') {
        throw new AppError(400, 'Tài khoản này đăng nhập bằng Google và chưa có mật khẩu. Vui lòng sử dụng tính năng "Quên mật khẩu" để tạo mật khẩu mới.', 'INVALID_INPUT');
    }
    const isMatch = await comparePassword(currentPassword, user.pwd);
    if (!isMatch)
        throw new AppError(400, 'Mật khẩu hiện tại không chính xác', 'INVALID_INPUT');
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: userId },
        data: { pwd: hashedPassword, tokenVersion: { increment: 1 } },
    });
    return 'Đổi mật khẩu thành công';
}
