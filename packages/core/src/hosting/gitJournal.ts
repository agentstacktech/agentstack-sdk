/**
 * Git journal MCP helpers — sdk.hosting.gen2 / core.hosting.agent_ship.gen1
 */
import type { HTTPClient } from '../client/http-client';

import { parseJournalBuildReceipt, type JournalBuildReceipt } from './journalBuildReceipt';

async function mcpExecute<T>(
  client: HTTPClient,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await client.post<{ ok?: boolean; result?: T; data?: T } & T>(
    '/mcp/execute',
    { action, params },
  );
  const body = res.data as Record<string, unknown>;
  return (body?.result ?? body?.data ?? body) as T;
}

export type HostingDevBuildRow = {
  job_id?: string;
  status?: string;
  at?: string;
};

export type HostingLastHookResult = {
  ok?: boolean;
  code?: string;
  detail?: string;
  bucket_id?: string;
  build_target?: string;
  pushed_sha?: string;
  at?: string;
};

export type HostingGitStatus = {
  ok?: boolean;
  dirty?: boolean;
  last_job_id?: string;
  last_build_status?: string;
  recent_dev_builds?: HostingDevBuildRow[];
  next_actions?: Record<string, unknown>[];
  journal_root?: string;
  last_hook?: HostingLastHookResult;
  hook_failed?: boolean;
  recovery_hint?: string;
};

export async function getHostingGitStatus(
  client: HTTPClient,
  params: { project_id: number; bucket_id?: string; bucket_name?: string },
): Promise<HostingGitStatus> {
  return mcpExecute<HostingGitStatus>(client, 'hosting.git.status', params);
}

export async function getHostingBuildJobStatus(
  client: HTTPClient,
  jobId: string,
): Promise<{ receipt: JournalBuildReceipt; raw: Record<string, unknown> }> {
  const raw = await mcpExecute<Record<string, unknown>>(client, 'hosting.site.build_status', {
    job_id: jobId,
  });
  return { receipt: parseJournalBuildReceipt(raw), raw };
}

export async function promoteHostingGitBranch(
  client: HTTPClient,
  params: {
    project_id: number;
    bucket_id?: string;
    bucket_name?: string;
    ref?: string;
    target?: 'dev' | 'prod';
  },
): Promise<Record<string, unknown>> {
  return mcpExecute<Record<string, unknown>>(client, 'hosting.git.promote_branch', {
    ref: 'dev',
    target: 'prod',
    ...params,
  });
}