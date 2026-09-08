/**
 * Organ Descriptor schema — SDK mirror (`core.composition.organ_descriptor.gen1`).
 * Parity with Python `shared/atoms/organ_descriptor.py`.
 */
import { z } from 'zod';

export const organKindSchema = z.enum([
  'organelle',
  'processor',
  'mcp_domain',
  'surface',
  'frontend_module',
  'ecs_system',
  'cell',
  'plugin_skill',
  'fabric_domain',
]);

export const organTemplateSchema = z.object({
  label: z.string().min(1),
  code: z.string().default(''),
  language: z.string().default('python'),
});

export const organDescriptorSchema = z.object({
  id: z.string().min(1),
  kind: organKindSchema,
  genetic_tags: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  when_to_use: z.string().default(''),
  anti_patterns: z.array(z.string()).default([]),
  ai_hints: z.array(z.string()).default([]),
  usage: z.string().default(''),
  templates: z.array(organTemplateSchema).max(3).default([]),
  capability_ids: z.array(z.string()).default([]),
  mcp_prefixes: z.array(z.string()).default([]),
  data_paths: z.array(z.string()).default([]),
  rest_tags: z.array(z.string()).default([]),
  surfaces: z.array(z.string()).default([]),
  hot_files: z.array(z.string()).default([]),
  ai_index_path: z.string().default(''),
  owner_gene: z.string().default(''),
  cache_ns: z.string().nullable().optional(),
  cache_tags: z.array(z.string()).default([]),
  nav_hint: z.record(z.unknown()).nullable().optional(),
  ptc_task_ids: z.array(z.string()).default([]),
  mutation_category: z.string().nullable().optional(),
  neural_actions: z.array(z.string()).default([]),
});

export const organDescriptorFixtureSchema = z.object({
  version: z.number().int().min(1),
  descriptors: z.array(organDescriptorSchema).min(1),
});

export type OrganKind = z.infer<typeof organKindSchema>;
export type OrganTemplate = z.infer<typeof organTemplateSchema>;
export type OrganDescriptor = z.infer<typeof organDescriptorSchema>;
export type OrganDescriptorFixture = z.infer<typeof organDescriptorFixtureSchema>;

export function parseOrganDescriptor(input: unknown): OrganDescriptor {
  return organDescriptorSchema.parse(input);
}

export function parseOrganDescriptorFixture(input: unknown): OrganDescriptorFixture {
  return organDescriptorFixtureSchema.parse(input);
}
