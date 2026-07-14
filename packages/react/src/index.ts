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
export { useTestnetProfiles } from './hooks/useTestnetProfiles';
export { useScenarioRun } from './hooks/useScenarioRun';
export { useChainSurface, type ChainSurfaceAudience, type UseChainSurfaceOptions } from './hooks/useChainSurface';
export { economyKeys } from './economy/economyQueryKeys';
export { testnetKeys } from './economy/testnetQueryKeys';
export { commerceKeys } from './commerce/commerceQueryKeys';
export type { StorefrontKeyParams } from './commerce/commerceQueryKeys';
export { useCart } from './hooks/useCart';
export type {
  AddCartLineVariables,
  RemoveCartLineVariables,
  MergeGuestLinesVariables,
} from './hooks/useCart';
export { useCheckout } from './hooks/useCheckout';
export type {
  CreateCheckoutSessionVariables,
  ConfirmCheckoutSessionVariables,
  CheckoutFromCartVariables,
} from './hooks/useCheckout';
export { useProductDetail } from './hooks/useProductDetail';
export { useStorefront } from './hooks/useStorefront';
export { useOrders } from './hooks/useOrders';
export { useWalletBalance } from './hooks/useWalletBalance';
export { useTopUp } from './hooks/useTopUp';
export type { TopUpVariables } from './hooks/useTopUp';
export { useSellerActivation } from './hooks/useSellerActivation';
export type { ActivateSellerVariables } from './hooks/useSellerActivation';
export { useMerchant } from './hooks/useMerchant';
export { useMyPurchases } from './hooks/useMyPurchases';
export type { MyPurchasesResult } from './hooks/useMyPurchases';
export { useEntitlements } from './hooks/useEntitlements';
export type { EntitlementsResult } from './hooks/useEntitlements';
export { useSubscription } from './hooks/useSubscription';
export type {
  PurchaseSubscriptionVariables,
  CancelSubscriptionVariables,
  RenewSubscriptionVariables,
} from './hooks/useSubscription';
export { useRefund } from './hooks/useRefund';
export type { RequestRefundVariables } from './hooks/useRefund';
export {
  BuyButton,
  CartButton,
  MiniShop,
  ProductGridEmbed,
  ProductQuickView,
} from './commerce/embeds';
export type {
  BuyButtonProps,
  CartButtonProps,
  CommerceEmbedActions,
  CommerceEmbedTelemetry,
  MiniShopProps,
  ProductGridEmbedProps,
  ProductQuickViewProps,
} from './commerce/embeds';
export { formatMoney } from '@agentstack/sdk/commerce/money';
export type { Money } from '@agentstack/sdk/commerce/money';
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