/**
 * Context Fabric atoms — SDK mirror (`sdk.fabric.gen1`).
 */
import { z } from 'zod';

export const contextSourceSchema = z.enum(['rag', 'memory', 'dna_snapshot']);

export const contextRequestSchema = z.object({
  task: z.string().min(1),
  project_id: z.number().int(),
  user_id: z.number().int().default(0),
  token_budget: z.number().int().min(200).max(32000).default(2000),
  sources: z.array(contextSourceSchema).min(1).default(['rag', 'memory']),
  collection_id: z.string().optional(),
  resources: z.array(z.string()).default([]),
  query: z.string().optional(),
  federated_project_ids: z.array(z.number().int()).default([]),
});

export const contextCitationSchema = z.object({
  source: z.string().min(1),
  entity_uuid: z.string().optional(),
  score: z.number().optional(),
  snippet_range: z.array(z.number().int()).length(2).optional(),
});

export const contextSnippetSchema = z.object({
  text: z.string(),
  source: contextSourceSchema,
  score: z.number().default(0),
  citation: contextCitationSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const contextBundleSchema = z.object({
  snippets: z.array(contextSnippetSchema).default([]),
  estimated_tokens: z.number().int().nonnegative().default(0),
  cache_key: z.string().min(1),
  citations: z.array(contextCitationSchema).default([]),
  sources_used: z.array(contextSourceSchema).default([]),
});

export type ContextRequest = z.infer<typeof contextRequestSchema>;
export type ContextCitation = z.infer<typeof contextCitationSchema>;
export type ContextSnippet = z.infer<typeof contextSnippetSchema>;
export type ContextBundle = z.infer<typeof contextBundleSchema>;

export function parseContextRequest(input: unknown): ContextRequest {
  return contextRequestSchema.parse(input);
}

export function parseContextBundle(input: unknown): ContextBundle {
  return contextBundleSchema.parse(input);
}
