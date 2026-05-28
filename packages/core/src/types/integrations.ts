/**
 * Zod mirror of shared Integration Hub atoms — genetic: ``sdk.integrations.gen1``.
 */
import { z } from 'zod';

export const IntegrationOwnerKindSchema = z.enum(['project', 'personal']);
export type IntegrationOwnerKind = z.infer<typeof IntegrationOwnerKindSchema>;

export const IntegrationHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'error', 'unknown']).optional(),
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
});

export type InstallRecipeBody = z.infer<typeof InstallRecipeBodySchema>;

export const IntegrationsHubSectionSchema = z.enum([
  'gallery',
  'connections',
  'inbox',
  'deliveries',
  'issues',
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
