/**
 * hosting.site.build_status journal ship receipt (core.hosting.agent_ship.gen1).
 */
import { z } from 'zod';

export const journalBuildReceiptSchema = z.object({
  job_id: z.string().min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  preview_url: z.string().optional(),
  prod_url: z.string().optional(),
  built_from_sha: z.string().optional(),
  issues: z.array(z.unknown()).optional(),
  next_actions: z.array(z.record(z.unknown())).optional(),
  poll_backoff_ms: z.number().int().nonnegative().optional(),
});

export type JournalBuildReceipt = z.infer<typeof journalBuildReceiptSchema>;

export function parseJournalBuildReceipt(body: Record<string, unknown>): JournalBuildReceipt {
  const job = (body.job ?? {}) as Record<string, unknown>;
  const status = String(job.status ?? body.status ?? 'pending');
  const preview =
    String(job.preview_url ?? body.preview_url ?? job.url ?? '').trim() || undefined;
  return journalBuildReceiptSchema.parse({
    job_id: String(job.job_id ?? body.job_id ?? ''),
    status,
    preview_url: preview,
    prod_url: typeof body.prod_url === 'string' ? body.prod_url : undefined,
    built_from_sha: String(job.sources_sha ?? job.built_from_sha ?? '').trim() || undefined,
    issues: Array.isArray(job.issues) ? job.issues : Array.isArray(body.issues) ? body.issues : [],
    next_actions: Array.isArray(body.next_actions) ? body.next_actions : [],
    poll_backoff_ms: Number(body.poll_backoff_ms ?? job.poll_backoff_ms ?? 0) || undefined,
  });
}