import { AppError } from '../errors/app-error.js';
import prisma from '../config/db.js';
import { hashPassword } from '../utils/auth.js';
import type { Prisma, Role } from '@prisma/client';
export interface CreateUserInput {
    name: string;
    email: string;
    pwd?: string;
    role?: Role;
}
export interface UpdateUserInput {
    name?: string;
    email?: string;
    pwd?: string;
    role?: Role;
}
export async function getAllStudentsAdminService() {
    return await prisma.user.findMany({
        where: { role: 'STUDENT', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { submissions: true },
            },
        },
    });
}
export async function createStudentAdminService(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser) {
        throw new AppError(409, 'Email đã tồn tại trên hệ thống', 'EMAIL_ALREADY_EXISTS');
    }
    if (!data.pwd) throw new AppError(400, 'Cần cấp mật khẩu riêng cho tài khoản mới', 'PASSWORD_REQUIRED');
    const hashedPassword = await hashPassword(data.pwd);
    return await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            pwd: hashedPassword,
            role: data.role || 'STUDENT',
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { submissions: true },
            },
        },
    });
}
export async function updateStudentAdminService(userId: string, data: UpdateUserInput) {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser || existingUser.deletedAt) {
        throw new AppError(404, 'Người dùng không tồn tại', 'USER_NOT_FOUND');
    }
    if (data.email && data.email !== existingUser.email) {
        const emailExist = await prisma.user.findUnique({ where: { email: data.email } });
        if (emailExist) {
            throw new AppError(409, 'Email đã tồn tại trên hệ thống', 'EMAIL_ALREADY_EXISTS');
        }
    }
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.email !== undefined)
        updateData.email = data.email;
    if (data.role !== undefined)
        updateData.role = data.role;
    if (data.pwd && data.pwd.trim() !== '') {
        updateData.pwd = await hashPassword(data.pwd);
        updateData.tokenVersion = { increment: 1 };
    }
    return await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { submissions: true },
            },
        },
    });
}
export async function deleteStudentAdminService(userId: string) {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser || existingUser.deletedAt) {
        throw new AppError(404, 'Người dùng không tồn tại', 'USER_NOT_FOUND');
    }
    await prisma.user.update({ where: { id: userId }, data: {
        // Keep the user row for submission history but release the unique email for a new account.
        email: `deleted+${userId}@deleted.invalid`,
        deletedAt: new Date(), tokenVersion: { increment: 1 }, resetPasswordToken: null, resetPasswordExpires: null,
    } });
}
