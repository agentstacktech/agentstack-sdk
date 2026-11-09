/**
 * Poll hosting.site.build jobs — sdk.hosting.gen2
 */

import type { HTTPClient } from '../client/http-client';

export class HostingBuildError extends Error {
  readonly code: string;
  readonly job?: Record<string, unknown>;

  constructor(message: string, opts?: { code?: string; job?: Record<string, unknown> }) {
    super(message);
    this.name = 'HostingBuildError';
    this.code = opts?.code ?? 'build_failed';
    this.job = opts?.job;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BuildSiteAsyncParams = {
  project_id: number;
  bucket_id?: string;
  bucket_name?: string;
  profile?: string;
  publish?: boolean;
  target?: 'dev' | 'prod';
  force?: boolean;
};

export type BuildSiteAsyncOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onStatus?: (job: Record<string, unknown>) => void;
};

export async function buildSiteAsync(
  client: HTTPClient,
  params: BuildSiteAsyncParams,
  opts?: BuildSiteAsyncOptions,
): Promise<Record<string, unknown>> {
  const enq = await client.post<{ job_id?: string; enqueued?: boolean }>('/mcp/execute', {
    action: 'hosting.site.build',
    params: { ...params, async: true },
  });
  const body = enq.data as Record<string, unknown>;
  const jobId = String(body.job_id ?? (body as { job_id?: string }).job_id ?? '');
  if (!jobId) {
    if (body.status === 'completed' || body.result) {
      return body;
    }
    throw new HostingBuildError('missing job_id', { code: 'missing_job_id' });
  }
  const deadline = Date.now() + (opts?.timeoutMs ?? 15 * 60_000);
  const interval = opts?.pollIntervalMs ?? 1500;
  while (Date.now() < deadline) {
    const stRes = await client.post<{ job?: Record<string, unknown> }>('/mcp/execute', {
      action: 'hosting.site.build_status',
      params: { job_id: jobId, project_id: params.project_id },
    });
    const job = (stRes.data?.job ?? stRes.data) as Record<string, unknown>;
    opts?.onStatus?.(job);
    const status = String(job.status ?? '');
    if (status === 'failed') {
      throw new HostingBuildError(String(job.error ?? 'build failed'), {
        code: 'build_failed',
        job,
      });
    }
    if (status === 'completed') {
      return job;
    }
    if (status === 'cancelled') {
      throw new HostingBuildError(String(job.error ?? 'build cancelled'), {
        code: 'build_cancelled',
        job,
      });
    }
    await sleep(interval);
  }
  throw new HostingBuildError('build timeout', { code: 'build_timeout' });
}

export async function cancelHostingBuild(
  client: HTTPClient,
  params: { job_id: string; project_id?: number },
): Promise<Record<string, unknown>> {
  const res = await client.post<Record<string, unknown>>('/mcp/execute', {
    action: 'hosting.site.build_cancel',
    params,
  });
  return (res.data ?? {}) as Record<string, unknown>;
}

export async function hostingGitMigrate(
  client: HTTPClient,
  params: {
    project_id: number;
    bucket_id: string;
    dry_run?: boolean;
    path_prefixes?: string[];
  },
): Promise<Record<string, unknown>> {
  const res = await client.post<Record<string, unknown>>('/mcp/execute', {
    action: 'hosting.git.migrate',
    params,
  });
  return (res.data ?? {}) as Record<string, unknown>;
}
