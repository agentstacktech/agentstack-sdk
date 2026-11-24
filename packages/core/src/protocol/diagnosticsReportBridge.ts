/**
 * Operator report ↔ Work Graph helpers (sdk.protocol contour).
 * Gene: shared.diagnostics.report_ingest.gen1
 */

import type { HTTPClient } from '../client/http-client';
import { mcpExecute } from '../mcp/execute';

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
  orphan_reports?: Array<{ report_id?: string; severity?: string; summary?: string }>;
};

type McpOpts = { projectId?: number; http: HTTPClient };

/** MCP `diagnostics.report_list` compact rows. */
export async function diagnosticsReportList(
  opts: McpOpts,
  params?: { limit?: number; severity?: string; status?: string },
): Promise<ReportListRow[]> {
  const projectId = opts.projectId ?? 1;
  const batch = await mcpExecute(
    [{ action: 'diagnostics.report_list', params: { limit: params?.limit ?? 50, ...params } }],
    { http: opts.http, projectId },
  );
  const data = batch?.steps?.[0]?.data as { reports?: ReportListRow[] } | undefined;
  return Array.isArray(data?.reports) ? data.reports : [];
}

/** MCP `diagnostics.reports.backlog_summary`. */
export async function diagnosticsReportBacklogSummary(
  opts: McpOpts,
  limit = 200,
): Promise<ReportBacklogSummary> {
  const projectId = opts.projectId ?? 1;
  const batch = await mcpExecute(
    [
      {
        action: 'diagnostics.reports.backlog_summary',
        params: { project_id: projectId, limit },
      },
    ],
    { http: opts.http, projectId },
  );
  return (batch?.steps?.[0]?.data as ReportBacklogSummary) ?? {};
}

/** MCP `agents.plan_ingest` from report id(s). */
/** MCP `diagnostics.reports.ingest_orphans` (default dry_run in MCP when omitted). */
export async function diagnosticsReportIngestOrphans(
  opts: McpOpts,
  params?: { limit?: number; dryRun?: boolean; envUuid?: string },
) {
  const projectId = opts.projectId ?? 1;
  return mcpExecute(
    [
      {
        action: 'diagnostics.reports.ingest_orphans',
        params: {
          project_id: projectId,
          limit: params?.limit ?? 20,
          dry_run: params?.dryRun ?? true,
          env_uuid: params?.envUuid,
        },
      },
    ],
    { http: opts.http, projectId },
  );
}

export async function planIngestFromReport(
  opts: McpOpts,
  reportIds: string[],
  bridgeOpts?: { parentId?: string; envUuid?: string },
) {
  const projectId = opts.projectId ?? 1;
  return mcpExecute(
    [
      {
        action: 'agents.plan_ingest',
        params: {
          project_id: projectId,
          report_ids: reportIds,
          intake_mode: 'work',
          parent_id: bridgeOpts?.parentId ?? 'arch-mcp-platform',
          env_uuid: bridgeOpts?.envUuid,
        },
      },
    ],
    { http: opts.http, projectId },
  );
}