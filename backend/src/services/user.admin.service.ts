import prisma from '../config/db';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

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

export const getAllStudentsAdminService = async () => {
  return await prisma.user.findMany({
    where: { role: 'STUDENT' },
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
};

export const createStudentAdminService = async (data: CreateUserInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(data.pwd || '12345678', 10);

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
};

export const updateStudentAdminService = async (userId: string, data: UpdateUserInput) => {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new Error('USER_NOT_FOUND');
  }

  if (data.email && data.email !== existingUser.email) {
    const emailExist = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExist) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.pwd && data.pwd.trim() !== '') {
    updateData.pwd = await bcrypt.hash(data.pwd, 10);
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
};

export const deleteStudentAdminService = async (userId: string) => {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new Error('USER_NOT_FOUND');
  }

  await prisma.user.delete({
    where: { id: userId },
  });
};