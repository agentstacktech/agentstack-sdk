/**
 * Re-enqueue a logic durable DLQ item (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type FabricDlqReplayRequest = {
  dna_uuid?: string;
  dlq_source_id?: string;
  payload?: Record<string, unknown>;
};

export type FabricDlqReplayResult = {
  success: boolean;
  queued_item_id?: string;
  queue?: string;
};

export async function replayFabricDlqItem(
  http: HTTPClient,
  body: FabricDlqReplayRequest,
): Promise<FabricDlqReplayResult> {
  const res = await http.post<FabricDlqReplayResult>('/fabric/ops/dlq/replay', body);
  return unwrapApiData(res);
}
