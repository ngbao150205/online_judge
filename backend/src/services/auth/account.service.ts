import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
import { hashPassword, comparePassword } from '../../utils/auth.js';
import { env } from '../../config/env.js';
import { issueSession } from './session.service.js';

export async function registerService(data: {
    name?: string;
    email?: string;
    password?: string;
    acceptedTerms?: boolean;
}) {
    const { name, email, password, acceptedTerms } = data;
    if (!name || !email || !password) {
        throw new AppError(400, 'Vui lòng nhập đầy đủ Name, Email và Password', 'INVALID_INPUT');
    }
    if (acceptedTerms !== true) {
        throw new AppError(400, 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật', 'TERMS_REQUIRED');
    }
    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
        throw new AppError(409, 'Email này đã tồn tại trên hệ thống', 'EMAIL_ALREADY_EXISTS');
    }
    const hashedPassword = await hashPassword(password);
    return prisma.user.create({
        data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            pwd: hashedPassword,
            role: 'STUDENT',
            termsAcceptedAt: new Date(),
            termsVersion: env.TERMS_VERSION,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
}

export async function loginService(data: {
    email?: string;
    password?: string;
}) {
    const { email, password } = data;
    if (!email || !password) {
        throw new AppError(400, 'Vui lòng điền Email và Mật khẩu', 'INVALID_INPUT');
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.deletedAt) {
        throw new AppError(401, 'Email hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }
    // Khắc phục lỗi: Tài khoản Google không có mật khẩu đăng nhập bằng form thường
    if (!user.pwd || user.pwd === '') {
        throw new AppError(400, 'Tài khoản này được tạo qua Google. Vui lòng chọn "Đăng nhập bằng Google"', 'INVALID_INPUT');
    }
    const isPasswordValid = await comparePassword(password, user.pwd);
    if (!isPasswordValid) {
        throw new AppError(401, 'Email hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }
    const token = await issueSession(user);
    const { pwd, resetPasswordToken, resetPasswordExpires, tokenVersion, deletedAt, termsAcceptedAt, termsVersion, ...userWithoutPwd } = user;
    return { token, user: userWithoutPwd };
}
