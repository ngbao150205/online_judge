import 'dotenv/config';
import { z } from 'zod';

const optionalText = z.preprocess(value => value === '' ? undefined : value, z.string().optional());
const optionalUrl = z.preprocess(value => value === '' ? undefined : value, z.url().optional());
const environmentSchema = z.object({
  DATABASE_URL: z.url().refine(value => /^postgres(ql)?:/.test(value), 'Phải là PostgreSQL URL'),
  JWT_SECRET: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(604800).default(604800),
  TERMS_VERSION: z.string().trim().min(1).default('v1'),
  SUBMISSION_TIMEOUT_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
  MAINTENANCE_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(300).default(5),
  WORKER_OFFLINE_SECONDS: z.coerce.number().int().min(20).max(300).default(45),
  SQS_AUTO_CREATE: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  AI_API_URL: optionalUrl,
  AI_API_KEY: optionalText,
  AI_MODEL: optionalText,
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(20000),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  REDIS_URL: z.url().default('redis://localhost:6379'),
  RUN_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(3600),
  RESULT_WORKER_ENABLED: z.enum(['true', 'false', '1', '0']).default('true').transform(value => value === 'true' || value === '1'),
  SQS_QUEUE_URL: optionalUrl, RESULT_QUEUE_URL: optionalUrl,
  SQS_ENDPOINT_URL: optionalUrl,
  AWS_REGION: z.string().min(1).default('ap-southeast-1'),
  AWS_ACCESS_KEY_ID: optionalText, AWS_SECRET_ACCESS_KEY: optionalText, AWS_SESSION_TOKEN: optionalText,
  GOOGLE_CLIENT_ID: optionalText,
  SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: optionalText, SMTP_PASS: optionalText,
}).refine(data => Boolean(data.AWS_ACCESS_KEY_ID) === Boolean(data.AWS_SECRET_ACCESS_KEY), {
  message: 'AWS credentials phải có đủ hai trường', path: ['AWS_ACCESS_KEY_ID'],
});

export function readEnvironment(input: NodeJS.ProcessEnv = process.env) {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    // Never echo secret values or URLs in configuration errors.
    throw new Error(`Cấu hình môi trường không hợp lệ: ${[...new Set(parsed.error.issues.map(issue => issue.path.join('.')))].join(', ')}`);
  }
  if (parsed.data.CORS_ORIGINS.split(',').some(origin => {
    try { const url = new URL(origin.trim()); return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin.trim(); }
    catch { return true; }
  })) throw new Error('Cấu hình môi trường không hợp lệ: CORS_ORIGINS');
  if (input.NODE_ENV === 'production' && !parsed.data.RATE_LIMIT_ENABLED) {
    throw new Error('Cấu hình môi trường không hợp lệ: RATE_LIMIT_ENABLED');
  }
  return parsed.data;
}

export const env = readEnvironment();
