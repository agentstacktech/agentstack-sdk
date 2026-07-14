/**
 * Bulk re-enqueue logic durable DLQ items (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import type { FabricDlqReplayRequest } from './replayFabricDlqItem';

export type FabricDlqBulkReplayResult = {
  success: boolean;
  queue?: string;
  queued_count: number;
  failed_count: number;
  queued: Array<{
    queued_item_id: string;
    dna_uuid?: string;
    dlq_source_id?: string;
  }>;
  failed: Array<{
    ref: FabricDlqReplayRequest;
    error: string;
    status_code?: number;
  }>;
};

export async function replayFabricDlqBulk(
  http: HTTPClient,
  items: FabricDlqReplayRequest[],
): Promise<FabricDlqBulkReplayResult> {
  const res = await http.post<FabricDlqBulkReplayResult>('/fabric/ops/dlq/replay/bulk', { items });
  return unwrapApiData(res);
}
