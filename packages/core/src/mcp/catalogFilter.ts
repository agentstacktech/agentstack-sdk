/**
 * Generated from shared/fixtures/mcp_doc_audience_rules_v1.json — do not edit by hand.
 * Regen: node provided_plugins/scripts/codegen-doc-audience.mjs
 * Gene: docs.public.classification.gen1
 */

export type DocAudience = 'tenant' | 'operator' | 'internal';

const OPERATOR_CATEGORIES = new Set<string>(["admin"]);

const OPERATOR_PREFIXES: string[] = ["social.admin.","rest.admin.","agentnet.admin.","grants.","fundraising."];

const OPERATOR_ACTIONS = new Set<string>(["integrations.get_platform_diagnostics","scheduler.get_all_db_tasks"]);

const SUMMARY_OPERATOR_TOKENS: string[] = ["ecosystem owner","platform admin","operator:"];

const SUMMARY_OPERATOR_PREFIX = "ops:";

const FORBIDDEN_DESCRIPTION_PATTERNS = [
  /platform_db_init/i,
  /platform_schema_migrations/i,
  /database_migrations/i,
  /pg_bus_enabled/i,
  /\\bdata_channels\\b/i,
  /DNA ring/i,
  /ecosystem owner/i,
  /platform admin/i,
  /\\bOps:/i,
];

export interface CatalogActionMeta {
  action: string;
  category?: string;
  summary?: string;
  doc_audience?: DocAudience;
}

/** Classify MCP action documentation audience. */
export function inferDocAudience(action: string, meta: Partial<CatalogActionMeta> = {}): DocAudience {
  const explicit = meta.doc_audience;
  if (explicit === 'tenant' || explicit === 'operator' || explicit === 'internal') {
    return explicit;
  }

  const actionL = String(action || '').toLowerCase();
  const cat = String(meta.category || action.split('.', 1)[0] || '').toLowerCase();
  let audience: DocAudience = 'tenant';

  if (OPERATOR_CATEGORIES.has(cat)) {
    audience = 'operator';
  } else if (OPERATOR_PREFIXES.some((p) => actionL.startsWith(p))) {
    audience = 'operator';
  } else if (OPERATOR_ACTIONS.has(action)) {
    audience = 'operator';
  } else {
    const summaryL = String(meta.summary || '').toLowerCase();
    if (
      SUMMARY_OPERATOR_TOKENS.some((token) => summaryL.includes(token)) ||
      summaryL.startsWith(SUMMARY_OPERATOR_PREFIX)
    ) {
      audience = 'operator';
    }
  }

  if (audience === 'tenant' && meta.summary) {
    for (const pattern of FORBIDDEN_DESCRIPTION_PATTERNS) {
      if (pattern.test(meta.summary)) {
        return 'operator';
      }
    }
  }

  return audience;
}

/** Keep tenant-facing actions only (public docs parity). */
export function filterTenantActions<T extends CatalogActionMeta>(rows: T[]): T[] {
  return rows.filter((row) => inferDocAudience(row.action, row) === 'tenant');
}
