/**
 * Hosted shared project.data journal (games Lane A).
 * Digest parity: platform `leaf_digest` uses json.dumps(sort_keys, default=str)
 * with stdlib ensure_ascii=true — match game CPython hashing.
 * Gene: sdk.commerce.hosted.gen1
 */
import type { HTTPClient } from '../../client/http-client';
import { mcpBatchStep, unwrapFirstMcpBatchStepData } from '../../mcp/batchStepData';
import { resolveHostedMcpUrl } from '../../mcp/urls';
import { mapHostedMcpPlayerError } from './hostedMcpPlayerError';

export type HostedSharedDataOptions = {
  hostedApiBase?: string;
  signal?: AbortSignal;
  /** Max CAS retries on text_revision_conflict (default 3). */
  maxCasRetries?: number;
};

function hostedMcpUrl(projectId: number, apiBase?: string): string {
  return resolveHostedMcpUrl(projectId, apiBase);
}

async function hostedMcpStep<T>(
  http: HTTPClient,
  projectId: number,
  action: string,
  params: Record<string, unknown>,
  options?: HostedSharedDataOptions,
): Promise<T> {
  const url = hostedMcpUrl(projectId, options?.hostedApiBase);
  const res = await http.post(
    url,
    { steps: [mcpBatchStep(action, params, projectId)] },
    {
      skipCache: true,
      signal: options?.signal,
      skipAuthStateCheck: true,
      cookieSessionMcp: true,
    },
  );
  const row = unwrapFirstMcpBatchStepData(res);
  if (row && typeof row === 'object' && (row as { ok?: boolean }).ok === false) {
    throw Object.assign(new Error(String((row as { error?: string }).error || 'mcp_failed')), {
      body: row,
    });
  }
  return row as T;
}

export async function readHostedProjectLeaf(
  http: HTTPClient,
  projectId: number,
  path: string,
  options?: HostedSharedDataOptions,
): Promise<unknown> {
  const row = await hostedMcpStep<Record<string, unknown>>(
    http,
    projectId,
    'projects.get_data',
    { project_id: projectId, path },
    options,
  );
  return row.value ?? row.data;
}

export async function patchHostedProjectLeafCAS(
  http: HTTPClient,
  projectId: number,
  path: string,
  value: unknown,
  expectedSha256?: string,
  options?: HostedSharedDataOptions,
): Promise<Record<string, unknown>> {
  const maxRetries = Math.max(1, options?.maxCasRetries ?? 3);
  let digest = expectedSha256?.trim();
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    if (!digest) {
      const preview = await hostedMcpStep<Record<string, unknown>>(
        http,
        projectId,
        'projects.patch_data',
        {
          project_id: projectId,
          path,
          value,
          dry_run: true,
          ...(digest ? { expected_sha256: digest } : {}),
        },
        options,
      );
      digest =
        String(preview.previous_sha256 || preview.leaf_sha256 || '').trim() || undefined;
    }
    try {
      return await hostedMcpStep(
        http,
        projectId,
        'projects.patch_data',
        {
          project_id: projectId,
          path,
          value,
          expected_sha256: digest,
        },
        options,
      );
    } catch (err) {
      const mapped = mapHostedMcpPlayerError(err);
      if (mapped.code !== 'text_revision_conflict' || attempt + 1 >= maxRetries) {
        throw err;
      }
      digest = undefined;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    }
  }
  throw new Error('hosted_patch_cas_exhausted');
}
