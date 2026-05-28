/**
 * AI Builder project versions + snapshots (read-only list via React Query).
 */

import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { BaseHookOptions } from './types';

export interface VersionInfo {
  current_branch: string;
  dev_version: string;
  prod_version: string | null;
  has_prod: boolean;
  last_publish: string | null;
}

export interface ProjectSnapshot {
  id: string;
  version: string;
  created_at: string;
  description: string;
  branch: string;
}

export interface ProjectVersionsPayload {
  version_info: VersionInfo | null;
  snapshots: ProjectSnapshot[];
}

export interface UseProjectVersionsDataOptions extends BaseHookOptions {
  projectId: number;
}

export function useProjectVersionsData(
  sdk: AgentStackSDK,
  options: UseProjectVersionsDataOptions
): UseQueryResult<ProjectVersionsPayload, Error> {
  const { projectId, enabled = true, staleTime = 60 * 1000, refreshInterval = false } = options;

  return useSDKQuery<ProjectVersionsPayload>(
    sdk,
    ['ai-builder-project-versions', projectId],
    async (signal) => {
      const res = await sdk.httpClient.get<{
        version_info?: VersionInfo;
        snapshots?: ProjectSnapshot[];
      }>(`/ai-builder/projects/${projectId}/versions`, undefined, { signal });
      const data = res.data as {
        version_info?: VersionInfo;
        snapshots?: ProjectSnapshot[];
      };
      return {
        version_info: data.version_info ?? null,
        snapshots: data.snapshots ?? [],
      };
    },
    {
      enabled: enabled && projectId > 0,
      staleTime,
      refetchInterval: refreshInterval === false ? false : refreshInterval,
    }
  );
}
