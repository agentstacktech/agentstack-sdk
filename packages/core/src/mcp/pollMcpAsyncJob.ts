/**
 * Poll discovery.job_status after options.async=true execute (SDK-02).
 */
import { firstMcpBatchStep, listMcpBatchSteps, mcpStepData } from './batchStepData';

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function jobIdString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function jobIdFromRecord(rec: Record<string, unknown> | null): string | null {
  if (!rec) return null;
  const direct = jobIdString(rec.job_id);
  if (direct) return direct;
  const taskId = jobIdString(asRecord(rec.task)?.taskId);
  if (taskId) return taskId;
  const fromPoll = jobIdString(asRecord(asRecord(rec.poll)?.params)?.job_id);
  if (fromPoll) return fromPoll;
  const data = asRecord(rec.data);
  if (data && data !== rec) {
    const nested = jobIdString(data.job_id) ?? jobIdString(asRecord(data.task)?.taskId);
    if (nested) return nested;
  }
  const structured = asRecord(rec.structuredContent);
  if (structured && structured !== rec) {
    return jobIdFromRecord(structured);
  }
  return null;
}

function jobIdFromToolsCallText(rec: Record<string, unknown>): string | null {
  const result = asRecord(rec.result) ?? rec;
  const content = result.content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    const text = asRecord(block)?.text;
    if (typeof text !== 'string' || !text.trim()) continue;
    try {
      const parsed = jobIdFromRecord(asRecord(JSON.parse(text) as unknown));
      if (parsed) return parsed;
    } catch {
      /* not JSON */
    }
  }
  return null;
}

export function extractMcpAsyncJobId(envelope: unknown): string | null {
  const root = asRecord(envelope);
  if (!root) return null;
  const data = asRecord(root.data) ?? root;
  const fromData = jobIdFromRecord(data);
  if (fromData) return fromData;
  return (
    jobIdFromRecord(root) ??
    jobIdFromRecord(asRecord(root.result)) ??
    jobIdFromToolsCallText(root)
  );
}

function looksLikeJobStatus(rec: Record<string, unknown>): boolean {
  return typeof rec.status === 'string' || Array.isArray(rec.steps);
}

function isDurableJobRecord(rec: Record<string, unknown> | null): boolean {
  return Boolean(rec && typeof rec.job_id === 'string' && typeof rec.status === 'string');
}

export function unwrapMcpJobStatusRecord(row: Record<string, unknown>): Record<string, unknown> {
  let current = row;
  for (let depth = 0; depth < 3; depth += 1) {
    const inner = asRecord(current.data);
    if (inner && inner !== current && isDurableJobRecord(inner)) {
      current = inner;
      continue;
    }
    if (looksLikeJobStatus(current)) return current;
    if (inner && inner !== current && looksLikeJobStatus(inner)) {
      current = inner;
      continue;
    }
    break;
  }
  return current;
}

export function extractMcpJobTerminalStepData(
  terminal: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const body = unwrapMcpJobStatusRecord(terminal);
  const step = firstMcpBatchStep({ steps: listMcpBatchSteps(body) });
  const data = step ? mcpStepData(step) : undefined;
  if (data && Object.keys(data).length > 0) return data;
  const result = asRecord(body.result);
  if (result) {
    const fromResult = mcpStepData(result);
    if (fromResult && Object.keys(fromResult).length > 0) return fromResult;
  }
  return asRecord(body.data) ?? undefined;
}

export type McpAsyncJobPollClient = (
  action: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

export type PollMcpAsyncJobOptions = {
  client: McpAsyncJobPollClient;
  jobId: string;
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  onProgress?: (envelope: Record<string, unknown>) => void;
};

export async function pollMcpAsyncJobUntilTerminal(
  opts: PollMcpAsyncJobOptions,
): Promise<Record<string, unknown>> {
  const baseInterval = Math.max(1500, opts.intervalMs ?? 2500);
  const max = Math.max(1, opts.maxAttempts ?? 480);
  let last: Record<string, unknown> = { job_id: opts.jobId, status: 'queued' };
  let delayMs = baseInterval;

  for (let i = 0; i < max; i += 1) {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const raw = await opts.client('discovery.job_status', { job_id: opts.jobId });
    const row = asRecord(raw) ?? {};
    const data = unwrapMcpJobStatusRecord(row);
    last = data;
    opts.onProgress?.(data);
    const status = String(data.status ?? '').toLowerCase();
    if (TERMINAL.has(status)) {
      return { ...data, status, job_id: opts.jobId, error: data.error };
    }
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(Math.round(delayMs * 1.25), 10_000);
  }
  return last;
}