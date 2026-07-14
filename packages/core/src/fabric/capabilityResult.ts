/**
 * Capability result envelope — SDK mirror (`sdk.fabric.gen1`).
 */
import { z } from 'zod';

import { contextCitationSchema } from './contextBundle';

export const capabilityErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  retryable: z.boolean().default(false),
  details: z.record(z.unknown()).default({}),
});

export const capabilityCostSchema = z.object({
  tokens: z.number().int().nonnegative().default(0),
  usd: z.number().nonnegative().default(0),
  credits: z.number().nonnegative().default(0),
});

export const capabilityCacheInfoSchema = z.object({
  hit: z.boolean().default(false),
  key: z.string().optional(),
});

export const capabilityResultSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: capabilityErrorSchema.optional(),
  trace_id: z.string().optional(),
  cost: capabilityCostSchema.default({}),
  citations: z.array(contextCitationSchema).default([]),
  cache: capabilityCacheInfoSchema.default({}),
});

export type CapabilityError = z.infer<typeof capabilityErrorSchema>;
export type CapabilityCost = z.infer<typeof capabilityCostSchema>;
export type CapabilityCacheInfo = z.infer<typeof capabilityCacheInfoSchema>;
export type CapabilityResult = z.infer<typeof capabilityResultSchema>;

export function parseCapabilityResult(input: unknown): CapabilityResult {
  return capabilityResultSchema.parse(input);
}
