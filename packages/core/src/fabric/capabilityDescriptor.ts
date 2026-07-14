/**
 * Capability Descriptor schema — SDK mirror (`sdk.fabric.gen1`).
 * Parity with Python `shared/atoms/capability_descriptor.py`.
 */
import { z } from 'zod';

export const capabilitySurfaceSchema = z.enum([
  'mcp',
  'ui_form',
  'compass',
  'ptc',
  'rsk',
  'logic_block',
  'trigger_action',
]);

export const mutationRiskSchema = z.enum(['none', 'low', 'high']);
export const riskTierSchema = z.enum(['safe', 'sensitive', 'privileged']);
export const approvalPolicySchema = z.enum(['never', 'high_risk', 'always']);
export const rbacPermissionSchema = z.enum(['read', 'write', 'admin', 'owner']);
export const paramEditorSchema = z.enum(['jmespath', 'expression', 'path', 'textarea']);
export const contextSourceSchema = z.enum(['rag', 'memory', 'dna_snapshot']);

export const capabilityParamSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().default(false),
  description: z.string().default(''),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
  example: z.unknown().optional(),
  editor: paramEditorSchema.optional(),
  resource_ref: z.string().optional(),
});

export const capabilityContextSpecSchema = z.object({
  sources: z.array(contextSourceSchema).min(1).default(['rag']),
  token_budget: z.number().int().min(200).max(32000).default(2000),
  collection_id: z.string().optional(),
  resources: z.array(z.string()).default([]),
});

export const capabilityDescriptorSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  version: z.number().int().min(1).default(1),
  deprecated: z.boolean().default(false),
  superseded_by: z.string().optional(),
  params: z.array(capabilityParamSchema).default([]),
  returns: z.record(z.unknown()).default({}),
  required_caps: z.array(z.string()).default([]),
  rbac_permission: rbacPermissionSchema.default('read'),
  mutates_resources: z.array(z.string()).default([]),
  context: capabilityContextSpecSchema.nullable().optional(),
  surfaces: z.array(capabilitySurfaceSchema).min(1).default(['mcp']),
  genetic_tags: z.array(z.string()).default([]),
  mutation_risk: mutationRiskSchema.default('none'),
  risk_tier: riskTierSchema.default('safe'),
  idempotent: z.boolean().default(true),
  reversible: z.boolean().default(false),
  approval: approvalPolicySchema.default('never'),
  when_to_use: z.string().default(''),
  related_tools: z.array(z.string()).default([]),
  complexity: z.enum(['simple', 'intermediate', 'advanced']).default('intermediate'),
});

export const capabilityDescriptorFixtureSchema = z.object({
  version: z.number().int().min(1),
  descriptors: z.array(capabilityDescriptorSchema).min(1),
});

export type CapabilitySurface = z.infer<typeof capabilitySurfaceSchema>;
export type CapabilityParam = z.infer<typeof capabilityParamSchema>;
export type CapabilityContextSpec = z.infer<typeof capabilityContextSpecSchema>;
export type CapabilityDescriptor = z.infer<typeof capabilityDescriptorSchema>;
export type CapabilityDescriptorFixture = z.infer<typeof capabilityDescriptorFixtureSchema>;

export function parseCapabilityDescriptor(input: unknown): CapabilityDescriptor {
  return capabilityDescriptorSchema.parse(input);
}

export function parseCapabilityDescriptorFixture(input: unknown): CapabilityDescriptorFixture {
  return capabilityDescriptorFixtureSchema.parse(input);
}
