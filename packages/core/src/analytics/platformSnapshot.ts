/**
 * Platform metrics snapshot client (ecosystem project_id=1).
 * Gene: core.mcp.analytics.gen1
 */

import type { AgentStackSDK } from '../sdk';

export type PlatformSnapshotParams = {
  period?: '7d' | '30d' | '90d' | '6m';
  include?: string[];
};

export async function fetchPlatformSnapshot(
  sdk: AgentStackSDK,
  params?: PlatformSnapshotParams,
): Promise<unknown> {
  return sdk.mcp.execute({
    action: 'analytics.platform_snapshot',
    params: params ?? { period: '30d' },
  });
}