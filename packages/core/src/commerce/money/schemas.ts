import { z } from 'zod';

export const MoneySchema = z.object({
  amount: z.number().int(),
  currency: z.string().min(1),
  decimals: z.number().int().min(0).max(8),
});

export type MoneyDto = z.infer<typeof MoneySchema>;
