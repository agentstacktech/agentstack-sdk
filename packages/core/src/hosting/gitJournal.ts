/**
 * Git journal MCP helpers — sdk.hosting.gen2 / core.hosting.agent_ship.gen1
 */
import type { HTTPClient } from '../client/http-client';

import { mcpExecute, type McpStep } from '../mcp/execute';
import { resolveMcpUrl } from '../mcp/urls';

import { parseJournalBuildReceipt, type JournalBuildReceipt } from './journalBuildReceipt';

async function mcpHostingStep<T>(
  client: HTTPClient,
  projectId: number,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = client.getAuthToken();
  if (!token) {
    throw new Error('hosting.gitJournal: auth token required');
  }
  const apiBase = client.getConfig().apiBase ?? '';
  const steps: McpStep[] = [{ action, params }];
  const mcpTool =
    action.startsWith('hosting.git.') && action.includes('promote')
      ? 'agentstack.execute'
      : 'agentstack.read';
  const envelope = await mcpExecute(steps, {
    token,
    projectId,
    mcpUrl: resolveMcpUrl(apiBase),
    executionIntent: 'direct',
    stopOnError: true,
    mcpTool,
  });
  const step = envelope.steps?.[0];
  const result = step?.result as Record<string, unknown> | undefined;
  const data =
    (result?.data as T | undefined) ??
    (result?.ok === true && result?.data !== undefined ? (result.data as T) : undefined) ??
    (result as T | undefined);
  return data as T;
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
  return mcpHostingStep<HostingGitStatus>(client, params.project_id, 'hosting.git.status', params);
}

export async function getHostingBuildJobStatus(
  client: HTTPClient,
  jobId: string,
): Promise<{ receipt: JournalBuildReceipt; raw: Record<string, unknown> }> {
  const projectId = Number(client.getConfig().projectId ?? 1);
  const raw = await mcpHostingStep<Record<string, unknown>>(
    client,
    projectId,
    'hosting.site.build_status',
    { job_id: jobId },
  );
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
  return mcpHostingStep<Record<string, unknown>>(client, params.project_id, 'hosting.git.promote_branch', {
    ref: 'dev',
    target: 'prod',
    ...params,
  });
}