/**
 * Context & Capability Fabric — SDK surface (`sdk.fabric.gen1`).
 */
export {
  capabilitySurfaceSchema,
  mutationRiskSchema,
  riskTierSchema,
  approvalPolicySchema,
  rbacPermissionSchema,
  paramEditorSchema,
  contextSourceSchema,
  capabilityParamSchema,
  capabilityContextSpecSchema,
  capabilityDescriptorSchema,
  capabilityDescriptorFixtureSchema,
  parseCapabilityDescriptor,
  parseCapabilityDescriptorFixture,
} from './capabilityDescriptor';
export type {
  CapabilitySurface,
  CapabilityParam,
  CapabilityContextSpec,
  CapabilityDescriptor,
  CapabilityDescriptorFixture,
} from './capabilityDescriptor';

export {
  capabilityResultSchema,
  capabilityErrorSchema,
  capabilityCostSchema,
  capabilityCacheInfoSchema,
  parseCapabilityResult,
} from './capabilityResult';
export type {
  CapabilityResult,
  CapabilityError,
  CapabilityCost,
  CapabilityCacheInfo,
} from './capabilityResult';

export {
  principalKindSchema,
  principalContextSchema,
  effectiveCapabilitiesSchema,
  parsePrincipalContext,
} from './principalContext';
export type {
  PrincipalKind,
  PrincipalContext,
  EffectiveCapabilities,
} from './principalContext';

export {
  contextRequestSchema,
  contextCitationSchema,
  contextSnippetSchema,
  contextBundleSchema,
  parseContextRequest,
  parseContextBundle,
} from './contextBundle';
export type {
  ContextRequest,
  ContextCitation,
  ContextSnippet,
  ContextBundle,
} from './contextBundle';

export { getContext } from './getContext';
export { getCapability, listCapabilities } from './listCapabilities';
export {
  capabilityRecipeStepSchema,
  capabilityRecipeSchema,
  parseCapabilityRecipe,
  recipeDescriptorId,
} from './capabilityRecipe';
export { listCapabilityRecipes, runCapabilityRecipe } from './runCapabilityRecipe';
export {
  listCapabilityMarketplace,
  listInstalledMarketplace,
  listMyMarketplaceListings,
  publishCapabilityMarketplaceListing,
  unpublishCapabilityMarketplaceListing,
  installCapabilityMarketplaceListing,
} from './installCapabilityMarketplace';
export {
  listPendingMarketplaceModeration,
  approveMarketplaceListing,
  rejectMarketplaceListing,
} from './marketplaceModerationApi';
export { getFabricCostSnapshot } from './getFabricCostSnapshot';
export { getFabricMetricsJson, getFabricMetricsPrometheus } from './getFabricMetrics';
export {
  enqueueFabricNotificationDigest,
  previewFabricNotificationDigest,
  getFabricNotificationOpsStatus,
  triggerFabricNotificationSmoke,
} from './notificationOpsApi';
export { getFabricQueueSnapshot } from './getFabricQueueSnapshot';
export { replayFabricDlqItem } from './replayFabricDlqItem';
export { replayFabricDlqBulk } from './replayFabricDlqBulk';
export type { FabricCostCounters, FabricCostSnapshot } from './getFabricCostSnapshot';
export {
  listFederationGrants,
  listInboundFederationGrants,
  createFederationGrant,
  acceptFederationGrant,
  rejectFederationGrant,
  revokeFederationGrant,
} from './fabricFederationApi';
export {
  FEDERATION_WEBHOOK_EVENTS,
  listFederationWebhooks,
  registerFederationWebhook,
  deleteFederationWebhook,
} from './federationWebhookApi';
export {
  fabricFederationGrantSchema,
  federationScopeSchema,
  federationGrantStatusSchema,
  federationGrantsResponseSchema,
} from './fabricFederation';
export type {
  FabricFederationGrant,
  FederationScope,
  FederationGrantStatus,
  CreateFederationGrantRequest,
  CreateFederationGrantResponse,
  RevokeFederationGrantResponse,
  AcceptFederationGrantResponse,
  RejectFederationGrantResponse,
} from './fabricFederation';
export type {
  FederationWebhookEvent,
  FederationWebhookSubscription,
  FederationWebhooksResponse,
  RegisterFederationWebhookRequest,
  RegisterFederationWebhookResponse,
  DeleteFederationWebhookResponse,
} from './federationWebhookApi';
export type { FabricMetricsJson, FabricUserOpsJson } from './getFabricMetrics';
export type {
  FabricDigestEnqueueRequest,
  FabricDigestEnqueueResult,
  FabricDigestPreviewResult,
  FabricNotificationOpsFlags,
  FabricNotificationOpsStatus,
  FabricNotificationSmokeRequest,
  FabricNotificationSmokeResult,
} from './notificationOpsApi';
export type { CapabilityListResponse } from './listCapabilities';
export type {
  CapabilityRecipe,
  CapabilityRecipeStep,
  CapabilityRecipeListResponse,
} from './capabilityRecipe';
export type {
  RunCapabilityRecipeRequest,
  RunCapabilityRecipeResponse,
} from './runCapabilityRecipe';
export type {
  MarketplaceListing,
  MarketplaceCatalogEntry,
  InstalledMarketplaceListing,
  PublishMarketplaceRequest,
  PublishMarketplaceResponse,
  MyMarketplaceListingsResponse,
  FederationSuggestion,
} from './capabilityMarketplace';
export type {
  InstallMarketplaceRequest,
  InstallMarketplaceResponse,
} from './installCapabilityMarketplace';
export type { FabricQueueSnapshot, FabricQueueStats, FabricWorkerSnapshot, FabricWorkerCounters } from './getFabricQueueSnapshot';
export type {
  FabricDlqReplayRequest,
  FabricDlqReplayResult,
} from './replayFabricDlqItem';
export type { FabricDlqBulkReplayResult } from './replayFabricDlqBulk';
