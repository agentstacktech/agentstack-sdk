/**
 * AgentStack-SDK
 * Главный класс SDK с модульной архитектурой
 */

import { isChunkLikeErrorMessage } from './pwa/chunkErrors';
import { HTTPClient } from './client/http-client';
import { AgentAuth } from './modules/AgentAuth';
// AgentAdmin removed - use AgentAPI methods instead (Universal Naming)
import { AgentNeural } from './modules/AgentNeural';
import { AgentDocs } from './modules/AgentDocs';
import { AgentPayments } from './modules/AgentPayments';
import { AgentEconomyFacade } from './economy/AgentEconomyFacade';
import { AgentPublicSurface } from './public';
import { AgentFinanceFacade } from './finance/AgentFinanceFacade';
import { AgentNetBnb } from './modules/AgentNetBnb';
import { AgentNetSolana } from './modules/AgentNetSolana';
import { AgentAdmin } from './modules/AgentAdmin';
import { AgentAdminData } from './modules/AgentAdminData';
import { AgentAnalytics } from './modules/AgentAnalytics';
import { AgentsFleet } from './modules/AgentsFleet';
import { AgentWebhooks } from './modules/AgentWebhooks';
import { AgentIntegrations } from './modules/AgentIntegrations';
import { AgentBots } from './modules/AgentBots';
import { AgentCrm } from './modules/AgentCrm';
import { AgentHosting } from './modules/AgentHosting';
import { AgentScheduler } from './modules/AgentScheduler';
import { AgentAPI } from './modules/AgentAPI';
import { AgentNotifications } from './modules/AgentNotifications';
import { AgentSocial } from './modules/AgentSocial';
import { AgentSupport } from './modules/AgentSupport';
import { AgentWebPush } from './modules/AgentWebPush';
import { GuidancePlatformFacade } from './guidance/GuidancePlatformFacade';
import { AgentWallets } from './modules/AgentWallets';
import { AgentInvoices } from './modules/AgentInvoices';
import { AgentBilling } from './modules/AgentBilling';
import { AgentRBAC } from './modules/AgentRBAC';
import { AgentI18n } from './modules/AgentI18n';
import {
  AgentDNA,
  type DNAEntity,
  type DNAQueryParams,
  type DNAListResponse,
} from './modules/AgentDNA';
import { AgentProtein } from './modules/AgentProtein';
import { AgentLogic } from './modules/AgentLogic';
import { AgentCommand } from './modules/AgentCommand';
import { ProteinCommandChannel } from './modules/ProteinCommandChannel';
import { AgentMarketplace } from './modules/AgentMarketplace';
import { CommerceFacade } from './commerce/CommerceFacade';
import { AgentAssets } from './modules/AgentAssets';
import { AgentGlobalAssets } from './modules/AgentGlobalAssets';
import { AgentBuffs } from './modules/AgentBuffs';
import { AgentEcosystem } from './modules/AgentEcosystem';
import { AgentDiagnostics } from './modules/AgentDiagnostics';
import { AgentCommerceAdmin } from './modules/AgentCommerceAdmin';
import { AgentSeo } from './seo/index';
import { AgentStorage } from './modules/AgentStorage';
import { createAgentStackMedia, type AgentStackMediaSurface } from './media';
import { createMobileSurface, type MobileSurface } from './mobile';
import { ProteinResponseProcessor } from './modules/ProteinResponseProcessor';
import { PageCompositionSystem } from './modules/PageCompositionSystem';
import { GameDataSystem } from './modules/GameDataSystem';
import { SDKConfig, AgentStackError } from './types';
import { AuthStateStore } from './utils/auth-state';
import { SimpleEventEmitter } from './utils/event-emitter';

/** Wrapper for a single DNA table (projects or users) - no table name needed */
export interface DNATableWrapper {
  list<T = any>(params?: DNAQueryParams): Promise<DNAListResponse<T>>;
  get<T = any>(uuid: string): Promise<DNAEntity<T>>;
  create<T = any>(entity: Partial<DNAEntity<T>>): Promise<DNAEntity<T>>;
  update<T = any>(uuid: string, updates: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>): Promise<DNAEntity<T>>;
  delete(uuid: string): Promise<{ success: boolean; message: string }>;
}

function createDNATableWrapper(
  dna: AgentDNA,
  table: string,
  defaultListParams?: DNAQueryParams,
): DNATableWrapper {
  return {
    list: (params) => dna.list(table, { ...defaultListParams, ...params }),
    get: (uuid) => dna.get(table, uuid),
    create: (entity) => dna.create(table, entity),
    update: (uuid, updates) => dna.update(table, uuid, updates),
    delete: (uuid) => dna.delete(table, uuid),
  };
}
import { SDK_VERSION, VersionManager } from './version';
import { logger } from './utils/logger';
import { getStorageItem, removeStorageItem } from './utils/storage-utils';
import {
  createEntitySnapshotRepository,
  type EntitySnapshotRepository,
} from './cache';
import { AgentProtocol } from './protocol';
import {
  type AgentStackPlatformSurface,
  buildCapabilityMatrix,
  type SDKCapabilityMatrix,
} from './platform-surface';
import { buildModuleCatalog, type SDKModuleCatalog } from './module-catalog';
import type { ITabActivitySurface } from './modules/TabActivitySurface';
import {
  makeMessenger,
  messengerChannelCreate,
  messengerChatMessageComment,
  messengerChatMessageReact,
  messengerChatReadSet,
  messengerPushSurfacePost,
  messengerChannelInvitesAccept,
  messengerChannelInvitesDecline,
  messengerChannelInvitesInbox,
  messengerChannelInvitesLinkToken,
  messengerChannelInvitesRedeem,
  messengerChatIndexGet,
  messengerChatIndexPut,
  messengerChatIndexRemove,
  messengerChatReadMap,
  messengerChannelGet,
  messengerChannelHistory,
  messengerChannelMessagesResolve,
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
import type { MakeMessengerOpts, Messenger } from './modules/Messenger';
import { buildMessengerClientConfigFromHttpClientConfig } from './messenger/buildMessengerClientConfig';
import { assertPlatformOperatorSurface } from './config/integratorScope';
import { normalizeProjectId, resolveEffectiveProjectId } from './config/projectContext';

export class AgentStackSDK extends SimpleEventEmitter {
  /** Explicit for rolled-up .d.ts — @agentstack/react telemetry hooks call `sdk.emit`. */
  override emit(event: string, ...args: any[]): void {
    super.emit(event, ...args);
  }

  public httpClient: HTTPClient;
  private config: SDKConfig;
  
  // Модули SDK с префиксом Agent
  public auth: AgentAuth;
  public api: AgentAPI;
  /** @internal Lazy instance; use getter — blocked for `sdkAudience: 'integrator'`. */
  private readonly _admin: AgentAdmin;
  /** @internal Lazy instance; use getter — blocked for `sdkAudience: 'integrator'`. */
  private readonly _adminData: AgentAdminData;

  /**
   * AgentStack platform-operator REST (`/api/admin/*` slices).
   * **Not** on `sdk.platform` — ecosystem owner / dev shell only (typically project_id=1).
   * Throws when `SDKConfig.sdkAudience` is `integrator` (npm default).
   */
  get admin(): AgentAdmin {
    assertPlatformOperatorSurface(this.config, 'sdk.admin');
    return this._admin;
  }

  /**
   * Platform admin data BFF (`/api/admin/data/*`). Also on `sdk.platform.adminData`.
   * Throws when `SDKConfig.sdkAudience` is `integrator` (npm default).
   */
  get adminData(): AgentAdminData {
    assertPlatformOperatorSurface(this.config, 'sdk.adminData');
    return this._adminData;
  }
  public neural: AgentNeural;
  public docs: AgentDocs;
  public payments: AgentPayments;
  /** AgentNet economy facade (AGNT L0, credits, bridge, vault, funding). Prefer `sdk.platform.economy`. */
  public economy: AgentEconomyFacade;
  /** Public read-only surfaces (`/api/public/*`). `sdk.public.grants` for grant reviewers. */
  public public: AgentPublicSurface;
  /** Finance Hub BFF (portfolio, project fund, swap). Prefer `sdk.finance` / `sdk.platform.finance`. */
  public finance: AgentFinanceFacade;
  /** BNB Chain BSC testnet rail (`/api/projects/{id}/agentnet/bnb/*`). */
  public agentnetBnb: AgentNetBnb;
  /** Solana devnet PTR attestation rail (`/api/projects/{id}/agentnet/sol/*`). */
  public agentnetSolana: AgentNetSolana;
  public analytics: AgentAnalytics;
  /** Agents Fleet — scoped REST `/api/projects/{id}/agents/*` and personal `/api/users/me/agents/*` (8DNA agents + runs). */
  public agentsFleet: AgentsFleet;
  public webhooks: AgentWebhooks;
  /** Integration Hub — connections, recipes, deliveries (`/api/integrations/*`). */
  public integrations: AgentIntegrations;
  /** Bots Fleet — Telegram / WhatsApp / Instagram bots (`/api/projects/{id}/bots/*`). */
  public bots: AgentBots;
  /** CRM tissue — project-scoped contacts/deals (`/api/projects/{id}/crm/*`). */
  public crm: AgentCrm;
  /** Static bucket hosting (`/api/hosting/*`). */
  public hosting: AgentHosting;
  public scheduler: AgentScheduler;
  public notifications: AgentNotifications;
  /** Messenger / friends / PAS (`/api/social/*`, `/api/pas/*`). Also on `sdk.platform.social`. */
  public social: AgentSocial;
  /** Project support (`/api/support/*`). Also on `sdk.platform.support`. */
  public support: AgentSupport;
  /** Web Push VAPID (`/api/push/*`). Also `sdk.notifications.webPush` and `sdk.platform.webPush`. */
  public webPush: AgentWebPush;
  /** Guided paths REST facade — also `sdk.platform.guidance`. */
  public readonly guidancePlatform: GuidancePlatformFacade;
  public wallets: AgentWallets;
  public invoices: AgentInvoices;
  public billing: AgentBilling;
  public rbac: AgentRBAC;
  public i18n: AgentI18n;
  public dna: AgentDNA;
  /** Projects (DNA) — unified table `data_projects_8dna`, project rows (user_id=0) */
  public projects: DNATableWrapper;
  /** Users (DNA) — unified table `data_projects_8dna`, user rows (user_id>0) */
  public users: DNATableWrapper;
  public logic: AgentLogic;
  public command: AgentCommand;  // NEW! Client Commands (v0.2.1)
  /** POST /commands/execute — DNA CRUD protein bus (shared HTTPClient + auth headers). */
  public proteinCommandChannel: ProteinCommandChannel;
  public marketplace: AgentMarketplace;  // NEW! Marketplace (v0.4.0)
  /** Headless commerce facade (`sdk.commerce.*`). */
  public commerce: CommerceFacade;
  public assets: AgentAssets;  // NEW! Assets (v0.4.0)
  public globalAssets: AgentGlobalAssets;  // NEW! Global Assets Registry (v0.4.1)
  public buffs: AgentBuffs;  // NEW! Buffs System (v0.4.9)
  /** Ecosystem channel manifest, grants, connections */
  public ecosystem: AgentEcosystem;
  public diagnostics: AgentDiagnostics;
  /** Ecosystem admin commerce settlement (`/api/admin/commerce/*`). */
  public commerceAdmin: AgentCommerceAdmin;
  /** Public marketing SEO meta (`GET /api/seo/meta`). Gene: sdk.seo.gen1 */
  public seo: AgentSeo;
  /** Project-scoped file storage (`/api/storage/*`, 8DNA row per project + user or project slice). */
  public storage: AgentStorage;
  /**
   * Client-side media primitives (`sdk.media.*`) — browser-only; feature-detects.
   *
   * Gene: `sdk.media.gen1`, enforces `repo.engineering.client_side_computation.gen1`.
   *
   * - `sdk.media.thumbnail` — image/video thumbnails via Canvas/OffscreenCanvas, cached in OPFS.
   * - `sdk.media.lightbox`  — headless PhotoSwipe adapter (dynamic import, zero SDK bundle cost).
   * - `sdk.media.uploadResumable` — tus-lite HEAD/PATCH loop (storage / legacy targets).
   * - `sdk.media.chunkSource.{blob,opfs}` — adapters for the resumable loop.
   * - `sdk.media.opfs.create` — namespaced OPFS KV store with LRU cap.
   */
  public media: AgentStackMediaSurface;

  /**
   * Client mobile primitives — feature-detected, browser-only.
   *
   * Gene: `sdk.mobile.gen1`.
   *
   * - `sdk.mobile.orientation` — screen-orientation observable + lock;
   *   used by the fullscreen image lightbox to recompute rotation
   *   scaling when the device rotates.
   *
   * Each primitive is lazy: `sdk.mobile` itself is one object literal,
   * and individual primitives only attach listeners / request APIs when
   * first used. Desktop consumers pay ~0 bytes.
   */
  public mobile: MobileSurface;
  
  // 🧬 NEW! Protein System Modules (v0.3.6)
  public protein: AgentProtein;
  public proteinProcessor: ProteinResponseProcessor;
  private _pageComposition?: PageCompositionSystem;
  private _gameData?: GameDataSystem;

  /** Page composition — lazy; throws when `SDKConfig.modules.pageComposition === false`. */
  public get pageComposition(): PageCompositionSystem {
    if (this.config.modules?.pageComposition === false) {
      throw new AgentStackError(
        'AgentStack SDK module "pageComposition" is disabled (SDKConfig.modules.pageComposition = false).',
      );
    }
    if (!this._pageComposition) {
      this._pageComposition = new PageCompositionSystem(this.protein, this.proteinProcessor);
      this.attachPageCompositionForwarding(this._pageComposition);
    }
    return this._pageComposition;
  }

  /** Game / protein session layer — lazy; throws when `SDKConfig.modules.gameData === false`. */
  public get gameData(): GameDataSystem {
    if (this.config.modules?.gameData === false) {
      throw new AgentStackError(
        'AgentStack SDK module "gameData" is disabled (SDKConfig.modules.gameData = false).',
      );
    }
    if (!this._gameData) {
      this._gameData = new GameDataSystem(this.protein, this.proteinProcessor);
      this.attachGameDataForwarding(this._gameData);
    }
    return this._gameData;
  }

  /** In-memory JSON snapshots (project-data, FAP, blobs); sync from React Query in the app. */
  public entitySnapshotRepository: EntitySnapshotRepository;

  /**
   * Unified ecosystem facade: REST helpers, /commands/*, Rules `/command`, snapshots, path search.
   * @see docs/AGENT_PROTOCOL.md
   */
  public protocol: AgentProtocol;

  /**
   * Stable AI / integration surface: same instances as root properties, no duplicated logic.
   * Prefer for prompts and new integrations: `sdk.platform.auth`, `sdk.platform.protocol`, …
   * @see docs/SDK_AI_SURFACE.md
   */
  public readonly platform: AgentStackPlatformSurface;

  /**
   * Embed/widget messenger: {@link makeMessenger} with `clientConfig` inferred from
   * {@link HTTPClient.getConfig} (`apiBase` / `baseUrl` / `projectId`).
   * Also exposed as {@link AgentStackPlatformSurface.createMessengerEmbed}.
   */
  public createMessengerEmbed!: (opts?: MakeMessengerOpts) => Messenger;

  /**
   * Set by the host app (e.g. AgentStack frontend `SDKProvider`).
   * Use `sdk.activity?.isActive` or `useIsTabActive(sdk)` for visibility-aware logic.
   */
  public activity?: ITabActivitySurface;

  // Auth state
  public authStateStore: AuthStateStore;
  
  private startTime: number;

  constructor(config: SDKConfig) {
    super();
    
    this.config = config;
    this.startTime = Date.now();
    this.authStateStore = new AuthStateStore();
    
    // Philosophy v0.1.16: Elegant Minimalism - Version confidence
    logger.info(`🧬 AgentStack SDK v${SDK_VERSION.semantic} ${SDK_VERSION.generation} initialized`);
    logger.info(`📋 Features: ${Object.entries(SDK_VERSION.features).filter(([_, enabled]) => enabled).map(([feature]) => feature).join(', ')}`);
    logger.info(`🏗️ Build: ${SDK_VERSION.buildHash} (${SDK_VERSION.philosophy})`);
    
    // Convert SDKConfig to HTTPClient config format
    const httpConfig = {
      ...config,
      baseUrl: config.apiBase, // Map apiBase to baseUrl for HTTPClient
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableCaching: config.enableCaching !== false,
      enableMetrics: config.enableMetrics !== false
    };
    
    this.httpClient = new HTTPClient(httpConfig, this.authStateStore);
    
    // ✅ CRITICAL FIX: Автоматически загружаем токены из localStorage при инициализации SDK
    // Это критично для восстановления сессии после перезагрузки страницы
    // HTTPClient уже загружает токены в своем конструкторе, но убедимся, что они установлены
    this.refreshTokensFromStorage();

    // G-4: Global unhandled promise rejection handler — catch any SDK promise that escapes
    // a try/catch (e.g. fire-and-forget async calls) and log them instead of crashing.
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const name = (reason as any)?.name ?? '';
        const message = (reason as any)?.message ?? String(reason);
        // AbortError from React Query cancellations is expected — suppress completely.
        if (name === 'AbortError') {
          event.preventDefault();
          return;
        }
        if (
          isChunkLikeErrorMessage(message) ||
          (typeof window !== 'undefined' &&
            !!(window as unknown as { __agentstack_chunk_recovery_active?: boolean })
              .__agentstack_chunk_recovery_active)
        ) {
          event.preventDefault();
          return;
        }
        logger.error(`Unhandled promise rejection: ${name}: ${message}`, { reason });
      });
    }

    // Инициализация модулей SDK
    this.auth = new AgentAuth(this.httpClient, this.authStateStore);
    this.api = new AgentAPI(this.httpClient);
    this._admin = new AgentAdmin(this.httpClient);
    this._adminData = new AgentAdminData(this.httpClient);
    this.neural = new AgentNeural(this.httpClient);
    this.docs = new AgentDocs(this.httpClient);
    this.payments = new AgentPayments(this.httpClient);
    this.agentsFleet = new AgentsFleet(this.httpClient);
    this.economy = new AgentEconomyFacade(this.httpClient, this.agentsFleet);
    this.public = new AgentPublicSurface(this.httpClient);
    this.finance = new AgentFinanceFacade(this.httpClient);
    this.agentnetBnb = new AgentNetBnb(this.httpClient);
    this.agentnetSolana = new AgentNetSolana(this.httpClient);
    this.analytics = new AgentAnalytics(this.httpClient);
    this.webhooks = new AgentWebhooks(this.httpClient);
    this.integrations = new AgentIntegrations(this.httpClient);
    this.bots = new AgentBots(this.httpClient);
    this.crm = new AgentCrm(this.httpClient);
    this.hosting = new AgentHosting(this.httpClient);
    this.scheduler = new AgentScheduler(this.httpClient);
    this.webPush = new AgentWebPush(this.httpClient);
    this.guidancePlatform = new GuidancePlatformFacade(this.httpClient);
    this.social = new AgentSocial(this.httpClient);
    this.support = new AgentSupport(this.httpClient);
    this.notifications = new AgentNotifications(this.httpClient, this.webPush);
    this.wallets = new AgentWallets(this.httpClient);
    this.invoices = new AgentInvoices(this.httpClient);
    this.billing = new AgentBilling(this.httpClient, this);
    this.rbac = new AgentRBAC(this.httpClient);
    this.i18n = new AgentI18n(this.httpClient);  // ← NEW! Zero Config translations
    this.dna = new AgentDNA(this.httpClient);  // ← NEW! Universal DNA operations (v0.1.40!)
    const UNIFIED_8DNA = 'data_projects_8dna';
    this.projects = createDNATableWrapper(this.dna, UNIFIED_8DNA, {
      unified_8dna_role: 'project',
    });
    this.users = createDNATableWrapper(this.dna, UNIFIED_8DNA, {
      unified_8dna_role: 'user',
    });
    this.logic = new AgentLogic(this.httpClient);  // ← NEW! Logic Engine (v0.2.1)
    this.command = new AgentCommand(this.httpClient);  // ← NEW! Client Commands (v0.2.1)
    this.proteinCommandChannel = new ProteinCommandChannel(this.httpClient);
    this.marketplace = new AgentMarketplace(this.httpClient);  // ← NEW! Marketplace (v0.4.0)
    this.commerce = new CommerceFacade(this.httpClient);
    this.assets = new AgentAssets(this.httpClient);  // ← NEW! Assets (v0.4.0)
    this.globalAssets = new AgentGlobalAssets(this.httpClient);  // ← NEW! Global Assets Registry (v0.4.1)
    this.buffs = new AgentBuffs(this.httpClient, this);  // ← NEW! Buffs System (v0.4.9)
    this.ecosystem = new AgentEcosystem(this.httpClient);
    this.diagnostics = new AgentDiagnostics(this.httpClient);
    this.commerceAdmin = new AgentCommerceAdmin(this.httpClient);
    this.seo = new AgentSeo(this.httpClient);
    this.storage = new AgentStorage(this.httpClient);
    // Client-side media primitives — browser-only surfaces are feature-detected
    // at call site, so this constructor is safe in Node / SSR.
    this.media = createAgentStackMedia();
    this.mobile = createMobileSurface();

    // 🧬 NEW! Protein System Initialization (v0.3.6)
    this.protein = new AgentProtein(this.httpClient);
    this.proteinProcessor = new ProteinResponseProcessor();

    this.entitySnapshotRepository = createEntitySnapshotRepository({
      maxSnapshots: 200,
      ttlMs: 86_400_000,
    });

    this.protocol = new AgentProtocol(
      {
        http: this.httpClient,
        commands: this.proteinCommandChannel,
        snapshots: this.entitySnapshotRepository,
        rulesCommand: this.command,
        protein: this.protein,
        dna: this.dna,
        social: this.social,
        webPush: this.webPush,
        economy: this.economy,
        finance: this.finance,
      },
      {}
    );

    const createMessengerEmbed = (opts?: MakeMessengerOpts) =>
      makeMessenger({
        http: this.httpClient,
        clientConfig: buildMessengerClientConfigFromHttpClientConfig(this.httpClient.getConfig()),
        ...opts,
      });
    this.createMessengerEmbed = createMessengerEmbed;

    const self = this;
    this.platform = {
      http: this.httpClient,
      auth: this.auth,
      authStateStore: this.authStateStore,
      api: this.api,
      get adminData(): AgentAdminData {
        assertPlatformOperatorSurface(self.config, 'sdk.platform.adminData');
        return self._adminData;
      },
      dna: this.dna,
      projects: this.projects,
      users: this.users,
      protocol: this.protocol,
      command: this.command,
      proteinCommandChannel: this.proteinCommandChannel,
      snapshots: this.entitySnapshotRepository,
      i18n: this.i18n,
      rbac: this.rbac,
      ecosystem: this.ecosystem,
      agentsFleet: this.agentsFleet,
      economy: this.economy,
      finance: this.finance,
      social: this.social,
      support: this.support,
      webPush: this.webPush,
      guidance: this.guidancePlatform,
      activity: undefined,
      createMessengerEmbed,
      fetchMessengerThreadHistory: (opts) => messengerFetchThreadHistory(this.social, opts),
      fetchMessengerSocialDelta: (opts, httpOpts) =>
        messengerFetchSocialDelta(this.social, opts, httpOpts),
      getMessengerChannelInvitesInbox: (httpOpts) =>
        messengerChannelInvitesInbox(this.social, httpOpts),
      postMessengerChannelInvitesLinkToken: (body, httpOpts) =>
        messengerChannelInvitesLinkToken(this.social, body, httpOpts),
      postMessengerChannelInvitesAccept: (body, httpOpts) =>
        messengerChannelInvitesAccept(this.social, body, httpOpts),
      postMessengerChannelInvitesDecline: (body, httpOpts) =>
        messengerChannelInvitesDecline(this.social, body, httpOpts),
      postMessengerChannelInvitesRedeem: (body, httpOpts) =>
        messengerChannelInvitesRedeem(this.social, body, httpOpts),
      postMessengerPublicPublish: (body, httpOpts) =>
        messengerPublicPublish(this.social, body, httpOpts),
      postMessengerPublicUnpublish: (body, httpOpts) =>
        messengerPublicUnpublish(this.social, body, httpOpts),
      postMessengerChatMessageComment: (body, httpOpts) =>
        messengerChatMessageComment(this.social, body, httpOpts),
      postMessengerChatMessageReact: (body, httpOpts) =>
        messengerChatMessageReact(this.social, body, httpOpts),
      postMessengerPushSurface: (body, httpOpts) =>
        messengerPushSurfacePost(this.social, body, httpOpts),
      postMessengerChatReadSet: (body, httpOpts) =>
        messengerChatReadSet(this.social, body, httpOpts),
      getMessengerSettingsPrivacy: (httpOpts) =>
        messengerSettingsPrivacyGet(this.social, httpOpts),
      putMessengerSettingsPrivacy: (body, httpOpts) =>
        messengerSettingsPrivacyPut(this.social, body, httpOpts),
      getMessengerPrefs: (httpOpts) => messengerPrefsGet(this.social, httpOpts),
      putMessengerPrefs: (body, httpOpts) => messengerPrefsPut(this.social, body, httpOpts),
      getMessengerChatReadMap: (httpOpts) => messengerChatReadMap(this.social, httpOpts),
      getMessengerChatIndex: (httpOpts) => messengerChatIndexGet(this.social, httpOpts),
      putMessengerChatIndex: (body, httpOpts) =>
        messengerChatIndexPut(this.social, body, httpOpts),
      postMessengerChatIndexRemove: (body, httpOpts) =>
        messengerChatIndexRemove(this.social, body, httpOpts),
      getMessengerFriendsRequestsOut: (params, httpOpts) =>
        messengerFriendsRequestsOut(this.social, params, httpOpts),
      getMessengerFriendsUserIds: (httpOpts) =>
        messengerFriendsUserIds(this.social, httpOpts),
      getMessengerFriendsCards: (httpOpts) => messengerFriendsCards(this.social, httpOpts),
      getMessengerChannel: (homeProjectId, channelId, httpOpts) =>
        messengerChannelGet(this.social, homeProjectId, channelId, httpOpts),
      getMessengerPublicQuota: (httpOpts) => messengerPublicQuota(this.social, httpOpts),
      getMessengerPublicMine: (homeProjectId, httpOpts) =>
        messengerPublicMine(this.social, homeProjectId, httpOpts),
      getMessengerPublicIndex: (params, httpOpts) =>
        messengerPublicIndex(this.social, params, httpOpts),
      getMessengerPresenceOnline: (homeProjectId, httpOpts) =>
        messengerPresenceOnline(this.social, homeProjectId, httpOpts),
      postMessengerUsersPublicCards: (body, httpOpts) =>
        messengerUsersPublicCards(this.social, body, httpOpts),
      postMessengerChannelCreate: (body, httpOpts) =>
        messengerChannelCreate(this.social, body, httpOpts),
      postMessengerChannelsRegister: (body, httpOpts) =>
        messengerChannelsRegister(this.social, body, httpOpts),
      postMessengerChannelsUpdate: (body, httpOpts) =>
        messengerChannelsUpdate(this.social, body, httpOpts),
      postMessengerDmEnsure: (body, httpOpts) => messengerDmEnsure(this.social, body, httpOpts),
      postMessengerChannelsDelete: (body, httpOpts) =>
        messengerChannelsDelete(this.social, body, httpOpts),
      getMessengerChannelHistory: (homeProjectId, channelId, httpOpts) =>
        messengerChannelHistory(this.social, homeProjectId, channelId, httpOpts),
      postMessengerChannelMessagesResolve: (homeProjectId, channelId, pairs, httpOpts) =>
        messengerChannelMessagesResolve(this.social, homeProjectId, channelId, pairs, httpOpts),
      postMessengerFriendRequest: (body, httpOpts) =>
        messengerFriendRequest(this.social, body, httpOpts),
      postMessengerFriendsRemove: (body, httpOpts) =>
        messengerFriendsRemove(this.social, body, httpOpts),
      postMessengerFriendsBlock: (body, httpOpts) =>
        messengerFriendsBlock(this.social, body, httpOpts),
    };

    this.setupEventForwarding();
  }

  // ============================================================================
  // Auth Token and API Key Management
  // ============================================================================

  setAuthToken(token: string | null): void {
    this.httpClient.setAuthToken(token);
  }

  setApiKey(apiKey: string | null): void {
    this.httpClient.setApiKey(apiKey);
  }

  /**
   * Stop all auth-dependent activity and clear tokens
   */
  async logoutAndStop(): Promise<void> {
    this.authStateStore.setState({
      state: 'logging_out',
      reason: 'manual_logout',
      tokens: {
        accessToken: this.httpClient.getAuthToken(),
        apiKey: this.httpClient.getApiKey()
      }
    });

    try {
      await this.auth.logout();
    } catch (error) {
      logger.warn('Logout request failed, continuing local cleanup', error as Error);
    }

    this.httpClient.setAuthToken(null);
    this.httpClient.setApiKey(null);
    this.httpClient.clearCache();
    this.httpClient.cancelPendingRequests();
    this.entitySnapshotRepository.clear();
    this.clearStoredTokens();

    this.authStateStore.reset('manual_logout');
    this.emit('auth:logout:local');
  }

  getAuthStateSnapshot() {
    return this.authStateStore.getSnapshot();
  }

  /**
   * ✅ CRITICAL: Restore authentication state from tokens
   * This should be called after SDK initialization if tokens exist in storage
   * to ensure authStateStore reflects the actual authentication state
   */
  restoreAuthState(): void {
    const authToken = this.httpClient.getAuthToken();
    const apiKey = this.httpClient.getApiKey();
    
    // If we have both tokens, we're authenticated
    if (authToken && apiKey) {
      logger.debug('🔄 Restoring authenticated state from existing tokens');
      this.authStateStore.setState({
        state: 'authenticated',
        reason: 'token_restored',
        tokens: {
          accessToken: authToken,
          apiKey: apiKey
        }
      });
    } else if (apiKey) {
      // If we only have API key, we might be in API key auth mode
      // But for now, we'll set to unauthenticated if no access token
      logger.debug('⚠️ Only API key found, no access token - keeping unauthenticated state');
    } else {
      // No tokens at all
      logger.debug('ℹ️ No tokens found - keeping unauthenticated state');
    }
  }

  private clearStoredTokens(): void {
    if (typeof window === 'undefined') return;
    const keys = [
      'access_token',
      'refresh_token',
      'api_key',
      'user_token',
      'session_uuid',
      'user_id',
      'project_id',
      'login_email',
      'login_password',
      'login_project_id'
    ];

    keys.forEach(key => {
      removeStorageItem(key);
      window.sessionStorage?.removeItem(key);
    });
  }


  // ============================================================================
  // Configuration Management
  // ============================================================================

  updateConfig(newConfig: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.httpClient.updateConfig(newConfig);
    this.emit('config:updated', this.config);
  }

  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Machine-readable list of platform vs domain modules for agents.
   * When `SDKConfig.modules` is introduced, `enabled` will reflect gates (see engineering backlog RFC).
   */
  getCapabilityMatrix(): SDKCapabilityMatrix {
    return buildCapabilityMatrix(
      SDK_VERSION.semantic,
      SDK_VERSION.generation,
      this.config.modules as Partial<Record<string, boolean>> | undefined,
      this.config.sdkAudience,
    );
  }

  /**
   * Self-declarative catalog: capability matrix + docRefs, accessPaths, aiHints, examples.
   * For agents, doc generators, and IDE tooling.
   */
  getModuleCatalog(): SDKModuleCatalog {
    return buildModuleCatalog(
      SDK_VERSION.semantic,
      SDK_VERSION.generation,
      this.config.modules as Partial<Record<string, boolean>> | undefined,
      this.config.sdkAudience,
    );
  }

  /**
   * Active project id for `X-Project-ID` and scoped modules (economy, agents, storage, …).
   */
  getProjectId(): number | undefined {
    return resolveEffectiveProjectId(
      this.httpClient.getConfig().projectId ?? this.config.projectId,
    );
  }

  /**
   * Same as {@link getProjectId} but throws when missing (integrator guard).
   */
  requireProjectId(): number {
    const id = this.getProjectId();
    if (!id) {
      throw new AgentStackError(
        'projectId is required. Set SDKConfig.projectId, call sdk.updateProjectId(id) after login, ' +
          'or pass project_id in sdk.platform.auth.login(). See docs/PROJECT_CONTEXT.md.',
      );
    }
    return id;
  }

  /**
   * Update project ID in SDK configuration (workspace switcher, post-login selection).
   */
  updateProjectId(projectId: number): void {
    const pid = normalizeProjectId(projectId);
    if (!pid) {
      throw new AgentStackError('updateProjectId: invalid project id');
    }
    this.config.projectId = pid;
    this.httpClient.updateConfig({ projectId: pid });
    this.emit('project:changed', { projectId: pid });
  }

  // ============================================================================
  // Health and Status
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      // Philosophy v0.1.16: Elegant Minimalism - быстрый health check с таймаутом
      // В development режиме используем относительный URL для работы с proxy
      // В production режиме используем полный URL
      const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
      const healthUrl = isDevelopment ? '/health' : `${this.config.apiBase}/health`;
      
      // Быстрый health check с таймаутом 2 секунды
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
        await this.httpClient.get(healthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        return true;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // Philosophy v0.1.16: Elegant Minimalism - не блокируем инициализацию при ошибке health check
      logger.warn('Health check failed, but continuing initialization:', (error as Error).message);
      return false;
    }
  }

  async getStatus(): Promise<{
    healthy: boolean;
    version: string;
    timestamp: string;
    metrics?: any;
  }> {
    const healthy = await this.healthCheck();
    const metrics = this.httpClient.getMetrics();
    
    return {
      healthy,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metrics
    };
  }

  /**
   * Получение версии SDK (legacy method)
   */
  getVersionString(): string {
    return SDK_VERSION.semantic;
  }

  /**
   * Получение HTTP клиента
   */
  getClient(): HTTPClient {
    return this.httpClient;
  }

  /**
   * Philosophy v0.1.16: Elegant Minimalism - Version confidence methods
   */
  
  /**
   * Get SDK version information
   */
  getVersion(): typeof SDK_VERSION {
    return SDK_VERSION;
  }

  /**
   * Check if SDK has required feature
   */
  hasFeature(feature: keyof typeof SDK_VERSION.features): boolean {
    return VersionManager.hasFeature(feature);
  }

  /**
   * Check if SDK version is compatible
   */
  isCompatible(requiredVersion: string): boolean {
    return VersionManager.isCompatible(requiredVersion);
  }

  /**
   * Check if SDK needs rebuild based on feature requirements
   */
  needsRebuild(requiredFeatures: (keyof typeof SDK_VERSION.features)[]): boolean {
    return VersionManager.needsRebuild(requiredFeatures);
  }

  /**
   * Получение метрик SDK
   */
  async getMetrics(): Promise<{
    requests: number;
    cacheHitRate: number;
    averageLatency: number;
    errorRate: number;
    uptime: number;
  }> {
    const metrics = await this.httpClient.getMetrics();
    return {
      requests: metrics.requests.total,
      cacheHitRate: metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses) || 0,
      averageLatency: metrics.latency.avg,
      errorRate: metrics.requests.failed / metrics.requests.total || 0,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Очистка кэша
   */
  async clearCache(): Promise<void> {
    await this.httpClient.clearCache();
  }

  /**
   * Проверка подключения
   */
  async ping(): Promise<{
    status: 'ok' | 'error';
    latency: number;
    timestamp: string;
  }> {
    const startTime = Date.now();
    try {
      await this.httpClient.get('/health');
      return {
        status: 'ok',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    // Forward HTTP client events
    this.httpClient.on('request:success', (data: any) => {
      this.emit('request:success', data);
    });

    this.httpClient.on('request:error', (data: any) => {
      this.emit('request:error', data);
    });

    this.httpClient.on('request:cached', (data: any) => {
      this.emit('request:cached', data);
    });

    this.httpClient.on('request:retry', (data: any) => {
      this.emit('request:retry', data);
    });

    // Forward auth module events
    this.auth.on('auth:login', (data: any) => {
      this.emit('auth:login', data);
    });

    this.auth.on('auth:logout', () => {
      this.emit('auth:logout');
    });

    this.auth.on('auth:refresh', (data: any) => {
      this.emit('auth:refresh', data);
    });

    this.auth.on('auth:refresh:failed', (error: any) => {
      this.emit('auth:refresh:failed', error);
    });

    // Forward neural module events
    this.neural.on('neural:cache:hit', (data: any) => {
      this.emit('neural:cache:hit', data);
    });

    this.neural.on('neural:cache:miss', (data: any) => {
      this.emit('neural:cache:miss', data);
    });

    this.neural.on('neural:event:emitted', (data: any) => {
      this.emit('neural:event:emitted', data);
    });

    // Forward protein system events
    this.protein.on('protein:request:start', (data: any) => {
      this.emit('protein:request:start', data);
    });

    this.protein.on('protein:request:success', (data: any) => {
      this.emit('protein:request:success', data);
    });

    this.protein.on('protein:request:error', (data: any) => {
      this.emit('protein:request:error', data);
    });

    this.protein.on('protein:cache:hit', (data: any) => {
      this.emit('protein:cache:hit', data);
    });
  }

  private attachPageCompositionForwarding(pc: PageCompositionSystem): void {
    pc.on('composition:start', (data: any) => {
      this.emit('composition:start', data);
    });
    pc.on('composition:success', (data: any) => {
      this.emit('composition:success', data);
    });
    pc.on('composition:error', (data: any) => {
      this.emit('composition:error', data);
    });
  }

  private attachGameDataForwarding(gd: GameDataSystem): void {
    gd.on('session:created', (data: any) => {
      this.emit('session:created', data);
    });
    gd.on('character:loaded', (data: any) => {
      this.emit('character:loaded', data);
    });
    gd.on('quest:completed', (data: any) => {
      this.emit('quest:completed', data);
    });
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Refresh tokens from storage
   */
  refreshTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      const accessToken = getStorageItem('access_token');
      const apiKey = getStorageItem('api_key');
      
      if (accessToken && this.httpClient) {
        this.httpClient.setAuthToken(accessToken);
      }
      
      if (apiKey && this.httpClient) {
        this.httpClient.setApiKey(apiKey);
      }
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.removeAllListeners();
    this.httpClient.removeAllListeners();
    this.auth.removeAllListeners();
    this.neural.removeAllListeners();
    
    // Cleanup protein system modules
    this.protein.removeAllListeners();
    this.proteinProcessor.removeAllListeners();
    this._pageComposition?.removeAllListeners();
    this._gameData?.removeAllListeners();
  }
}



