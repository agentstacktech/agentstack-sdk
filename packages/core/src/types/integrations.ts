/**
 * Zod mirror of shared Integration Hub atoms — genetic: ``sdk.integrations.gen1``.
 */
import { z } from 'zod';

export const IntegrationOwnerKindSchema = z.enum(['project', 'personal']);
export type IntegrationOwnerKind = z.infer<typeof IntegrationOwnerKindSchema>;

export const IntegrationHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'error', 'unknown', 'needs_auth']).optional(),
  last_success_at: z.string().optional().nullable(),
  last_error_at: z.string().optional().nullable(),
  last_error_code: z.string().optional().nullable(),
  success_rate_24h: z.number().optional().nullable(),
});

export const IntegrationConnectionSpecSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string(),
  slug: z.string(),
  owner_kind: IntegrationOwnerKindSchema,
  direction: z.enum(['inbound', 'outbound', 'bidirectional']).default('bidirectional'),
  generation: z.number().int().nonnegative().optional().nullable(),
  config: z.record(z.unknown()).default({}),
  health: IntegrationHealthSchema.optional(),
});

export type IntegrationConnectionSpec = z.infer<typeof IntegrationConnectionSpecSchema>;

export const IntegrationSetupSecretSourceSchema = z.enum([
  'agentstack_generated',
  'provider_generated',
  'user_token',
  'none',
]);

export type IntegrationSetupSecretSource = z.infer<typeof IntegrationSetupSecretSourceSchema>;

export const IntegrationQuickSetupMetaSchema = z.object({
  icon_key: z.string().default('generic'),
  accent: z.string().optional().nullable(),
  docs_url: z.string().optional().nullable(),
  setup_time_seconds: z.number().int().default(60),
  secret_source: IntegrationSetupSecretSourceSchema.default('provider_generated'),
  primary_cta: z.string().default('setup'),
  event_presets: z.array(z.string()).default([]),
  copy_hints: z.array(z.string()).default([]),
  sample_payload_key: z.string().optional().nullable(),
});

export type IntegrationQuickSetupMeta = z.infer<typeof IntegrationQuickSetupMetaSchema>;

export const IntegrationRecipeManifestSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  description: z.string().optional(),
  manifest_version: z.number().int().optional(),
  owner_kind_default: IntegrationOwnerKindSchema.optional(),
  category: z.string(),
  direction: z.string().optional(),
  tags: z.array(z.string()).default([]),
  triggers: z.array(z.record(z.unknown())).default([]),
  blocks: z.array(z.record(z.unknown())).default([]),
  connection_scopes: z.array(z.string()).default([]),
  setup_steps: z.array(z.record(z.unknown())).default([]),
  quick_setup: IntegrationQuickSetupMetaSchema.default({}),
});

export type IntegrationRecipeManifest = z.infer<typeof IntegrationRecipeManifestSchema>;

export const InstallRecipeBodySchema = z.object({
  owner_kind: IntegrationOwnerKindSchema.optional(),
  project_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  label: z.string().optional(),
  slug: z.string().optional(),
  secrets: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
});

export type InstallRecipeBody = z.infer<typeof InstallRecipeBodySchema>;

export const IntegrationsHubSectionSchema = z.enum([
  'apps',
  'gallery',
  'connections',
  'scenarios',
  'inbox',
  'deliveries',
  'issues',
  'runs',
  'diagnostics',
  'outbound',
  'api_keys',
  'legacy_webhooks',
]);

export type IntegrationsHubSection = z.infer<typeof IntegrationsHubSectionSchema>;

export const InstallRecipeResultSchema = z.object({
  success: z.literal(true),
  connection_id: z.string(),
  logic_id: z.string(),
  hook_url: z.string(),
  owner_kind: z.string(),
  project_id: z.number(),
  logic_rule_ids: z.array(z.string()).default([]),
});

export type InstallRecipeResult = z.infer<typeof InstallRecipeResultSchema>;

export const IntegrationScenarioRowSchema = z.object({
  scenario_id: z.string(),
  logic_id: z.string().optional().nullable(),
  name: z.string(),
  status: z.enum(['draft', 'testing', 'live', 'paused', 'archived']).default('draft'),
  version_pointer: z.string().optional().nullable(),
  recipe_id: z.string().optional().nullable(),
  project_id: z.number(),
  owner_kind: z.string().optional(),
  connection_ids: z.array(z.string()).default([]),
  stages: z.array(z.record(z.unknown())).default([]),
  metadata: z.record(z.unknown()).default({}),
  field_maps: z.array(z.record(z.unknown())).default([]),
  created_at: z.string().optional().nullable(),
});

export type IntegrationScenarioRow = z.infer<typeof IntegrationScenarioRowSchema>;

export const ListScenariosResponseSchema = z.object({
  scenarios: z.array(IntegrationScenarioRowSchema),
  total: z.number(),
});

export type ListScenariosResponse = z.infer<typeof ListScenariosResponseSchema>;

export const ScenarioRunRowSchema = z.object({
  run_id: z.string(),
  scenario_id: z.string().optional().nullable(),
  logic_id: z.string().optional().nullable(),
  status: z.string(),
  started_at: z.string().optional().nullable(),
  finished_at: z.string().optional().nullable(),
  duration_ms: z.number().optional().nullable(),
  error: z.string().optional().nullable(),
});

export type ScenarioRunRow = z.infer<typeof ScenarioRunRowSchema>;

export const ListScenarioRunsResponseSchema = z.object({
  runs: z.array(ScenarioRunRowSchema),
  total: z.number(),
});

export type ListScenarioRunsResponse = z.infer<typeof ListScenarioRunsResponseSchema>;

export const FieldMapSourceSchema = z.object({
  kind: z.enum(['payload', 'context', 'static', 'jmespath']).default('payload'),
  path: z.string().optional().nullable(),
  value: z.unknown().optional(),
});

export const FieldMapFormatterSchema = z.object({
  kind: z
    .enum(['identity', 'jmespath', 'template', 'json_parse', 'to_string', 'to_int', 'to_float'])
    .default('identity'),
  expression: z.string().optional().nullable(),
  template: z.string().optional().nullable(),
});

export const FieldMapSchema = z.object({
  target: z.string(),
  source: FieldMapSourceSchema.default({}),
  formatter: FieldMapFormatterSchema.default({}),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});

export type FieldMap = z.infer<typeof FieldMapSchema>;

export const InboxEventRowSchema = z.object({
  id: z.string(),
  connection_id: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
  job_id: z.string().optional().nullable(),
  correlation_id: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
});

export const ListInboxEventsResponseSchema = z.object({
  events: z.array(InboxEventRowSchema),
  total: z.number(),
});

export type ListInboxEventsResponse = z.infer<typeof ListInboxEventsResponseSchema>;

export const IntegrationIssueRowSchema = z.object({
  issue_id: z.string(),
  project_id: z.number(),
  connection_id: z.string().optional().nullable(),
  target_url: z.string().optional().nullable(),
  status_bucket: z.number().default(0),
  error_code: z.string().default('unknown'),
  count: z.number().default(0),
  last_seen: z.string().optional().nullable(),
  sample_delivery_id: z.string().optional().nullable(),
  delivery_ids: z.array(z.string()).default([]),
  suggested_action: z.string().default('replay_delivery'),
});

export const ListIssuesResponseSchema = z.object({
  issues: z.array(IntegrationIssueRowSchema),
  total: z.number(),
});

export const DiagnosticsResultSchema = z.object({
  project_id: z.number(),
  rollup_7d: z.record(z.unknown()).default({}),
  connections_count: z.number().default(0),
  workers: z
    .object({
      inbox_interval_s: z.number().default(0),
      outbound_interval_s: z.number().default(0),
      inbox_enabled: z.boolean().default(false),
      outbound_enabled: z.boolean().default(false),
    })
    .default({}),
  metrics: z
    .object({
      inbox_events_7d: z.number().default(0),
      delivery_events_7d: z.number().default(0),
      audit_events_7d: z.number().default(0),
    })
    .default({}),
  hints: z.array(z.string()).default([]),
  runbook: z.string().optional(),
  webhook_queue_depth: z.number().optional().nullable(),
  queue_depth: z.number().optional().nullable(),
  intake_p95_ms: z.number().optional().nullable(),
  intake_p95: z.number().optional().nullable(),
});

export const ReplayResultSchema = z.object({
  success: z.boolean(),
  duplicate: z.boolean().optional(),
  matched: z.number().optional(),
  error: z.string().optional().nullable(),
  results: z.array(z.record(z.unknown())).optional().nullable(),
});
