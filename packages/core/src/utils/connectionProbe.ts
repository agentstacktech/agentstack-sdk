/**
 * Composes existing HTTP liveness + push pipeline checks without a new server endpoint.
 *
 * @see docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md (repo root)
 */

import type { AgentStackSDK } from '../sdk';
import type { PushHealthData } from '../modules/AgentWebPush';

export interface AgentStackConnectionProbeResult {
  /** Result of {@link AgentStackSDK.healthCheck} (GET /health via HTTPClient). */
  httpOk: boolean;
  /**
   * Authenticated snapshot from `GET /api/push/health` when the call succeeds.
   * Omitted when unauthenticated, push module unavailable, or request fails.
   */
  pushHealth?: PushHealthData;
}

/**
 * Lightweight connectivity probe for embed apps and settings UIs.
 * Does not replace fine-grained diagnostics — combines `healthCheck` + `webPushGetPushHealth`.
 */
export async function probeAgentStackConnection(
  sdk: AgentStackSDK
): Promise<AgentStackConnectionProbeResult> {
  const httpOk = await sdk.healthCheck();
  let pushHealth: PushHealthData | undefined;
  try {
    const r = await sdk.platform.protocol.webPushGetPushHealth();
    if (r.data && typeof r.data.canDeliver === 'boolean') {
      pushHealth = r.data;
    }
  } catch {
    /* optional surface — 401 or webPush not wired */
  }
  return { httpOk, pushHealth };
}
