/**
 * AgentStack React Integration
 * Main export file for all React hooks and components
 */

// Context
export { SDKProvider, useSDK, useSDKInstance, useSDKConfig, useAuthState } from './context/SDKContext';
export {
  InvalidationRegistryProvider,
  useInvalidationRegistry,
} from './context/InvalidationRegistryContext';

// React Query + SDK
export { useSDKQuery, type SDKQueryOptions } from './hooks/useSDKQuery';
export { useSDKMutation, type SDKMutationOptions } from './hooks/useSDKMutation';
export {
  useSDKInfiniteQuery,
  type SDKInfiniteQueryOptions,
} from './hooks/useSDKInfiniteQuery';
export { useIsTabActive } from './hooks/useIsTabActive';
export { useNetworkOnline } from './hooks/useNetworkOnline';
export { useNetworkOnlineFromTabActivity } from '@agentstack/sdk';
export type { TabActivityTopic } from '@agentstack/sdk';
export { useSharedOverlayEscape } from './hooks/useSharedOverlayEscape';
export {
  useOptimisticMutation,
  type OptimisticMutationOptions,
} from './hooks/useOptimisticMutation';
export {
  appendOptimistically,
  updateOptimistically,
  removeOptimistically,
  type WithId,
} from './lib/crudHelpers';
export {
  createSessionBootstrapQueries,
  type SessionBootstrapAccountCtx,
  type SessionBootstrapQueryFactories,
} from './lib/sessionBootstrap';
export {
  performActionUpdate,
  type PerformActionQueryClient,
  type TanStackQueryClientLike,
  type UpdateOperation,
  type PerformActionUpdateCallbacks,
  type PerformActionUpdateOptions,
} from './lib/performActionUpdate';
export {
  createEntityQueryOptions,
  ENTITY_STALE_TIMES_MS,
} from './lib/entityQueryOptions';
export {
  createInvalidationRegistry,
  type InvalidateQueriesClient,
  type InvalidationRegistry,
  type EntityInvalidationConfig,
  type QueryKeyPrefix,
} from './lib/invalidationRegistry';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useProfile } from './hooks/useProfile';
export { useSettings } from './hooks/useSettings';
export { usePayments } from './hooks/usePayments';
export { useAnalytics } from './hooks/useAnalytics';
export { useProjects } from './hooks/useProjects';
export { useProjectSelector, type ProjectSelectorMode, type Project } from './hooks/useProjectSelector';
export { useUserDataInProjects, type UserDataType } from './hooks/useUserDataInProjects';
export {
  useSDKMutationWithInvalidation,
  invalidateAfterRegistryWrite,
  type UseSDKMutationWithInvalidationOptions,
} from './hooks/useSDKMutationWithInvalidation';
export { useCapability, type SDKCapability, type UseCapabilityResult } from './hooks/useCapability';
export { useEntityData } from './hooks/useEntityData';
export { useEntityForm, type UseEntityFormOptions, type UseEntityFormReturn } from './hooks/useEntityForm';
export { useAgents, type AgentsListResponse } from './hooks/useAgents';
export {
  useSupport,
  useSupportProjectSearch,
  useSupportEligibility,
  useSupportInbox,
  type SupportInboxFilters,
  type SupportEligibilityResponse,
} from './hooks/useSupport';
export { useAgent, type AgentDetailResponse } from './hooks/useAgent';
export { useAgentMetrics } from './hooks/useAgentMetrics';
export { useAgentTraces } from './hooks/useAgentTraces';
export { useAgentRun, type AgentRunState, type AgentRunStreamEvent } from './hooks/useAgentRun';
export { useAgntBalance } from './hooks/useAgntBalance';
export { usePaidAgentRun, type UsePaidAgentRunVariables } from './hooks/usePaidAgentRun';
export { useEconomyCapability, type EconomyCapability } from './hooks/useEconomyCapability';
export { economyKeys } from './economy/economyQueryKeys';
export { createFeatureModule, type FeatureModuleConfig, type FeatureModule } from './createFeatureModule';
export { RequireCapability, type RequireCapabilityProps } from './components/RequireCapability';

// Components
export { SDKProjectSelector, type SDKProjectSelectorProps } from './components/SDKProjectSelector';
export { Button, Input, Alert } from './components/ui-primitives';

// SSR Integration
export * from './ssr';

// Re-export core SDK types for convenience
export type {
  UserProfile,
  AuthTokens,
  LoginCredentials,
  ProfileData,
  SocialLinks,
  UserSettings,
  NotificationSettings,
  PrivacySettings,
  DashboardSettings,
  PaymentData,
  Payment,
  PaymentMethod,
  AnalyticsEvent,
  DashboardMetrics,
  UsageStats,
  CreateProjectData,
  UpdateProjectData,
  ProjectUser,
  AddUserToProjectData,
} from '@agentstack/sdk';