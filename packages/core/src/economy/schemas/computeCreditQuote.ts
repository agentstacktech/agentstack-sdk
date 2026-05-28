import { z } from 'zod';

export const ComputeCreditQuoteSchema = z.object({
  quote_id: z.union([z.string(), z.number()]).transform(String),
  quote_hash: z.string(),
  credits_atomic: z.number().int().positive(),
  agnt_cost_atomic: z.number().int().nonnegative().optional(),
  expires_at: z.string(),
  buyer_user_id: z.number().int().optional(),
});

export type ComputeCreditQuote = z.infer<typeof ComputeCreditQuoteSchema>;
