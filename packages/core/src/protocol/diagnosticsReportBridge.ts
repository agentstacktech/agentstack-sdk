/**
 * Operator report ↔ Work Graph helpers (sdk.protocol contour).
 * Gene: shared.diagnostics.report_ingest.gen1
 */

import type { HTTPClient } from '../client/http-client';
import { mcpExecute } from '../mcp/execute';
import { resolveMcpUrl } from '../mcp/urls';

export type ReportListRow = {
  report_id: string;
  severity: string;
  status: string;
  summary: string;
  updated_at?: string;
};

export type ReportBacklogSummary = {
  orphan_count?: number;
  open_count?: number;
  linked_count?: number;
  link_rate?: number;
  report_wg_link_rate?: number;
  report_age_p95_hours?: number;
  orphan_reports?: Array<{ report_id?: string; severity?: string; summary?: string }>;
  cache_meta?: { hit?: boolean; build_ms?: number };
  loop_compliance_rate_7d?: number | null;
};

export type ReportDetail = ReportListRow & {
  detail?: string;
  detail_spill_hydrated?: boolean;
  context?: Record<string, unknown>;
  links?: Record<string, unknown>;
  attachments?: Array<{ at?: string; body?: string; user_id?: number }>;
};

const DETAIL_SPILL_MARKER = /\[detail spilled/i;

/** True when MCP/REST left a stub and context.body_spill_id should be hydrated. */
export function reportDetailNeedsSpillHydrate(
  detail: string | undefined,
  context: Record<string, unknown> | undefined,
): boolean {
  const spillId = String(context?.body_spill_id ?? '').trim();
  if (!spillId) return false;
  const body = String(detail ?? '');
  return !body || DETAIL_SPILL_MARKER.test(body);
}

type McpOpts = { projectId?: number; http: HTTPClient };

async function runMcpData<T>(
  http: HTTPClient,
  projectId: number,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = http.getAuthToken?.() ?? undefined;
  if (!token) throw new Error('MCP: missing auth token');
  const apiBase = http.getConfig().apiBase ?? '';
  const res = await mcpExecute([{ action, params: { project_id: projectId, ...params } }], {
    token,
    projectId,
    mcpUrl: resolveMcpUrl(apiBase),
  });
  if (!res.ok) throw new Error(res.error ?? action);
  const step = res.results?.[0];
  const raw = (step?.result ?? step?.data) as Record<string, unknown> | undefined;
  if (raw?.data !== undefined) return raw.data as T;
  return (raw ?? {}) as T;
}

async function runMcpBatch(
  http: HTTPClient,
  projectId: number,
  action: string,
  params: Record<string, unknown>,
) {
  const token = http.getAuthToken?.() ?? undefined;
  if (!token) throw new Error('MCP: missing auth token');
  const apiBase = http.getConfig().apiBase ?? '';
  return mcpExecute([{ action, params: { project_id: projectId, ...params } }], {
    token,
    projectId,
    mcpUrl: resolveMcpUrl(apiBase),
  });
}

/** MCP `diagnostics.report_list` compact rows. */
export async function diagnosticsReportList(
  opts: McpOpts,
  params?: { limit?: number; severity?: string; status?: string },
): Promise<ReportListRow[]> {
  const projectId = opts.projectId ?? 1;
  const data = await runMcpData<{ reports?: ReportListRow[] }>(
    opts.http,
    projectId,
    'diagnostics.report_list',
    { limit: params?.limit ?? 50, ...params },
  );
  return Array.isArray(data?.reports) ? data.reports : [];
}

/** MCP `diagnostics.reports.backlog_summary`. */
export async function diagnosticsReportBacklogSummary(
  opts: McpOpts,
  limit = 200,
): Promise<ReportBacklogSummary> {
  const projectId = opts.projectId ?? 1;
  return runMcpData<ReportBacklogSummary>(
    opts.http,
    projectId,
    'diagnostics.reports.backlog_summary',
    { limit },
  );
}

/** MCP `agents.plan_ingest` from report id(s). */
/** MCP `diagnostics.reports.ingest_orphans` (default dry_run in MCP when omitted). */
export async function diagnosticsReportIngestOrphans(
  opts: McpOpts,
  params?: { limit?: number; dryRun?: boolean; envUuid?: string },
) {
  const projectId = opts.projectId ?? 1;
  return runMcpBatch(opts.http, projectId, 'diagnostics.reports.ingest_orphans', {
    limit: params?.limit ?? 20,
    dry_run: params?.dryRun ?? true,
    env_uuid: params?.envUuid,
  });
}

/** MCP `diagnostics.report_get` with default `include_spilled_detail=true`. */
export async function diagnosticsReportGet(
  opts: McpOpts,
  reportId: string,
  params?: { includeSpilledDetail?: boolean; includeOptraceTail?: boolean },
): Promise<ReportDetail> {
  const projectId = opts.projectId ?? 1;
  const data = await runMcpData<ReportDetail>(opts.http, projectId, 'diagnostics.report_get', {
    report_id: reportId,
    include_spilled_detail: params?.includeSpilledDetail ?? true,
    include_optrace_tail: params?.includeOptraceTail ?? false,
  });
  if (
    reportDetailNeedsSpillHydrate(data.detail, data.context) &&
    (params?.includeSpilledDetail ?? true)
  ) {
    const retry = await runMcpData<ReportDetail>(opts.http, projectId, 'diagnostics.report_get', {
      report_id: reportId,
      include_spilled_detail: true,
    });
    return { ...data, ...retry, detail: retry.detail ?? data.detail };
  }
  return data;
}

export async function planIngestFromReport(
  opts: McpOpts,
  reportIds: string[],
  bridgeOpts?: { parentId?: string; envUuid?: string },
) {
  const projectId = opts.projectId ?? 1;
  return runMcpBatch(opts.http, projectId, 'agents.plan_ingest', {
    report_ids: reportIds,
    intake_mode: 'work',
    parent_id: bridgeOpts?.parentId ?? 'arch-mcp-platform',
    env_uuid: bridgeOpts?.envUuid,
  });
}