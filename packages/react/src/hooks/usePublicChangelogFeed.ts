/**
 * Public hosted changelog JSON Feed — stale 5m (nginx max-age=300).
 * Gene: core.hosting.bucket.gen1
 */

import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function usePublicChangelogFeed(
  sdk: AgentStackSDK,
  projectId: number,
  bucket: string,
  opts?: SDKQueryOptions<Awaited<ReturnType<AgentStackSDK['public']['changelog']['getFeed']>>> & {
    preview?: boolean;
  },
) {
  const preview = opts?.preview ?? false;
  return useSDKQuery(
    sdk,
    ['public', 'changelog', projectId, bucket, preview] as const,
    ({ signal }) => sdk.public.changelog.getFeed(projectId, bucket, { preview, signal }),
    {
      staleTime: 300_000,
      enabled: (opts?.enabled ?? true) && !!bucket && projectId > 0,
      ...opts,
    },
  );
}