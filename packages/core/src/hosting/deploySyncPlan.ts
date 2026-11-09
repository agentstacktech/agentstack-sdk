/**
 * hosting.sync.plan + client diff helper — sdk.hosting.gen2
 *
 * After diff, upload via hosting.deploy_files (≤50/call) then hosting.sync.commit.
 */

import type { HTTPClient } from '../client/http-client';
import {
  HOSTING_SYNC_COMMIT_ACTION,
  HOSTING_SYNC_PLAN_ACTION,
  type HostingSyncCommitParams,
  type HostingSyncPlanParams,
} from './hostingSyncMcp';
import { buildSyncDiff, type LocalManifestRow, type ServerManifestRow } from './buildSyncDiff';

async function mcpExecute<T>(
  client: HTTPClient,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await client.post<Record<string, unknown>>('/mcp/execute', { action, params });
  return res.data as T;
}

export type HostingSyncPlanResult = {
  files?: ServerManifestRow[];
  file_count?: number;
  total_bytes?: number;
  bucket_id?: string;
};

export async function fetchHostingSyncPlan(
  client: HTTPClient,
  params: HostingSyncPlanParams,
): Promise<HostingSyncPlanResult> {
  const raw = await mcpExecute<HostingSyncPlanResult>(client, HOSTING_SYNC_PLAN_ACTION, params);
  return raw;
}

export function diffHostingSyncPlan(
  local: ReadonlyMap<string, LocalManifestRow>,
  plan: HostingSyncPlanResult,
) {
  return buildSyncDiff(local, plan.files ?? []);
}

export async function commitHostingSync(
  client: HTTPClient,
  params: HostingSyncCommitParams,
) {
  return mcpExecute<Record<string, unknown>>(client, HOSTING_SYNC_COMMIT_ACTION, params);
}

/** Plan + diff in one call (upload batches remain separate deploy_files steps). */
export async function deploySyncPlan(
  client: HTTPClient,
  params: HostingSyncPlanParams & { local: ReadonlyMap<string, LocalManifestRow> },
) {
  const plan = await fetchHostingSyncPlan(client, params);
  const diff = diffHostingSyncPlan(params.local, plan);
  return { plan, diff };
}
