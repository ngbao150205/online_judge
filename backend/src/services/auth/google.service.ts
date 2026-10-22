import { issueSession } from './session.service.js';
import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function googleLoginService(credential: string, acceptedTerms: boolean) {
    if (!credential) {
        throw new AppError(400, 'Không tìm thấy Google Credential Token', 'INVALID_INPUT');
    }
    // Verify Token trực tiếp với Google
    if (!env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google Login chưa được cấu hình', 'GOOGLE_UNAVAILABLE');
    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
        throw new AppError(401, 'Xác thực Google thất bại hoặc Email không hợp lệ', 'INVALID_GOOGLE_CREDENTIAL');
    }
    const { email, name } = payload;
    const normalizedEmail = email.trim().toLowerCase();
    // Tìm người dùng trong DB
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    // Nếu chưa có -> Tự động tạo tài khoản mới
    if (!user) {
        if (!acceptedTerms) throw new AppError(400, 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật', 'TERMS_REQUIRED');
        user = await prisma.user.create({
            data: {
                name: name || 'Google User',
                email: normalizedEmail,
                pwd: '', // Để rỗng đánh dấu tài khoản dùng OAuth
                role: 'STUDENT',
                termsAcceptedAt: new Date(),
                termsVersion: env.TERMS_VERSION,
            },
        });
    } else if (!user.termsAcceptedAt && acceptedTerms) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { termsAcceptedAt: new Date(), termsVersion: env.TERMS_VERSION },
        });
    }
    const token = await issueSession(user);
    const { pwd, resetPasswordToken, resetPasswordExpires, tokenVersion, deletedAt, termsAcceptedAt, termsVersion, ...userWithoutPwd } = user;
    return { token, user: userWithoutPwd };
}
