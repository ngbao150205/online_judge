import type { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { AppError } from '../errors/app-error.js';

export type ControllerRequest<Body = unknown> = Request<Record<string, string>, unknown, Body>
  & Pick<AuthRequest, 'user'>;

export function currentUserId(req: Pick<AuthRequest, 'user'>): string {
  if (!req.user) throw new AppError(401, 'Bạn cần đăng nhập để thực hiện thao tác này', 'UNAUTHENTICATED');
  return req.user.userId;
}

export function sendSuccess(res: Response, payload: Record<string, unknown> = {}, status = 200): void {
  res.status(status).json({ success: true, ...payload });
}
