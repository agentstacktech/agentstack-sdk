/**
 * Zod mirror of shared integration app catalog atoms — genetic: ``sdk.integrations.gen1``.
 */
import { z } from 'zod';

export const AppAuthFieldSchema = z.object({
  key: z.string(),
  title: z.string(),
  type: z.string().default('string'),
  format: z.string().optional().nullable(),
  required: z.boolean().default(false),
  source: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type AppAuthField = z.infer<typeof AppAuthFieldSchema>;

export const AppOAuthConfigSchema = z.object({
  authorize_url: z.string().optional().nullable(),
  token_url: z.string().optional().nullable(),
  scopes: z.array(z.string()).default([]),
  redirect_path: z.string().optional().nullable(),
});

export type AppOAuthConfig = z.infer<typeof AppOAuthConfigSchema>;

export const AppAuthSpecSchema = z.object({
  mode: z.string().default('shared_secret'),
  fields: z.array(AppAuthFieldSchema).default([]),
  oauth: AppOAuthConfigSchema.optional().nullable(),
});

export type AppAuthSpec = z.infer<typeof AppAuthSpecSchema>;

export const DynamicFieldSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['select', 'dynamic']).default('select'),
  depends_on: z.array(z.string()).default([]),
  endpoint: z.string().optional().nullable(),
  options: z.array(z.record(z.string())).default([]),
});

export type DynamicFieldSource = z.infer<typeof DynamicFieldSourceSchema>;

export const AppTriggerSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.enum(['webhook', 'polling']).default('webhook'),
  event_type: z.string().optional().nullable(),
  sample_payload: z.record(z.unknown()).optional().nullable(),
});

export type AppTriggerSpec = z.infer<typeof AppTriggerSpecSchema>;

export const AppActionSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  input_schema: z.record(z.unknown()).default({}),
  output_schema: z.record(z.unknown()).default({}),
});

export type AppActionSpec = z.infer<typeof AppActionSpecSchema>;

export const AppDefinitionSchema = z.object({
  provider_id: z.string(),
  name: z.string(),
  version: z.number().int().default(1),
  description: z.string().optional().nullable(),
  icon_key: z.string().default('generic'),
  docs_url: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  auth: AppAuthSpecSchema.default({ mode: 'shared_secret', fields: [] }),
  config: z.record(z.unknown()).default({}),
  triggers: z.array(AppTriggerSpecSchema).default([]),
  actions: z.array(AppActionSpecSchema).default([]),
  dynamic_fields: z.array(DynamicFieldSourceSchema).default([]),
  sample_payloads: z.array(z.record(z.unknown())).default([]),
  setup_steps: z.array(z.record(z.unknown())).default([]),
  recipe_ids: z.array(z.string()).default([]),
});

export type AppDefinition = z.infer<typeof AppDefinitionSchema>;

export const ListAppsResponseSchema = z.object({
  apps: z.array(AppDefinitionSchema),
  total: z.number().int(),
});

export type ListAppsResponse = z.infer<typeof ListAppsResponseSchema>;

export const GetAppResponseSchema = z.object({
  app: AppDefinitionSchema,
});

export type GetAppResponse = z.infer<typeof GetAppResponseSchema>;

export const DynamicFieldsResponseSchema = z.object({
  provider: z.string(),
  fields: z.array(DynamicFieldSourceSchema),
  total: z.number().int(),
});

export type DynamicFieldsResponse = z.infer<typeof DynamicFieldsResponseSchema>;
