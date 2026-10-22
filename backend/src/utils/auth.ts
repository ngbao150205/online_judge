import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const JWT_SECRET = env.JWT_SECRET;
const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (payload: { userId: string; role: string; sessionId?: string; tokenVersion?: number }): string => {
  const { sessionId, ...claims } = payload;
  return jwt.sign({ ...claims, tokenVersion: payload.tokenVersion ?? 0 }, JWT_SECRET, {
    expiresIn: env.SESSION_TTL_SECONDS, jwtid: sessionId ?? randomUUID(), algorithm: 'HS256',
  });
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
};
