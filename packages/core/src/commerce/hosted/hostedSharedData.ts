/**
 * Hosted shared project.data journal (games Lane A).
 * Digest parity: platform `leaf_digest` uses json.dumps(sort_keys, default=str)
 * with stdlib ensure_ascii=true — match game CPython hashing.
 * Gene: sdk.commerce.hosted.gen1
 */
import type { HTTPClient } from '../../client/http-client';
import { executeHostedMcpSteps } from './executeHostedMcpSteps';
import { mapHostedMcpPlayerError } from './hostedMcpPlayerError';

/** Server resolves digest from prior dry_run step in the same MCP batch. */
export const HOSTED_BATCH_PREVIEW_SHA = 'from_batch_preview';

export type HostedSharedDataOptions = {
  hostedApiBase?: string;
  signal?: AbortSignal;
  /** Max CAS retries on text_revision_conflict (default 3). */
  maxCasRetries?: number;
};

export async function readHostedProjectLeaf(
  http: HTTPClient,
  projectId: number,
  path: string,
  options?: HostedSharedDataOptions,
): Promise<unknown> {
  const row = await executeHostedMcpSteps(
    http,
    projectId,
    [{ id: 'step_0', action: 'projects.get_data', params: { path } }],
    {
      pickStepId: 'step_0',
      hostedApiBase: options?.hostedApiBase,
      signal: options?.signal,
      mintCookieIfBearer: false,
    },
  );
  return row.value ?? row.data;
}

/**
 * Optimistic patch with `expected_sha256`. When omitted, one batch `[dry_run, commit]`
 * uses `expected_sha256: from_batch_preview` (substrate stamps digest on context).
 */
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
  const baseOpts = {
    hostedApiBase: options?.hostedApiBase,
    signal: options?.signal,
    mintCookieIfBearer: false,
  };
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (digest) {
        return await executeHostedMcpSteps(
          http,
          projectId,
          [
            {
              id: 'commit',
              action: 'projects.patch_data',
              params: { path, value, expected_sha256: digest },
            },
          ],
          { ...baseOpts, pickStepId: 'commit' },
        );
      }
      return await executeHostedMcpSteps(
        http,
        projectId,
        [
          {
            id: 'preview',
            action: 'projects.patch_data',
            params: { path, value, dry_run: true },
          },
          {
            id: 'commit',
            action: 'projects.patch_data',
            params: {
              path,
              value,
              expected_sha256: HOSTED_BATCH_PREVIEW_SHA,
            },
          },
        ],
        { ...baseOpts, pickStepId: 'commit' },
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
