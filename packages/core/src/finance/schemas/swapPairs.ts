import { z } from 'zod';

export const SwapPairSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const SwapPairsResponseSchema = z.object({
  pairs: z.array(SwapPairSchema),
});

export type SwapPair = z.infer<typeof SwapPairSchema>;
