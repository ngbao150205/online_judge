import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import { Prisma } from '@prisma/client';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'Endpoint không tồn tại', 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false, message: error.message, code: error.code,
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }

  // Handle database conflicts/not-found consistently, without exposing raw metadata.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = {
      P2002: { status: 409, code: 'RECORD_CONFLICT', message: 'Dữ liệu đã tồn tại' },
      P2025: { status: 404, code: 'RECORD_NOT_FOUND', message: 'Dữ liệu không tồn tại' },
      P2003: { status: 409, code: 'RELATION_CONFLICT', message: 'Dữ liệu liên kết không hợp lệ hoặc còn được sử dụng' },
    }[error.code];
    if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message, code: mapped.code });
  }

  // Only recognize known parser errors; never expose arbitrary exception messages.
  const parserType = typeof error === 'object' && error !== null && 'type' in error
    ? error.type : undefined;
  if (parserType === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON không hợp lệ', code: 'INVALID_JSON' });
  }
  if (parserType === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request vượt giới hạn dung lượng', code: 'PAYLOAD_TOO_LARGE' });
  }
  if (parserType === 'charset.unsupported' || parserType === 'encoding.unsupported') {
    return res.status(415).json({ success: false, message: 'Encoding request không được hỗ trợ', code: 'UNSUPPORTED_ENCODING' });
  }

  // Error messages may themselves contain connection strings or user data.
  console.error('[API Error]', error instanceof Error ? error.name : 'UnknownError');
  return res.status(500).json({ success: false, message: 'Lỗi hệ thống', code: 'INTERNAL_ERROR' });
};
