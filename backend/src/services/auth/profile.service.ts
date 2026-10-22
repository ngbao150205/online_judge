import prisma from '../../config/db.js';
import { AppError } from '../../errors/app-error.js';


export async function getMeService(userId?: string) {
    if (!userId) {
        throw new AppError(401, 'Không tìm thấy thông tin xác thực', 'UNAUTHENTICATED');
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
        throw new AppError(404, 'Người dùng không tồn tại', 'USER_NOT_FOUND');
    }
    return user;
}

export async function updateProfileService(userId: string, name: string) {
    if (!name || !name.trim()) {
        throw new AppError(400, 'Họ và tên không được để trống', 'INVALID_INPUT');
    }
    return await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
}
