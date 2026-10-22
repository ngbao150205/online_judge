import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { AuthRequest } from './auth.middleware.js';

export const rateLimitScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

export function rateLimit(scope: string, maximum: number, windowSeconds: number, identity: 'ip' | 'user' | 'email' = 'ip'): RequestHandler {
  return async (req: AuthRequest, res, next) => {
    if (!env.RATE_LIMIT_ENABLED) return next();
    const value = identity === 'user' ? req.user?.userId || req.ip || 'unknown'
      : identity === 'email' ? String(req.body?.email ?? '').trim().toLowerCase() : req.ip || 'unknown';
    const key = `rate:${scope}:${createHash('sha256').update(value).digest('hex')}`;
    try {
      const result = await redisClient.eval(rateLimitScript, 1, key, windowSeconds * 1000) as [number, number];
      if (Number(result[0]) > maximum) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil(Number(result[1]) / 1000)));
        return next(new AppError(429, 'Bạn gửi yêu cầu quá nhiều. Vui lòng thử lại sau.', 'RATE_LIMITED'));
      }
      next();
    } catch { next(new AppError(503, 'Không thể kiểm tra giới hạn yêu cầu', 'RATE_LIMIT_UNAVAILABLE')); }
  };
}

export const loginRateLimit = rateLimit('login-ip', 20, 900);
export const accountLoginRateLimit = rateLimit('login-email', 10, 900, 'email');
export const otpSendRateLimit = rateLimit('otp-send-ip', 10, 900);
export const otpEmailRateLimit = rateLimit('otp-send-email', 3, 900, 'email');
export const otpVerifyRateLimit = rateLimit('otp-verify-email', 5, 900, 'email');
export const executionRateLimit = rateLimit('execution-user', 30, 60, 'user');
