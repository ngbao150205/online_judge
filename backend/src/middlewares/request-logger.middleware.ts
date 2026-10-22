import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  // Capture path only: omit headers, body and query strings containing credentials.
  const { method, path } = req;
  res.on('finish', () => {
    console.info(`[HTTP] ${method} ${path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
};
