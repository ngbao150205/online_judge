import { runMaintenanceWorker } from './workers/maintenance.worker.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeInfrastructure } from './config/shutdown.js';
import { runResultWorker } from './workers/result.worker.js';

const abort = new AbortController();
const server = createApp().listen(env.PORT, () => console.info(`[API] Listening on http://localhost:${env.PORT}`));
let stopping = false;
const worker = env.RESULT_WORKER_ENABLED ? Promise.all([runResultWorker(abort.signal), runMaintenanceWorker(abort.signal)]) : Promise.resolve();
if (env.RESULT_WORKER_ENABLED) console.info('[API] Result consumer and maintenance worker enabled in this process.');

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  abort.abort();
  const deadline = setTimeout(() => { console.error('[API] Shutdown timeout'); process.exit(1); }, 15000);
  deadline.unref();
  try {
    const httpStopped = new Promise<void>((resolve, reject) => server.close(error => error && !('code' in error && error.code === 'ERR_SERVER_NOT_RUNNING') ? reject(error) : resolve()));
    await Promise.all([httpStopped, worker]);
    await closeInfrastructure();
    clearTimeout(deadline);
  } catch {
    console.error('[API] Lỗi shutdown'); process.exitCode = 1;
    try { await closeInfrastructure(); clearTimeout(deadline); } catch { /* deadline terminates stuck connections */ }
  }
}

server.on('error', () => { console.error('[API] Không thể mở HTTP server'); void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });
