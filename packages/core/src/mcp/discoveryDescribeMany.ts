/**
 * discovery.describe_many — one MCP round-trip for ≤6 slim describes (WS-C1).
 * Genetic tag: core.mcp.self_description.gen1 · sdk.protocol.gen1
 */

import type { HTTPClient } from '../client/http-client';
import { normalizeMcpToolEnvelope } from '../agents/planGraph';
import { extractResults, mcpExecute } from './execute';
import { MCP_SYNC_BATCH_CLIENT_TIMEOUT_MS } from './budgets';
import { resolveMcpUrl } from './urls';

export type DescribeWireMode = 'slim' | 'default' | 'full';

export interface DescribeManyRow {
  action: string;
  ok: boolean;
  error_code?: string;
  data?: Record<string, unknown>;
}

export interface DescribeManyResult {
  descriptor: DescribeWireMode;
  count: number;
  rows: DescribeManyRow[];
}

export const DESCRIBE_MANY_MAX_ACTIONS = 6;

export interface DiscoveryDescribeManyParams {
  projectId: number;
  actions: string[];
  descriptor?: DescribeWireMode;
  locale?: string;
  expand?: string[];
}

function dedupeActions(actions: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of actions) {
    const act = String(raw ?? '').trim();
    if (!act || seen.has(act)) continue;
    seen.add(act);
    out.push(act);
    if (out.length >= DESCRIBE_MANY_MAX_ACTIONS) break;
  }
  return out;
}

function parseDescribeManyPayload(payload: unknown): DescribeManyResult {
  const base = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const descriptor = (String(base.descriptor ?? 'slim').trim() || 'slim') as DescribeWireMode;
  const rowsRaw = base.rows;
  const rows: DescribeManyRow[] = [];
  if (Array.isArray(rowsRaw)) {
    for (const row of rowsRaw) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      const action = String(rec.action ?? '').trim();
      if (!action) continue;
      rows.push({
        action,
        ok: Boolean(rec.ok),
        ...(rec.error_code ? { error_code: String(rec.error_code) } : {}),
        ...(rec.data && typeof rec.data === 'object'
          ? { data: rec.data as Record<string, unknown> }
          : {}),
      });
    }
  }
  return {
    descriptor,
    count: Number(base.count ?? rows.length) || rows.length,
    rows,
  };
}

/**
 * MCP batch with a single discovery.describe_many step (budget-aware client timeout).
 */
export async function discoveryDescribeMany(
  client: HTTPClient,
  params: DiscoveryDescribeManyParams,
): Promise<DescribeManyResult> {
  const actions = dedupeActions(params.actions);
  const token = client.getAuthToken?.() ?? undefined;
  if (!token) {
    throw new Error('MCP: missing auth token');
  }
  const apiBase = client.getConfig().apiBase ?? '';
  const context: Record<string, unknown> = { project_id: params.projectId };
  const locale = String(params.locale ?? '').trim();
  if (locale) {
    context.locale = locale;
  }
  const mcpParams: Record<string, unknown> = {
    project_id: params.projectId,
    actions,
    descriptor: params.descriptor ?? 'slim',
  };
  if (params.expand?.length) {
    mcpParams.expand = params.expand;
  }
  const envelope = await mcpExecute(
    [
      {
        id: 'discovery.describe_many',
        action: 'discovery.describe_many',
        params: mcpParams,
      },
    ],
    {
      token,
      projectId: params.projectId,
      mcpUrl: resolveMcpUrl(apiBase),
      timeoutMs: MCP_SYNC_BATCH_CLIENT_TIMEOUT_MS,
    },
  );
  const steps = extractResults(envelope);
  const step = steps[0];
  const failed =
    envelope.ok === false ||
    step?.status === 'error' ||
    Boolean(step?.error || step?.error_code);
  if (failed) {
    const code = String(step?.error_code || step?.error || envelope.error_code || 'mcp_error');
    throw new Error(code);
  }
  const envRecord = envelope as unknown as Record<string, unknown>;
  const rawPayload =
    step?.result ?? (step as Record<string, unknown> | undefined)?.data ?? envRecord.data ?? envelope.raw ?? envelope;
  const { data: normalized } = normalizeMcpToolEnvelope(rawPayload);
  const payload =
    normalized && Object.keys(normalized).length > 0
      ? normalized
      : (rawPayload as Record<string, unknown>);
  return parseDescribeManyPayload(payload);
}