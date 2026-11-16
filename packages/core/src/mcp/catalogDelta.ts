/**
 * Generated — parity with provided_plugins/scripts/lib/mcpCatalogDelta.mjs
 * Regen: node provided_plugins/scripts/codegen-mcp-catalog-helpers.mjs
 * Gene: core.mcp.remediation.gen1
 */

export interface McpCatalogDeltaPayload {
  domains?: Record<string, Array<{ action: string; removed?: boolean }>>;
  removed_actions?: string[];
  delta?: boolean;
  since_etag?: string;
  catalog_etag?: string;
  delta_fallback?: string;
}

export function buildMcpCatalogActionsUrl(
  apiBase: string,
  opts: { sinceEtag?: string | null; delta?: boolean; hot?: boolean } = {},
): string {
  const { sinceEtag = null, delta = false, hot = false } = opts;
  const root = String(apiBase || '').replace(/\/$/, '');
  const url = new URL('/mcp/actions', root.endsWith('/mcp') ? root.replace(/\/mcp$/, '') : root);
  url.searchParams.set('schemas', hot ? 'hot' : 'public');
  if (sinceEtag) url.searchParams.set('since_etag', sinceEtag);
  if (delta && sinceEtag) url.searchParams.set('delta', '1');
  return url.toString();
}

export function mergeMcpCatalogDelta<T extends { action: string }>(
  existing: T[],
  delta: McpCatalogDeltaPayload,
): T[] {
  const byAction = new Map<string, T>();
  for (const row of existing) byAction.set(row.action, row);
  const removed = new Set(delta.removed_actions ?? []);
  for (const list of Object.values(delta.domains ?? {})) {
    for (const row of list) {
      if (!row?.action) continue;
      if (row.removed || removed.has(row.action)) byAction.delete(row.action);
      else byAction.set(row.action, row as T);
    }
  }
  for (const action of removed) byAction.delete(action);
  return [...byAction.values()];
}

export function isCatalogDeltaPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as McpCatalogDeltaPayload;
  if (p.delta_fallback) return false;
  if (p.delta === true) return true;
  return Boolean(p.domains && (p.removed_actions || p.since_etag));
}

export function isMcpCatalogDeltaFallbackFull(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean((payload as McpCatalogDeltaPayload).delta_fallback);
}

export function resolveMcpCatalogActionsAfterFetch<T extends { action: string }>(
  existing: T[],
  responseBody: McpCatalogDeltaPayload,
  flattenFull: (body: unknown) => T[],
): T[] {
  if (isMcpCatalogDeltaFallbackFull(responseBody)) {
    return flattenFull(responseBody);
  }
  if (responseBody.delta === true || isCatalogDeltaPayload(responseBody)) {
    return mergeMcpCatalogDelta(existing, responseBody);
  }
  const flat = flattenFull(responseBody);
  return flat.length ? flat : existing;
}
