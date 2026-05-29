/**
 * AgentStack-SDK Core Package
 * Main exports for the unified SDK
 */

// Main SDK class
export { AgentStackSDK } from './sdk';

export {
  AGENTSTACK_PRODUCTION_ORIGIN,
  AGENTSTACK_PRODUCTION_API_BASE,
  AGENTSTACK_DEV_API_BASE,
  ENV_API_BASE,
  resolveAgentStackApiBase,
  isAgentStackDevApiBase,
  isAgentStackProductionHost,
} from './config/agentstackEndpoints';

export {
  isIntegratorAudience,
  assertPlatformOperatorSurface,
  assertIntegratorMayCallAdminApi,
  filterCapabilityEntriesForAudience,
  PLATFORM_OPERATOR_MODULE_IDS,
} from './config/integratorScope';
export type { SDKAudience } from './config/integratorScope';

export {
  normalizeProjectId,
  readProjectIdFromBrowserStorage,
  resolveEffectiveProjectId,
} from './config/projectContext';

export {
  validateAppManifest,
  assertModuleEnabled,
  assertIntegratorModule,
  assertProjectIdConfigured,
} from './ai-preflight';

// Unified Application Manifest (UAM v1) — parity with Python `ai_builder.manifest.schema`
export {
  appManifestSchema,
  routeSpecSchema,
  dataBindingSpecSchema,
} from './manifest/schema';
export type { AppManifestV1, RouteSpecV1, DataBindingSpecV1 } from './manifest/schema';

export type { ITabActivitySurface, TabActivityTopic } from './modules/TabActivitySurface';
export { useNetworkOnlineFromTabActivity } from './hooks/useNetworkOnlineFromTabActivity';

export {
  CLIENT_TEXT_NOTIFICATION_EVENT,
  dispatchClientNotification,
} from './utils/clientNotification';
export type { ClientNotificationPayload } from './utils/clientNotification';
export { getApiErrorMessage, httpErrorStatus } from './utils/apiErrorMessage';
export { SDKNotImplementedError } from './errors/SDKNotImplementedError';
export {
  buildAccountKey,
  buildUserAgntKey,
  classifyAccountKey,
  parseAccountKey,
  validateDoubleEntry,
  AccountKeyFormatError,
} from './atoms/agentcoinAccountKey';
export type {
  AccountKey,
  AccountKeyClassification,
  AccountKeyScope,
  LedgerLineInput,
} from './atoms/agentcoinAccountKey';
export { verifyAgentCoinMerkleProof } from './atoms/agentcoinProof';

// Core modules
export { AgentAuth } from './modules/AgentAuth';
export type { LoginCredentials, AuthTokens, UserProfile } from './modules/AgentAuth';
export { AgentAPI } from './modules/AgentAPI';
export type { AddUserToProjectData } from './modules/AgentAPI';
export { AgentNeural } from './modules/AgentNeural';
export type { NeuralStatus, NeuralEvent } from './modules/AgentNeural';
export { AgentDocs } from './modules/AgentDocs';
export { AgentPayments } from './modules/AgentPayments';
export { AgentCoin, AgentNetLedger } from './economy';
export type {
  AgentCoinLedgerLine,
  AgentCoinPostBatchBody,
  AgentCoinBatchProofPayload,
  AgentCoinBalancePayload,
} from './economy';
export {
  AgentFinanceFacade,
  FinancePortfolioClient,
  ProjectFinanceClient,
  SwapSession,
} from './finance';
export type {
  FinancePortfolioSnapshot,
  FinanceDashboardBundle,
  FinanceActivityRow,
  ProjectFinanceSnapshot,
  FundProjectRequest,
  RailBalanceSlice,
} from './finance';
export {
  AgentEconomyFacade,
  LedgerClient,
  EconomyError,
  BillingSession,
  PaidAgentRunFlow,
  economyPaidAgentRunRecipe,
  economyPurchaseCreditsRecipe,
  economyEnsureAgntBalanceRecipe,
  economyVerifyRunReceiptRecipe,
  economyIdempotencyKey,
  formatAtomicAgnt,
  parseAgntToAtomic,
  attachAgntPurchaseToInput,
} from './economy';
export type { EconomyErrorCode, PaidAgentRunRecipeParams, ReceiptVerifyResult } from './economy';
export {
  AGENTNET_NETWORK,
  AGENTNET_NATIVE,
  AGENTNET_STABLE,
} from './economy/agentnetIdentity';
export { buildExplorerUrl } from './economy/agentnetExplorer';
export type { ExplorerLinkKind } from './economy/agentnetExplorer';
/** Platform-operator AgentNet admin (`/api/admin/agentnet/*`) — not on `sdk.platform`. */
export { AgentAdmin } from './modules/AgentAdmin';
export type {
  AgentcoinSchemaStatusPayload,
  AgentcoinChainSurfacePayload,
  AgentcoinSchemaResetModePayload,
  AgentcoinSchemaResetBody,
  AgentcoinSchemaResetResult,
  AgentcoinSchemaResetScope,
  AgentcoinDdlPolicyDto,
  AgentcoinDiagnosticsProblemItem,
  AgentcoinBridgeHealthPayload,
  AgentcoinAdminOverviewPayload,
} from './modules/AgentAdmin';
export { AgentNetBnb } from './modules/AgentNetBnb';
export type { PaymentData, Payment, PaymentMethod } from './modules/AgentPayments';
export { AgentAnalytics } from './modules/AgentAnalytics';
export type { AnalyticsEvent, DashboardMetrics, UsageStats } from './modules/AgentAnalytics';
export { AgentSupport } from './modules/AgentSupport';
export type { AgentRowDTO } from './modules/AgentsFleet';
export { AgentWebhooks } from './modules/AgentWebhooks';
export { AgentIntegrations, buildIntegrationHookCurl } from './modules/AgentIntegrations';
export { AgentHosting } from './modules/AgentHosting';
export type {
  QuickStartBody,
  QuickStartResult,
  HostingSitesListResult,
  BucketCreateBody,
  BucketPatchBody,
  PromoteBuildBody,
} from './modules/AgentHosting';
export {
  integrationQueries,
  integrationListRecipes,
  integrationListConnections,
  integrationListDeliveries,
  integrationListInboxEvents,
  integrationGetDiagnostics,
  integrationGetConnectorSetupSchema,
} from './modules/integrationQueries';
export type {
  ListIntegrationConnectionsParams,
  ListIntegrationRecipesFilters,
} from './modules/integrationQueries';
export type {
  IntegrationQuickSetupMeta,
  IntegrationRecipeManifest,
  IntegrationSetupSecretSource,
} from './types/integrations';
export { AgentScheduler } from './modules/AgentScheduler';
export { AgentNotifications } from './modules/AgentNotifications';
export { AgentSocial } from './modules/AgentSocial';
export type {
  SocialFriendRequestInRow,
  SocialFriendRequestOutRow,
} from './modules/AgentSocial';

/** Messenger channel facade (widgets / third-party clients). */
export {
  makeMessenger,
  messengerChatMessageComment,
  messengerChatMessageReact,
  messengerChatReadSet,
  messengerPushSurfacePost,
  messengerChannelCreate,
  messengerChannelGet,
  messengerChannelHistory,
  messengerChannelMessagesResolve,
  messengerChannelInvitesAccept,
  messengerChannelInvitesDecline,
  messengerChannelInvitesInbox,
  messengerChannelInvitesLinkToken,
  messengerChannelInvitesRedeem,
  messengerChatIndexGet,
  messengerChatIndexPut,
  messengerChatIndexRemove,
  messengerChatReadMap,
  messengerChannelsDelete,
  messengerChannelsRegister,
  messengerChannelsUpdate,
  messengerDmEnsure,
  messengerFriendRequest,
  messengerFriendsBlock,
  messengerFriendsRemove,
  messengerPrefsGet,
  messengerPrefsPut,
  messengerFetchSocialDelta,
  messengerFetchThreadHistory,
  messengerFriendsRequestsOut,
  messengerFriendsUserIds,
  messengerFriendsCards,
  messengerPresenceOnline,
  messengerPublicIndex,
  messengerPublicMine,
  messengerPublicPublish,
  messengerPublicQuota,
  messengerPublicUnpublish,
  messengerSettingsPrivacyGet,
  messengerSettingsPrivacyPut,
  messengerUsersPublicCards,
} from './modules/Messenger';
export type {
  Messenger,
  MessengerChannel,
  MessengerChannelRef,
  MessengerLiveListener,
  MessengerMessageLike,
  MessengerThreadHistoryContour,
  MessengerTransport,
  MessengerClientConfig,
  MakeMessengerFromHttp,
  MakeMessengerOpts,
  MessengerFetchThreadHistoryParams,
  MessengerFetchSocialDeltaParams,
  MessengerSocialDeltaHttpOpts,
  MessengerSocialDeltaParams,
  MessengerSocialDeltaSource,
  MessengerChannelInvitesAcceptBody,
  MessengerChannelInvitesAcceptHttpOpts,
  MessengerChannelInvitesDeclineBody,
  MessengerChannelInvitesDeclineHttpOpts,
  MessengerChannelInvitesInboxHttpOpts,
  MessengerChannelInvitesLinkTokenBody,
  MessengerChannelInvitesLinkTokenHttpOpts,
  MessengerChannelInvitesRedeemBody,
  MessengerChannelInvitesRedeemHttpOpts,
  MessengerPublicPublishBody,
  MessengerPublicPublishHttpOpts,
  MessengerPublicUnpublishBody,
  MessengerPublicUnpublishHttpOpts,
} from './modules/Messenger';
export {
  buildMessengerClientConfigFromHttpClientConfig,
  type MessengerClientConfigSource,
} from './messenger/buildMessengerClientConfig';
export { MESSENGER_HOST_CONTRACT_VERSION } from './messenger/messengerHostContractVersion';
export { AgentWebPush } from './modules/AgentWebPush';
export type {
  PushSubscriptionJSON,
  PushHealthData,
  VapidPublicKeyDiagnostics,
  VapidPublicKeyResponse,
} from './modules/AgentWebPush';
/** Bounded wait for `navigator.serviceWorker.ready` (mobile WebKit–safe). */
export { raceServiceWorkerReady } from './pwa/serviceWorkerReady';
/** Wait for `navigator.serviceWorker.controller` (e.g. after `skipWaiting` + `clients.claim`). */
export { waitForServiceWorkerController } from './pwa/serviceWorkerController';
export {
  prepareServiceWorkerForClient,
  type SwContourPrepareOptions,
} from './pwa/serviceWorkerContour';
export {
  probeStaticBuildMismatch,
  parseBuildIdFromIndexHtml,
  isCoreAppUpdateReason,
  type AppUpdateReason,
  type AppUpdateCoreReason,
  type ProbeStaticBuildInput,
  type ProbeStaticBuildResult,
} from './pwa/appUpdatePlane';
export {
  APP_UPDATE_CHANNEL_NAME,
  createAppUpdateBroadcastBridge,
  type AppUpdateBroadcastBridge,
  type AppUpdateChannelMsg,
} from './pwa/appUpdateBroadcast';
export {
  createAppUpdateCoordinator,
  type AppUpdateCoordinator,
  type AppUpdateCoordinatorConfig,
  type AppUpdateState,
  type AppUpdateStatus,
  type AppUpdateEvent,
} from './pwa/appUpdateCoordinator';
export {
  APP_UPDATE_MESSAGE_KEYS,
  titleKeyForAppUpdateReason,
  resolveTenantTitleKey,
} from './pwa/appUpdateMessageKeys';
export type { AppUpdateBeaconEvent } from './pwa/appUpdateBeaconTypes';
export {
  runAppUpdateProbes,
  createBuildProbe,
  type RunAppUpdateProbesInput,
} from './pwa/appUpdateProbeScheduler';
export {
  resolveReloadStrategy,
  shouldBustPersistOnApply,
  defaultUserReloadStrategy,
  type ApplyAppUpdateMode,
  type ReloadStrategy,
  type ReloadStrategyContext,
} from './pwa/appUpdateReloadStrategies';
export {
  DEPLOY_CHANNEL_NAME,
  createDeployBroadcastBridge,
  type DeployChannelMsg,
  type DeployBroadcastBridge,
} from './pwa/deployBroadcast';
export type { DeploySignal, DeploySignalPort } from './pwa/deploySignalPort';
export {
  MESSENGER_SW_MSG,
  pingMessengerServiceWorker,
  postMessengerSwCommand,
  prefetchMessengerShellInSw,
  type MessengerSwGetRegistration,
  type MessengerSwPostMessageBridgeOptions,
  type MessengerSwPrefetchDone,
  type MessengerSwPong,
} from './pwa/messengerSwPostMessage';
export { showMessengerOsNotificationViaSwWhenTabHidden } from './pwa/messengerOsNotificationFallback';
export type { ShowMessengerOsNotificationViaSwOptions } from './pwa/messengerOsNotificationFallback';
export {
  getBestServiceWorkerRegistrationFromNavigator,
  pageUrlMatchesServiceWorkerScope,
} from './pwa/serviceWorkerBestRegistration';
export type {
  GetBestServiceWorkerRegistrationFromNavigatorInput,
  GetBestServiceWorkerRegistrationFromNavigatorOptions,
} from './pwa/serviceWorkerBestRegistration';
export {
  STORAGE_ROOT_FOLDER_KEY,
  STORAGE_SEGMENT_SEP,
  childFolderKeysFromIndex,
  folderKeyFromSegments,
  folderSegmentsFromKey,
} from './storage/storageFolderKey';
export { buildStorageUploadedPublicPath } from './storage/storageUploadedPublicPath';
export { AgentWallets } from './modules/AgentWallets';
export { AgentInvoices } from './modules/AgentInvoices';
export { AgentBilling } from './modules/AgentBilling';
export { AgentRBAC } from './modules/AgentRBAC';
export { AgentI18n } from './modules/AgentI18n';
export { AgentDNA } from './modules/AgentDNA';
export { AgentAdminData } from './modules/AgentAdminData';
export type {
  AdminDataPeopleResponse,
  AdminDataDnaListParams,
  AdminDataDnaListResponse,
  AdminDataHealthResponse,
} from './modules/AgentAdminData';
export { AgentLogic } from './modules/AgentLogic';
export { AgentMarketplace } from './modules/AgentMarketplace';
export { AgentEcosystem } from './modules/AgentEcosystem';
export type {
  EcosystemManifest,
  EcosystemPublishedChannel,
  EcosystemConnectionsPayload,
  EcosystemChannelAccess,
  EcosystemChannelType
} from './modules/AgentEcosystem';
export { AgentAssets } from './modules/AgentAssets';
export type { ListAssetPresetsResponse } from './modules/AgentAssets';
export { AgentGlobalAssets } from './modules/AgentGlobalAssets';
export {
  buildAssetsWizardHref,
  buildAssetsModuleSearchParams,
  parseAssetsSearchParams,
  writeAssetsSearchParams,
  validateAssetDraft,
  validateAssetPresetsResponse,
  duplicateAsset,
  assetDraftSchema,
  assetPresetDefinitionSchema,
} from './commerce/assets';
export type {
  AssetDraft,
  AssetPresetDefinition,
  AssetPresetsFixture,
  AssetsUrlState,
  AssetsWizardStep,
} from './commerce/assets';

// 🧬 NEW! Protein System Modules (v0.3.6)
export { AgentProtein } from './modules/AgentProtein';
export { ProteinCommandChannel } from './modules/ProteinCommandChannel';
export type {
  ProteinCommandExecuteRequest,
  ProteinBatchCommandRequest,
} from './modules/ProteinCommandChannel';
export { ProteinResponseProcessor } from './modules/ProteinResponseProcessor';
export { PageCompositionSystem } from './modules/PageCompositionSystem';
export { GameDataSystem } from './modules/GameDataSystem';

/** Query key helpers for `/api/social` (friends, chat L1, federation). */
export { SOCIAL_QUERY_PREFIXES } from './socialSurface';

// ─── Relay constants (0.4.11, genetic tag: frontend.sdk.relay.unified.gen1) ──
export {
  MESSENGER_INBOX_MUX_TOPIC,
  RELAY_EVT_CHAT_APPEND,
  RELAY_EVT_CHAT_MESSAGE_APPENDED,
  RELAY_EVT_CHAT_MESSAGE_EDITED,
  RELAY_EVT_CHAT_MESSAGE_DELETED,
  RELAY_EVT_CHAT_PINS_CHANGED,
  RELAY_EVT_CHAT_READ_RECEIPT,
  RELAY_EVT_MESSENGER_PRESENCE,
  RELAY_FRAME_BROADCAST,
  RELAY_FRAME_ACK,
  RELAY_FRAME_READ,
  RELAY_FRAME_MUX_SUBSCRIBE,
  RELAY_FRAME_MUX_UNSUBSCRIBE,
  RELAY_FRAME_MUX_SUBSCRIBED,
  RELAY_FRAME_RESUME,
  RELAY_RESUME_STATUS_OK,
  RELAY_RESUME_STATUS_REPLAY,
  RELAY_RESUME_STATUS_STALE,
  RELAY_ENVELOPE_VERSION,
  socialChatRelayRoomId,
  userMuxRoomId,
} from './relay/relay-constants';
export type {
  RelayEventType,
  RelayFrameType,
  RelayResumeStatus,
  RelayResumeEnvelope,
} from './relay/relay-constants';
export type { SocialPointer } from './socialSurface';
export {
  socialGetPrivacy,
  socialPutPrivacy,
  socialGetFriendRequestsIn,
  socialGetFriendRequestsOut,
  socialSendFriendRequest,
  socialRespondFriendRequest,
} from './socialRest';
/** DNA / static mount normalization for ``usersPublicCards`` avatars (messenger, dashboard). */
export {
  expandSocialAvatarPath,
  normalizeSocialPublicCardAvatar,
  type SocialPublicCardAvatar,
} from './utils/socialPublicAvatar';
export type {
  FriendRequestSourcePayload,
  SocialPrivacyPayload,
} from './socialRest';
export {
  supportGetMeProjectRoles,
  supportGetMyThread,
  supportPostUserMessage,
  supportGetInbox,
  supportGetConfig,
  supportGetEligibility,
  supportPutConfig,
  supportGetStaffThread,
  supportPostStaffThreadMessage,
  supportSearchProjects,
  supportTransitionTicket,
  supportAssignTicket,
  supportRequestHuman,
} from './supportRest';
export type {
  SupportEligibilityRow,
  SupportProjectRolesResponse,
  SupportProjectSearchResult,
} from './supportRest';

// 🗂️ File Storage Integration
export {
  FileStorageIntegration,
  createFileStorageIntegration,
  storeFileInDNAEntity,
  retrieveFileFromDNAEntity,
  storeFileInProtein,
  retrieveFileFromProtein
} from './modules/FileStorageIntegration';

// 📱 Mobile primitives (sdk.mobile.*) — gene: sdk.mobile.gen1
export {
  createMobileOrientation,
  getMobileOrientation,
  createMobileSurface,
} from './mobile';
export type {
  MobileSurface,
  OrientationApi,
  OrientationInfo,
  OrientationLockType,
  OrientationType,
} from './mobile';

// 🪟 Browser overlay capture (sdk.browser.*) — gene: sdk.browser.overlay_capture.gen1
export {
  createPopStateCaptureBridge,
  createKeydownCaptureBridge,
} from './browser/overlayCaptureBridges';
export type {
  PopStateCaptureBridge,
  PopStateCaptureBridgeOptions,
  PopStateCaptureConsumer,
  KeydownCaptureBridge,
  KeydownCaptureBridgeOptions,
  KeydownCaptureHandler,
} from './browser/overlayCaptureBridges';

// 🪟 Shared overlay Escape singleton (sdk.browser.shared_overlay_escape.gen1)
export {
  getSharedOverlayEscapeBridge,
  registerSharedOverlayEscapeConsumer,
  disposeSharedOverlayEscapeBridge,
} from './browser/sharedOverlayEscapeBridge';
export { deferEscapeWhen } from './browser/escapeDeferPolicy';

// 🎞️ Media primitives (sdk.media.*) — gene: sdk.media.gen1
// Implements repo.engineering.client_side_computation.gen1: push thumbnails,
// resumable uploads, OPFS cache, and lightbox UX to the client.
export {
  createAgentStackMedia,
  createOpfsStore,
  isOpfsAvailable,
  OpfsUnavailableError,
  createThumbnailer,
  DEFAULT_THUMBNAILER_NAMESPACE,
  blobChunkSource,
  opfsChunkSource,
  runResumableUpload,
  ResumableUploadError,
  createLightbox,
  isLightboxAvailable,
  getLightboxViewportSize,
  LIGHTBOX_ORIENTATION_ASPECT_EPS,
  shouldOfferOrientationMatch,
  DEFAULT_PROBE_IMAGE_NATURAL_TIMEOUT_MS,
  probeImageNaturalSize,
  downloadUrlAsFile,
  sanitizeDownloadFilename,
  lightboxSlideDownloadUrl,
  lightboxSlideDownloadBasename,
} from './media';
export type {
  AgentStackMediaSurface,
  AgentStackMediaFactoryOptions,
  OpfsStore,
  OpfsStoreOptions,
  ThumbnailerContract,
  ThumbnailerOptions,
  ThumbnailOptions,
  ThumbnailResult,
  ChunkSource,
  ResumableUploadInput,
  ResumableUploadOptions,
  ResumableUploadResult,
  ResumableUploadTarget,
  HtmlSlide,
  ImageSlide,
  LightboxController,
  LightboxFactoryOptions,
  LightboxOpenOptions,
  LightboxSlide,
  VideoSlide,
  AudioCaptureHandle,
  AudioCaptureOptions,
  AudioEnhanceProfileId,
} from './media';

// Protein system types
export type {
  ProteinRequest,
  ProteinResponse,
  PageCompositionRequest,
  GameDataRequest,
  ProteinCommand
} from './modules/AgentProtein';

export type {
  ProcessedPageData,
  ProcessedProfileData,
  ProcessedDashboardData,
  ProcessedShopData,
  ProcessedNewsData,
  ProcessedGameData,
  ProcessedMarkupData
} from './modules/ProteinResponseProcessor';

export type {
  PageTemplate,
  PageComponent,
  ComposedPage,
  RenderedComponent
} from './modules/PageCompositionSystem';

export type {
  GameSession,
  CharacterData,
  QuestData,
  WorldData,
  GameScript,
  GameState
} from './modules/GameDataSystem';

// File Storage Integration Types
export type {
  FileStorageIntegrationOptions,
  FileEnabledDNAEntity,
  FileReference,
  FileEnabledProteinRequest,
  FileEnabledProteinResponse
} from './modules/FileStorageIntegration';

// Logic Engine Types
export type {
  Logic,
  LogicTemplate,
  CreateLogicRequest,
  UpdateLogicRequest,
  ExecuteLogicRequest,
  ExecuteLogicResponse,
  LogicExecution,
  SuggestedParams
} from './modules/AgentLogic';

// Logic Engine Node Types (NEW)
export type {
  NodeType,
  VisualCondition,
  NodeData,
  FlowNode,
  FlowEdge,
  JsonBlock,
  JsonTrigger,
  ValidationResult,
  ConversionResult
} from './modules/logic/types/NodeTypes';

// HTTP Client
export { HTTPClient, normalizeGetQueryArg } from './client/http-client';

// Utilities
export { SimpleEventEmitter } from './utils/event-emitter';
export { AuthStateStore } from './utils/auth-state';

// Logger - Universal logging system (auto-disables in production)
export { logger, LogLevel } from './utils/logger';
export type { LoggerConfig } from './utils/logger';
export {
  getOrCreateCorrelationIds,
  getLastOpTraceRequestId,
  getLastOpTraceTraceId,
  optraceLog
} from './utils/optrace';
export type { OpTraceLevel } from './utils/optrace';

// Re-export all utilities
export * from './utils';

// Entity snapshot repository + path helpers (structural cache; React Query stays async source)
export * from './cache';

// AgentProtocol — unified facade (REST + commands + snapshots); see docs/AGENT_PROTOCOL.md
export * from './protocol';

// AI / integration surface — sdk.platform; see docs/SDK_AI_SURFACE.md
export type {
  AgentStackPlatformSurface,
  StandardSDKSurface,
  SDKCapabilityMatrix,
  SDKCapabilityTaskEntry,
  SDKCapabilityEntry,
  PlatformDNATableWrapper,
} from './platform-surface';
export { buildCapabilityMatrix, flattenCapabilityMatrix } from './platform-surface';

export type {
  SDKModuleCatalog,
  SDKModuleSurface,
  SDKModuleExample,
  SDKDocRef,
} from './module-catalog';
export { buildModuleCatalog } from './module-catalog';

// Re-export all types
export type {
  ProfileData,
  SocialLinks,
  UserSettings,
  NotificationSettings,
  PrivacySettings,
  DashboardSettings,
  AppearanceSettings,
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectUser,
  User,
  Session,
  Wallet,
  ApiKey,
  Role,
  Permission,
  APIResponse,
  PaginationResponse,
  AuthState,
  AuthStateReason,
  AuthSnapshot,
  NeuralCacheStats,
} from './types';

export type {
  ClientNotificationMeta,
  ClientNotificationMessengerScope,
  ClientTextNotificationPayload,
} from './types/shared/ClientNotification';

// Invoice types
export type {
  Invoice,
  InvoiceType,
  InvoiceStatus,
  ExchangeRate,
  InvoiceItem,
  CreateInvoiceRequest,
  PayInvoiceRequest,
  ExchangeInvoiceRequest,
  InvoiceFilters,
  InvoiceListResponse,
  InvoiceResponse
} from './types/entities/Invoice';

// Asset types
export type {
  BaseAsset,
  AssetType,
  AssetComponents,
  PropertyComponent,
  GameComponent,
  MetadataComponent,
  VisualComponent,
  AssetInExchange,
  Rarity
} from './types/entities/Asset';

// Listing types
export type {
  Listing,
  ListingType,
  ListingStatus,
  DealStatus,
  ListingAsset,
  WhitelistConfig,
  WhitelistCurrencyEntry,
  WhitelistAssetEntry,
  AutoAcceptConfig,
  AutoAcceptConditions,
  AuctionConfig,
  CommissionBreakdown,
  DealCommissions,
  DealEscrow,
  DealConfirmations,
  ActiveDeal,
  ListingData,
  CreateListingRequest,
  UpdateListingRequest,
  AcceptListingRequest
} from './types/entities/Listing';

// Exchange History types
export type {
  ExchangeHistoryEntry,
  ExchangeHistoryType,
  ExchangeHistoryStatus,
  CommissionsPaid,
  FullExchangeHistoryEntry
} from './types/entities/ExchangeHistory';

// Global Assets Registry types
export type {
  GlobalAssetCard,
  AssetMetrics,
  PricePoint,
  AssetTrends,
  AssetPopularity,
  AssetAvailability,
  GlobalAssetsListResponse,
  GlobalAssetsFilters
} from './types/entities/GlobalAsset';

// Types
export type { SDKConfig, AgentStackError } from './types';

// Version (semantic = AGENTSTACK_CORE_VERSION from shared/constants.py via sync script)
export { SDK_VERSION, VersionManager, AGENTSTACK_CORE_VERSION } from './version';

// i18n exports
export { useI18n, t } from './i18n/useI18n';
export type { UseI18nResult } from './i18n/useI18n';
export type {
  CommonTranslationKey,
  ModulesTranslationKey,
  CommonNamespacedKey,
  ModulesNamespacedKey,
  AnyTranslationKey,
  LanguageCode,
  Namespace
} from './i18n/types';

export {
  manifestToMcpHints,
} from './resource-surface';
export type {
  IResourceSurfacePort,
  ListQuery,
  MutateResult,
  McpActionHint,
  ManifestLike,
} from './resource-surface';

export {
  parseTaskManifest,
  taskCapabilityManifestSchema,
  taskManifestToMcpHints,
  registerTaskCapabilityPort,
  clearTaskCapabilityPorts,
  runTaskCapability,
  listRegisteredTaskPorts,
} from './capability-tasks';
export type {
  TaskCapabilityManifestJson,
  TaskMcpHint,
  TaskManifestLike,
  ITaskCapabilityPort,
  TaskCapabilityContext,
  TaskCapabilityResult,
  TaskCapabilityAudience,
  TASK_CATALOG_METADATA,
  TaskCatalogEntry,
} from './capability-tasks';

