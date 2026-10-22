// src/app.ts
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

import apiRoutes from './routes/index.js';
import prisma from './config/db.js';
import { redisClient } from './config/redis.js';
import { env } from './config/env.js';



export function createApp() {
  const app = express();

  // 1. Cho phép Frontend React truy cập API
  const origins = new Set(env.CORS_ORIGINS.split(',').map(origin => origin.trim()));
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use(cors({ credentials: true, origin: (origin, callback) => callback(null, !origin || origins.has(origin)) }));
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless"); // Hoặc dùng "require-corp" nếu cần chặt chẽ hơn
    next();
  });
  app.set('etag', false);
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    try {
      await Promise.all([prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  // Route groups and access rules are composed in routes/index.ts.
  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp;
