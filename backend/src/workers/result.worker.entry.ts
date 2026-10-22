import { runMaintenanceWorker } from './maintenance.worker.js';
import { env } from '../config/env.js';
import { closeInfrastructure } from '../config/shutdown.js';
import { runResultWorker } from './result.worker.js';

if (!env.RESULT_QUEUE_URL) {
  console.error('[Worker] Cần cấu hình RESULT_QUEUE_URL');
  await closeInfrastructure();
  process.exitCode = 1;
} else {
  const abort = new AbortController();
  process.once('SIGTERM', () => abort.abort());
  process.once('SIGINT', () => abort.abort());
  try { await Promise.all([runResultWorker(abort.signal), runMaintenanceWorker(abort.signal)]); }
  finally { await closeInfrastructure(); }
}
