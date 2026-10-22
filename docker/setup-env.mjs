import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, '.env');
if (existsSync(target)) {
  console.info('.env đã tồn tại; giữ nguyên cấu hình.');
} else {
  const previous = path.join(root, 'backend/.env');
  if (existsSync(previous)) process.loadEnvFile(previous);
  const values = {
    JWT_SECRET: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
    POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  };
  if (process.env.DATABASE_URL) {
    const database = new URL(process.env.DATABASE_URL);
    values.POSTGRES_USER = decodeURIComponent(database.username);
    values.POSTGRES_PASSWORD = decodeURIComponent(database.password);
    values.POSTGRES_DB = database.pathname.slice(1);
  }
  for (const key of ['GOOGLE_CLIENT_ID', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) {
    if (process.env[key]) values[key] = process.env[key];
  }
  for (const key of ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'SQS_QUEUE_URL', 'RESULT_QUEUE_URL']) {
    if (process.env[key]) values[key] = process.env[key];
  }
  let contents = readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const quoted = "'" + value.replaceAll("'", "\\'") + "'";
    contents = contents.replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}=${quoted}`);
  }
  writeFileSync(target, contents, { mode: 0o600, flag: 'wx' });
  console.info('Đã tạo .env (quyền 600), giữ cấu hình hiện có nếu tìm thấy backend/.env. Kiểm tra AWS SQS trước triển khai.');
}
