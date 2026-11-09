/**
 * MCP REST discover helpers (not JSON-RPC execute).
 * Genetic tag: repo.tooling.user_cli.gen1 · repo.platform.sdk.gen1
 */

import { normalizeMcpToolEnvelope } from '../agents/planGraph';
import { resolvePublicOrigin } from './urls';

export interface McpDiscoverOptions {
  apiBase: string;
  token: string;
  projectId?: number;
  /** BCP-47 locale for localized instruction slices (en-US, pt-BR, ru-RU). */
  locale?: string;
}

export interface McpActionEffect {
  kind?: 'read' | 'mutate' | 'destructive' | 'evaluate';
  generation?: boolean;
  budget?: string;
  write_mode?: boolean;
  destructive?: boolean;
  external_side_effect?: boolean;
  audit_side_effect?: boolean;
  execution_class?: string;
  audit_batch_allowed?: boolean;
  /** When true, some param slices (mutates_when) require options.goal on batch execute. */
  audit_batch_param_sensitive?: boolean;
  audit_batch_note?: string;
  requires_preflight?: boolean;
}

export interface McpInstructionSlice {
  when_to_use?: string;
  when_not_to_use?: string;
  do_not_use_when?: string;
  anti_patterns?: string[];
  instruction_hint?: string;
  related_tools?: string[];
  related_prompts?: string[];
  organ_id?: string;
  owner_gene?: string;
  onboarding_tier?: string;
  capability_descriptor?: Record<string, unknown>;
  error_hints?: Array<{ code: string; tip: string }>;
  effect?: McpActionEffect;
  verify?: string[];
  rollback?: string[];
  when_blocked?: Record<string, string>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read MCP `instruction_slice` from execute / work_next payloads. */
export function extractInstructionSlice(
  payload: Record<string, unknown> | undefined,
): McpInstructionSlice | null {
  const slice = asRecord(payload?.instruction_slice);
  if (!slice) return null;
  const verify = Array.isArray(slice.verify) ? slice.verify.map(String) : undefined;
  const rollback = Array.isArray(slice.rollback) ? slice.rollback.map(String) : undefined;
  const whenBlockedRaw = asRecord(slice.when_blocked);
  const when_blocked: Record<string, string> = {};
  if (whenBlockedRaw) {
    for (const [key, val] of Object.entries(whenBlockedRaw)) {
      const hint = String(val ?? '').trim();
      if (hint) when_blocked[key] = hint;
    }
  }
  const out: McpInstructionSlice = {
    ...(typeof slice.when_to_use === 'string' ? { when_to_use: slice.when_to_use } : {}),
    ...(typeof slice.when_not_to_use === 'string' ? { when_not_to_use: slice.when_not_to_use } : {}),
    ...(typeof slice.do_not_use_when === 'string' ? { do_not_use_when: slice.do_not_use_when } : {}),
    ...(Array.isArray(slice.anti_patterns)
      ? { anti_patterns: slice.anti_patterns.map(String).filter(Boolean) }
      : {}),
    ...(verify?.length ? { verify } : {}),
    ...(rollback?.length ? { rollback } : {}),
    ...(Object.keys(when_blocked).length ? { when_blocked } : {}),
    ...(slice.effect && typeof slice.effect === 'object'
      ? { effect: slice.effect as McpActionEffect }
      : {}),
  };
  return Object.keys(out).length ? out : null;
}

export interface McpDiscoverIntentRow {
  intent_id: string;
  intent_name: string;
  category: string;
  description: string;
  required_tools: string[];
  optional_tools: string[];
  workflow_id?: string;
  estimated_steps?: number;
  difficulty?: string;
  confidence?: number;
  example_params?: Record<string, unknown>;
  primary_tool?: string;
  instruction_slice?: McpInstructionSlice;
  note?: string;
}

export interface McpDiscoverByIntentResult {
  success: boolean;
  data: {
    intents: McpDiscoverIntentRow[];
    total: number;
    query: string;
    message?: string;
    routed_goal?: Record<string, unknown>;
    semantic_contract?: Record<string, unknown>;
  };
}

async function mcpRestJson(
  apiBase: string,
  path: string,
  init: RequestInit,
  opts: McpDiscoverOptions,
): Promise<unknown> {
  const origin = resolvePublicOrigin(apiBase);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (opts.projectId != null && !headers['X-Project-ID']) {
    headers['X-Project-ID'] = String(opts.projectId);
  }
  const locale = opts.locale?.trim();
  if (locale && !headers['Accept-Language']) {
    headers['Accept-Language'] = locale;
  }
  const res = await fetch(`${origin}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

/** POST /mcp/discover/by_intent — intent → ranked MCP actions. */
export async function mcpDiscoverByIntent(
  intent: string,
  opts: McpDiscoverOptions & { projectId: number },
): Promise<McpDiscoverByIntentResult> {
  const raw = await mcpRestJson(
    opts.apiBase,
    '/mcp/discover/by_intent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent,
        project_id: opts.projectId,
        ...(opts.locale?.trim() ? { locale: opts.locale.trim() } : {}),
      }),
    },
    opts,
  );
  const env = normalizeMcpToolEnvelope(raw);
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged = { ...base, ...env.data };
  const data =
    merged.data && typeof merged.data === 'object'
      ? (merged.data as McpDiscoverByIntentResult['data'])
      : (merged as McpDiscoverByIntentResult['data']);
  return {
    success: env.success && merged.success !== false,
    data,
  };
}

/** GET /mcp/discovery — API key capability context. */
export async function mcpGetDiscovery(opts: McpDiscoverOptions): Promise<unknown> {
  const locale = opts.locale?.trim();
  const path = locale
    ? `/mcp/discovery?locale=${encodeURIComponent(locale)}&verbose=1`
    : '/mcp/discovery?verbose=1';
  return mcpRestJson(opts.apiBase, path, { method: 'GET' }, opts);
}
