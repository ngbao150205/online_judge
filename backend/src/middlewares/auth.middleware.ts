import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { verifyToken } from '../utils/auth.js';
import { AppError } from '../errors/app-error.js';
import { readSession } from '../services/auth/session.service.js';
import { readSessionCookie } from '../utils/session-cookie.js';

const claimsSchema = z.object({
  userId: z.uuid(), role: z.enum(['STUDENT', 'ADMIN']), exp: z.number().int().positive(),
  jti: z.uuid(), tokenVersion: z.number().int().nonnegative(),
});
export interface AuthRequest extends Request {
  user?: { userId: string; role: 'STUDENT' | 'ADMIN'; sessionId?: string };
}

export const authenticate: RequestHandler = async (req: AuthRequest, _res, next) => {
  const token = readSessionCookie(req);
  if (!token) {
    return next(new AppError(401, 'Bạn cần đăng nhập để thực hiện thao tác này', 'UNAUTHENTICATED'));
  }
  let claims;
  try {
    claims = claimsSchema.safeParse(verifyToken(token));
    if (!claims.success) throw new Error('Invalid authentication claims');
  } catch {
    return next(new AppError(401, 'Token hết hạn hoặc không hợp lệ', 'INVALID_TOKEN'));
  }
  try {
    const user = await readSession(claims.data.userId, claims.data.jti, claims.data.tokenVersion);
    req.user = { userId: user.id, role: user.role, sessionId: claims.data.jti };
  } catch (error) { return next(error); }
  // Keep downstream errors outside the token-verification catch block.
  next();
};
export const authorize = (...allowedRoles: Array<'STUDENT' | 'ADMIN'>): RequestHandler => {
  return (req: AuthRequest, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Bạn cần đăng nhập để thực hiện thao tác này', 'UNAUTHENTICATED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'Bạn không có quyền truy cập tài nguyên này', 'FORBIDDEN'));
    }
    next();
  };
};

// Compatibility export; authorization has one implementation.
export const authorizeAdmin = authorize('ADMIN');
