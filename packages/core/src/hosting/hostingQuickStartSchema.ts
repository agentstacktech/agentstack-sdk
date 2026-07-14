/**
 * Quick-start response contract (`sdk.hosting.gen2` / GA-12).
 */
import { z } from 'zod';

export const hostingQuickStartResponseSchema = z.object({
  success: z.boolean().optional(),
  bucket_id: z.string().min(1),
  site_id: z.string().optional(),
  url: z.string().optional(),
  skipped: z.boolean().optional(),
  edge_ready: z.boolean().optional(),
  manifest_hash: z.string().optional(),
});

export type HostingQuickStartResponse = z.infer<typeof hostingQuickStartResponseSchema>;
