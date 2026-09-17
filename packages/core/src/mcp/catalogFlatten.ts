/**
 * Generated — parity with provided_plugins/scripts/lib/mcpCatalogFlatten.mjs
 * Regen: node provided_plugins/scripts/codegen-mcp-catalog-helpers.mjs
 * Gene: repo.plugins.capability_routing.gen1
 */

import type { CatalogActionMeta } from './catalogFilter';

type CatalogPayload = {
  actions?: CatalogActionMeta[];
  domains?: Record<string, CatalogActionMeta[]>;
};

/** Normalize GET /mcp/actions into flat action rows. */
export function flattenMcpActionsCatalog(payload: unknown): CatalogActionMeta[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row.action === 'string');
  }
  if (typeof payload !== 'object') return [];
  const catalog = payload as CatalogPayload;
  if (Array.isArray(catalog.actions)) {
    return catalog.actions.filter((row) => row && typeof row.action === 'string');
  }
  const domains = catalog.domains;
  if (!domains || typeof domains !== 'object') return [];
  const out: CatalogActionMeta[] = [];
  for (const list of Object.values(domains)) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (row && typeof row.action === 'string') out.push(row);
    }
  }
  return out;
}

/** Parse ~/.cursor/agentstack-capabilities.json shape. */
export function actionsFromSnapshot(snapshotFile: unknown): CatalogActionMeta[] {
  if (!snapshotFile || typeof snapshotFile !== 'object') return [];
  const snap = snapshotFile as {
    actions?: CatalogActionMeta[] | unknown;
    catalog?: unknown;
  };
  if (Array.isArray(snap.actions)) return snap.actions;
  if (snap.actions && typeof snap.actions === 'object') {
    return flattenMcpActionsCatalog(snap.actions);
  }
  if (snap.catalog) return flattenMcpActionsCatalog(snap.catalog);
  return flattenMcpActionsCatalog(snapshotFile);
}
