import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/app-error.js';

export function validate(schema: ZodType, source: 'body' | 'query' | 'params'): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(new AppError(400, 'Dữ liệu đầu vào không hợp lệ', 'VALIDATION_ERROR',
        parsed.error.issues.map(issue => ({ field: [source, ...issue.path].join('.'), message: issue.message })),
      ));
    }
    // Express 5 query is a getter; validate it without overwriting it.
    // Normalized bodies are passed to the existing controllers.
    if (source === 'body') req.body = parsed.data;
    next();
  };
}

export const validateBody = (schema: ZodType) => validate(schema, 'body');
export const validateQuery = (schema: ZodType) => validate(schema, 'query');
export const validateParams = (schema: ZodType) => validate(schema, 'params');
