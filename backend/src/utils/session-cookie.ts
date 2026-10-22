import type { CookieOptions, Response } from 'express';
import type { Request } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'judge_session';

export function readSessionCookie(req: Pick<Request, 'headers'>): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  try { return decodeURIComponent(matches[0].slice(SESSION_COOKIE_NAME.length + 1)) || null; }
  catch { return null; }
}

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: env.SESSION_TTL_SECONDS * 1000,
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, options);
}
