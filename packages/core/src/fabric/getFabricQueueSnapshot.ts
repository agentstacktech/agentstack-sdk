/**
 * Fabric Event Plane queue ops snapshot (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type FabricQueueStats = Record<string, number>;

export type FabricWorkerCounters = {
  pool_size: number;
  items_processed: number;
  items_failed: number;
  idle_iterations: number;
  batch_runs: number;
  last_processed_at: number;
  updated_at: number;
};

export type FabricWorkerSnapshot = {
  durable_enabled: boolean;
  configured_pool_size: number;
  counters: FabricWorkerCounters;
};

export type FabricQueueSnapshot = {
  version: number;
  queues: Record<string, FabricQueueStats>;
  workers?: FabricWorkerSnapshot;
  dlq: {
    queue: string;
    count: number;
    items: Array<Record<string, unknown>>;
  };
};

export async function getFabricQueueSnapshot(
  http: HTTPClient,
  options?: { dlqLimit?: number },
): Promise<FabricQueueSnapshot> {
  const limit = options?.dlqLimit ?? 10;
  const [queuesRes, dlqRes] = await Promise.all([
    http.get<{ queues?: Record<string, FabricQueueStats>; workers?: FabricWorkerSnapshot }>(
      '/fabric/ops/queues',
    ),
    http.get<{ queue?: string; count?: number; items?: Array<Record<string, unknown>> }>(
      `/fabric/ops/dlq?limit=${limit}`,
    ),
  ]);
  const queues = unwrapApiData(queuesRes);
  const dlq = unwrapApiData(dlqRes);
  return {
    version: 1,
    queues: queues.queues ?? {},
    workers: queues.workers,
    dlq: {
      queue: String(dlq.queue ?? 'logic_durable_dlq'),
      count: Number(dlq.count ?? 0),
      items: dlq.items ?? [],
    },
  };
}
