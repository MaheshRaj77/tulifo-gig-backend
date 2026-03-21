/**
 * Worker Sync Utility
 *
 * Publishes worker profile changes via Redis Pub/Sub so that the
 * worker-service (MongoDB/Elasticsearch) can re-index search data.
 *
 * Usage (in user-service after profile update):
 *   import { publishWorkerUpdate } from '@tulifo/shared/worker-sync';
 *   await publishWorkerUpdate(userId, updatedProfileData);
 */
import Redis from 'ioredis';

const CHANNEL = 'worker:profile:updated';

let publisher: Redis | null = null;

export function initWorkerSync(): void {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[worker-sync] REDIS_URL not set — worker sync disabled');
    return;
  }

  try {
    publisher = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
    publisher.connect().catch(() => {
      console.warn('[worker-sync] Redis connection failed — sync disabled');
      publisher = null;
    });
  } catch {
    console.warn('[worker-sync] Redis init failed');
  }
}

export interface WorkerSyncPayload {
  userId: string;
  action: 'update' | 'create' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Publish a worker profile change event.
 * Non-blocking — failures are logged but don't break the main flow.
 */
export async function publishWorkerUpdate(
  userId: string,
  data: Record<string, unknown>,
  action: 'update' | 'create' | 'delete' = 'update'
): Promise<void> {
  if (!publisher) return;

  const payload: WorkerSyncPayload = {
    userId,
    action,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    await publisher.publish(CHANNEL, JSON.stringify(payload));
  } catch {
    // Non-blocking — search index may be slightly stale
    console.error('[worker-sync] Failed to publish update for', userId);
  }
}

/**
 * Subscribe to worker profile changes (for worker-service to consume).
 */
export function subscribeToWorkerUpdates(
  handler: (payload: WorkerSyncPayload) => void | Promise<void>
): void {
  const url = process.env.REDIS_URL;
  if (!url) return;

  const subscriber = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
  });

  subscriber.subscribe(CHANNEL).then(() => {
    console.log('[worker-sync] Subscribed to worker profile updates');
  });

  subscriber.on('message', async (_channel, message) => {
    try {
      const payload: WorkerSyncPayload = JSON.parse(message);
      await handler(payload);
    } catch (err) {
      console.error('[worker-sync] Error processing message:', err);
    }
  });
}
