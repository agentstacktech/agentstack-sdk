/**
 * @agentstack/hooks
 * Shared data hooks for AgentStack SDK
 * 
 * 🤖 AI-FIRST DESIGN
 * 
 * These hooks provide a consistent, type-safe way to fetch and manage data.
 * All hooks use React Query for caching, auto-refresh, and error handling.
 * 
 * QUICK START:
 * ```typescript
 * import { useSecurityData, useAuditData } from '@agentstack/hooks'
 * 
 * const { data, isLoading } = useSecurityData();
 * ```
 * 
 * FEATURES:
 * - ✅ Type-safe (TypeScript inference)
 * - ✅ Auto-refresh (configurable)
 * - ✅ Caching (React Query)
 * - ✅ Error handling (built-in)
 * - ✅ Loading states (automatic)
 * - ✅ Self-documenting (JSDoc)
 */

// ═══════════════════════════════════════════════════════════
// Hooks Exports
// ═══════════════════════════════════════════════════════════

export { useSecurityData } from './useSecurityData';
export type { 
  UseSecurityDataOptions, 
  UseSecurityDataResult 
} from './useSecurityData';

export { useAuditData } from './useAuditData';
export type { 
  UseAuditDataOptions, 
  UseAuditDataResult 
} from './useAuditData';

export { useAnalyticsData } from './useAnalyticsData';
export type { 
  UseAnalyticsDataOptions, 
  UseAnalyticsDataResult 
} from './useAnalyticsData';

export { useWalletData } from './useWalletData';
export type { 
  UseWalletDataOptions, 
  UseWalletDataResult 
} from './useWalletData';

export { useUsersData } from './useUsersData';
export type { 
  UseUsersDataOptions, 
  UseUsersDataResult,
  User as UserData,
  UserFilters 
} from './useUsersData';

export { useWebhooksData } from './useWebhooksData';
export type { 
  UseWebhooksDataOptions, 
  UseWebhooksDataResult,
  Webhook,
  WebhookFilters 
} from './useWebhooksData';

export { useSchedulerData } from './useSchedulerData';
export type { 
  UseSchedulerDataOptions, 
  UseSchedulerDataResult,
  ScheduledTask,
  TaskExecution,
  SchedulerFilters 
} from './useSchedulerData';

export { useProjectsData } from './useProjectsData';
export type { 
  UseProjectsDataOptions, 
  UseProjectsDataResult,
  Project,
  ProjectFilters 
} from './useProjectsData';

export { useNotificationsData } from './useNotificationsData';
export type {
  NotificationTemplate,
  UseNotificationsDataOptions,
} from './useNotificationsData';

export { useProjectVersionsData } from './useProjectVersionsData';
export type {
  ProjectSnapshot,
  ProjectVersionsPayload,
  UseProjectVersionsDataOptions,
  VersionInfo,
} from './useProjectVersionsData';

// ═══════════════════════════════════════════════════════════
// Types Exports
// ═══════════════════════════════════════════════════════════

export type {
  // Security
  SecurityEvent,
  SecurityFilters,
  SecuritySeverity,
  SecurityEventType,
  
  // Audit
  AuditLog,
  AuditFilters,
  AuditAction,
  AuditResourceType,
  
  // Analytics
  AnalyticsMetrics,
  AnalyticsOptions,
  AnalyticsPeriod,
  
  // Wallet
  Wallet,
  WalletFilters,
  WalletType,
  CurrencyBalance,
  
  // Common
  BaseHookOptions,
  
  // Re-exports from @agentstack/sdk (Project: use useProjectsData export above)
  User,
  Session,
  ApiKey,
  Role
} from './types';

// ═══════════════════════════════════════════════════════════
// Version
// ═══════════════════════════════════════════════════════════

export const VERSION = '0.4.5';

// ═══════════════════════════════════════════════════════════
// AI USAGE GUIDE
// ═══════════════════════════════════════════════════════════

/**
 * AI QUICK REFERENCE:
 * 
 * 1. SECURITY EVENTS:
 *    const { data } = useSecurityData();
 *    → SecurityEvent[]
 * 
 * 2. AUDIT LOGS:
 *    const { data } = useAuditData();
 *    → AuditLog[]
 * 
 * 3. ANALYTICS:
 *    const { data } = useAnalyticsData({ period: '7d' });
 *    → AnalyticsMetrics
 * 
 * 4. WALLETS:
 *    const { data } = useWalletData();
 *    → Wallet[]
 * 
 * ALL HOOKS RETURN:
 * - data: The actual data
 * - isLoading: boolean
 * - error: Error | null
 * - refetch: () => void
 * 
 * PATTERN:
 * const { data, isLoading, error } = useHook()
 * if (isLoading) return <Loading />
 * if (error) return <Error />
 * return <YourUI data={data} />
 */

