/**
 * Poll hosting.site.build_status with backoff (core.hosting.bucket.gen1).
 */
export type HostingBuildJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type BuildStatusPollResult = {
  status: HostingBuildJobStatus;
  body: Record<string, unknown>;
};

export type ExecuteMcp = (
  action: string,
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export type PollBuildOptions = {
  jobId: string;
  execute: ExecuteMcp;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  onPoll?: (body: Record<string, unknown>) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap MCP hosting.site.build_status until terminal or timeout.
 */
export async function pollBuildUntilTerminal(
  options: PollBuildOptions,
): Promise<BuildStatusPollResult> {
  const {
    jobId,
    execute,
    initialDelayMs = 2_000,
    maxDelayMs = 30_000,
    timeoutMs = 15 * 60_000,
  } = options;
  const started = Date.now();
  let delay = initialDelayMs;
  while (Date.now() - started < timeoutMs) {
    const body = await execute('hosting.site.build_status', { job_id: jobId });
    options.onPoll?.(body);
    const job = (body.job ?? {}) as Record<string, unknown>;
    const status = String(job.status ?? body.status ?? '') as HostingBuildJobStatus;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return { status, body };
    }
    const hint = Number(body.poll_backoff_ms ?? job.poll_backoff_ms ?? delay);
    delay = Math.min(maxDelayMs, Math.max(initialDelayMs, hint));
    await sleep(delay);
  }
  throw new Error(`hosting build poll timeout job_id=${jobId}`);
}