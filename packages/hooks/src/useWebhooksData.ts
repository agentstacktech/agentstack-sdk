/**
 * @agentstack/hooks - useWebhooksData
 * AI-First Design: Self-documenting hook for webhooks
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useWebhooksData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';

/**
 * Webhook data structure
 * AI: Main webhook object
 */
export interface Webhook {
  id: number;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
  created_at: string;
  updated_at: string;
  last_triggered_at?: string;
  success_count?: number;
  failure_count?: number;
  metadata?: Record<string, any>;
}

/**
 * Webhook filters
 * AI: Use to filter webhooks
 */
export interface WebhookFilters {
  is_active?: boolean;
  event_type?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Base hook options
 */
export interface BaseHookOptions {
  refreshInterval?: number | false;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook options for webhooks data
 */
export interface UseWebhooksDataOptions extends BaseHookOptions {
  filters?: WebhookFilters;
  project_id?: number;
}

/**
 * Hook result
 */
export interface UseWebhooksDataResult extends Omit<UseQueryResult<Webhook[], Error>, 'data'> {
  data: Webhook[];
  filters: WebhookFilters;
}

/**
 * useWebhooksData Hook
 * 
 * Fetches webhooks with optional filtering.
 * Perfect for webhook management and monitoring.
 * 
 * 🤖 AI NOTE: Pass SDK instance from useSDK()
 * 
 * @param sdk - AgentStack SDK instance
 * @param options - Hook options including filters
 * @returns Webhooks array with loading and error states
 * 
 * @example
 * ```typescript
 * import { useSDK } from '@/lib/react-sdk-provider';
 * 
 * const sdk = useSDK();
 * 
 * // All webhooks:
 * const { data } = useWebhooksData(sdk);
 * 
 * // Filter by active:
 * const { data } = useWebhooksData(sdk, {
 *   filters: { is_active: true }
 * });
 * 
 * // Filter by event:
 * const { data } = useWebhooksData(sdk, {
 *   filters: { event_type: 'payment.success' }
 * });
 * 
 * // Custom UI:
 * return (
 *   <div>
 *     {data.map(webhook => (
 *       <WebhookCard key={webhook.id}>
 *         <div>{webhook.url}</div>
 *         <div>Events: {webhook.events.join(', ')}</div>
 *         <div>Status: {webhook.is_active ? 'Active' : 'Inactive'}</div>
 *       </WebhookCard>
 *     ))}
 *   </div>
 * );
 * ```
 * 
 * AI: Webhooks for real-time integrations!
 */
export function useWebhooksData(
  sdk: AgentStackSDK,
  options: UseWebhooksDataOptions = {}
): UseWebhooksDataResult {
  const {
    filters = {},
    project_id,
    refreshInterval = 60000,
    enabled = true,
    staleTime = 5 * 60 * 1000
  } = options;

  const queryResult = useSDKQuery<Webhook[]>(
    sdk,
    ['webhooks', project_id, filters],
    async (signal) => {
      try {
        const params: Record<string, unknown> = Object.entries(filters)
          .filter(([_, value]) => value !== undefined && value !== '')
          .reduce<Record<string, unknown>>(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {}
          );

        if (project_id !== undefined) params.project_id = project_id;

        const response = await sdk.httpClient.get('/webhooks', params, { signal });
        return response.data?.webhooks || response.data || [];
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) {
          console.warn('🔗 Webhooks service not available - graceful empty response');
          return [];
        }
        throw error;
      }
    },
    {
      refetchInterval: refreshInterval === false ? false : refreshInterval,
      enabled,
      staleTime,
    }
  );
  
  return {
    ...queryResult,
    data: queryResult.data || [],
    filters
  };
}

/**
 * AI NOTES:
 * 
 * Webhooks enable real-time integrations:
 * - Event subscriptions
 * - HTTP callbacks
 * - Retry logic
 * - Success/failure tracking
 * 
 * Common events:
 * - payment.success
 * - payment.failed
 * - user.created
 * - project.updated
 * 
 * Use for:
 * - Third-party integrations
 * - Real-time notifications
 * - Event-driven architecture
 */

