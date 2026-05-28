/**
 * Notification templates for a project (dashboard / rule editor).
 */

import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { BaseHookOptions } from './types';

export interface NotificationTemplate {
  id: number;
  title: string;
  channel: string;
}

export interface UseNotificationsDataOptions extends BaseHookOptions {
  projectId?: number;
}

export function useNotificationsData(
  sdk: AgentStackSDK,
  options: UseNotificationsDataOptions = {}
): UseQueryResult<NotificationTemplate[], Error> {
  const { projectId, enabled = true, staleTime = 2 * 60 * 1000, refreshInterval = false } =
    options;

  return useSDKQuery<NotificationTemplate[]>(
    sdk,
    ['notification-templates', projectId],
    async (signal) => {
      if (projectId == null || !sdk?.notifications) return [];
      const response = await sdk.httpClient.get(
        `/notifications/${projectId}/templates`,
        undefined,
        { signal }
      );
      const body = response.data as { templates?: unknown[] };
      const templates = body.templates || [];
      return (templates as Record<string, unknown>[]).map((n, i) => ({
        id: Number(n.id ?? n.template_id ?? i),
        title: String(n.name ?? n.title ?? `Template ${i}`),
        channel: String(n.channel ?? 'in_app'),
      }));
    },
    {
      enabled: enabled && projectId != null && !!sdk?.notifications,
      staleTime,
      refetchInterval: refreshInterval === false ? false : refreshInterval,
    }
  );
}
