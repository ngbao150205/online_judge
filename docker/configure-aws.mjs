import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
const target = new URL('.env', root);
const importing = process.argv.includes('--from-backend');
const source = importing ? parseEnv(readFileSync(new URL('backend/.env', root), 'utf8'))
  : { ...parseEnv(readFileSync(target, 'utf8')), ...process.env };
function fail(field) { throw new Error(`Cấu hình AWS SQS không hợp lệ: ${field}. Không thay đổi .env.`); }
function queue(value, field) {
  try {
    const url = new URL(value);
    const host = /^sqs\.([a-z0-9-]+)\.amazonaws\.com(?:\.cn)?$/.exec(url.hostname);
    const path = /^\/(\d{12})\/([a-zA-Z0-9_-]{1,75})$/.exec(url.pathname);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port || !host || !path) fail(field);
    return { region: host[1], account: path[1] };
  } catch { fail(field); }
}
const jobs = queue(source.SQS_QUEUE_URL, 'SQS_QUEUE_URL');
const results = queue(source.RESULT_QUEUE_URL, 'RESULT_QUEUE_URL');
const region = source.AWS_REGION || jobs.region;
if (jobs.region !== region || results.region !== region || jobs.account !== results.account || source.SQS_QUEUE_URL === source.RESULT_QUEUE_URL) fail('AWS_REGION/queue URLs');
if (Boolean(source.AWS_ACCESS_KEY_ID) !== Boolean(source.AWS_SECRET_ACCESS_KEY)
    || source.AWS_ACCESS_KEY_ID === 'local' || source.AWS_SECRET_ACCESS_KEY === 'local') fail('AWS credentials');
if (!importing && source.SQS_ENDPOINT_URL) fail('SQS_ENDPOINT_URL must be empty');

if (importing) {
  let contents = readFileSync(target, 'utf8');
  const values = { AWS_REGION: region, SQS_ENDPOINT_URL: '', SQS_AUTO_CREATE: 'false' };
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'SQS_QUEUE_URL', 'RESULT_QUEUE_URL']) values[key] = source[key] || '';
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}='${value.replaceAll("'", "\\'")}'`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, () => line) : `${contents}\n${line}\n`;
  }
  writeFileSync(target, contents, { mode: 0o600 });
  chmodSync(target, 0o600);
  console.info('Đã chuyển cấu hình AWS từ backend/.env vào .env root; giữ database/JWT và không in secrets.');
} else {
  console.info(`AWS SQS config valid (${region}); credentials: ${source.AWS_ACCESS_KEY_ID ? 'environment' : 'SDK credential chain'}.`);
}
