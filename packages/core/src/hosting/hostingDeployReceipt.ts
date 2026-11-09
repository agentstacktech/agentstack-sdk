/**
 * MCP hosting.deploy_files receipt fields (core.hosting.bucket.gen1).
 */
import { z } from 'zod';

export const hostingDeployStateSchema = z.enum([
  'staged',
  'promoted',
  'publish_failed',
  'rolled_back',
  'ready',
]);

export const hostingDeployReceiptSchema = z.object({
  batch_bytes: z.number().int().nonnegative().optional(),
  live_tree_bytes: z.number().int().nonnegative().optional(),
  live_changed: z.boolean().optional(),
  live_release_before: z.string().optional(),
  generation_id: z.string().optional(),
  upload_session_id: z.string().optional(),
  finalized: z.boolean().optional(),
  publish_failed: z.boolean().optional(),
  committed: z.boolean().optional(),
  success: z.boolean().optional(),
  state: hostingDeployStateSchema.optional(),
  url: z.string().url().optional(),
  manifest_hash: z.string().optional(),
  edge_ready: z.boolean().optional(),
});

export type HostingDeployReceipt = z.infer<typeof hostingDeployReceiptSchema>;
