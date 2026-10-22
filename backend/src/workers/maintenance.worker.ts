import { setTimeout as delay } from 'node:timers/promises';
import { env } from '../config/env.js';
import { cleanupExpiredSessions, dispatchOutboxBatch, reconcileSubmissions } from '../services/outbox.service.js';

export async function runMaintenanceWorker(signal: AbortSignal) {
  let lastCleanup = 0;
  while (!signal.aborted) {
    try {
      const dispatched = await dispatchOutboxBatch(signal);
      if (signal.aborted) break;
      await reconcileSubmissions();
      if (Date.now() - lastCleanup > 3600000) { await cleanupExpiredSessions(); lastCleanup = Date.now(); }
      if (dispatched === 10) continue;
    } catch (error) { console.error('[Maintenance] Sẽ thử lại:', error instanceof Error ? error.name : 'UnknownError'); }
    try { await delay(env.MAINTENANCE_INTERVAL_SECONDS * 1000, undefined, { signal }); } catch { break; }
  }
}
