import { randomUUID } from 'node:crypto';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { generateToken } from '../../utils/auth.js';
import { AppError } from '../../errors/app-error.js';

export async function issueSession(user: { id: string; role: string; tokenVersion: number; deletedAt?: Date | null }) {
  if (user.deletedAt) throw new AppError(401, 'Tài khoản không hoạt động', 'INVALID_CREDENTIALS');
  const id = randomUUID();
  await prisma.authSession.create({ data: {
    id, userId: user.id, tokenVersion: user.tokenVersion,
    expiresAt: new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000),
  } });
  return generateToken({ userId: user.id, role: user.role, sessionId: id, tokenVersion: user.tokenVersion });
}

export async function readSession(userId: string, sessionId: string, tokenVersion: number) {
  const session = await prisma.authSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, role: true, tokenVersion: true, deletedAt: true } } },
  });
  if (!session || session.user.deletedAt || session.tokenVersion !== tokenVersion || session.user.tokenVersion !== tokenVersion) {
    throw new AppError(401, 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi', 'SESSION_REVOKED');
  }
  return session.user;
}

export async function logoutSession(userId: string, sessionId: string) {
  if (!sessionId) throw new AppError(401, 'Thiếu phiên đăng nhập', 'SESSION_REVOKED');
  await prisma.authSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function logoutAllSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}
