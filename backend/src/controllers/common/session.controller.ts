import type { Response } from 'express';
import type { ControllerRequest } from '../controller.utils.js';
import { currentUserId, sendSuccess } from '../controller.utils.js';
import { logoutSession, logoutAllSessions } from '../../services/auth/session.service.js';
import { clearSessionCookie, readSessionCookie } from '../../utils/session-cookie.js';
import { verifyToken } from '../../utils/auth.js';

export async function logout(req: ControllerRequest, res: Response) {
  const token = readSessionCookie(req);
  if (token) {
    let claims: ReturnType<typeof verifyToken> | undefined;
    try {
      claims = verifyToken(token);
    } catch {
      // An expired or already-revoked cookie still needs to be cleared in the browser.
    }
    if (claims && typeof claims !== 'string' && typeof claims.userId === 'string' && typeof claims.jti === 'string') {
      try { await logoutSession(claims.userId, claims.jti); }
      catch { console.error('Session revocation failed during logout'); }
    }
  }
  clearSessionCookie(res);
  sendSuccess(res);
}
export async function logoutAll(req: ControllerRequest, res: Response) {
  await logoutAllSessions(currentUserId(req));
  clearSessionCookie(res);
  sendSuccess(res);
}
