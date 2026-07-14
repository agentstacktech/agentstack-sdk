/**
 * Principal context — SDK mirror (`sdk.fabric.gen1`).
 */
import { z } from 'zod';

export const principalKindSchema = z.enum([
  'http_session',
  'api_key',
  'agent_run',
  'signal_cdc',
  'support_ai',
  'system',
]);

export const principalContextSchema = z.object({
  kind: principalKindSchema,
  user_id: z.number().int().optional(),
  project_id: z.number().int().optional(),
  role: z.string().optional(),
  permissions_bitmap: z.number().int().optional(),
  key_service_caps: z.array(z.string()).nullable().optional(),
  is_ecosystem: z.boolean().default(false),
  agent_id: z.string().optional(),
  agent_policy_allowlist: z.array(z.string()).nullable().optional(),
  agent_forbidden_tools: z.array(z.string()).default([]),
  approval_required_actions: z.array(z.string()).default([]),
  untrusted_input_taint: z.boolean().default(false),
  trusted_internal: z.boolean().default(false),
  trace_id: z.string().optional(),
});

export const effectiveCapabilitiesSchema = z.object({
  allowed: z.boolean(),
  deny_reason: z.string().optional(),
  effective_caps: z.array(z.string()).default([]),
  fap_resources: z.array(z.string()).default([]),
  requires_approval: z.boolean().default(false),
});

export type PrincipalKind = z.infer<typeof principalKindSchema>;
export type PrincipalContext = z.infer<typeof principalContextSchema>;
export type EffectiveCapabilities = z.infer<typeof effectiveCapabilitiesSchema>;

export function parsePrincipalContext(input: unknown): PrincipalContext {
  return principalContextSchema.parse(input);
}
