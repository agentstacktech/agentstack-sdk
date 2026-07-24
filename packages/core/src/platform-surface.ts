/**
 * Stable AI / integration surface: references only, no duplicated logic.
 * @see docs/SDK_AI_SURFACE.md
 */

import { TASK_CATALOG_METADATA } from './capability-tasks/taskCatalogMetadata';
import {
  filterCapabilityEntriesForAudience,
  type SDKAudience,
} from './config/integratorScope';

import type { HTTPClient } from './client/http-client';
import type { AgentAuth } from './modules/AgentAuth';
import type { AgentAPI } from './modules/AgentAPI';
import type { AgentAdminData } from './modules/AgentAdminData';
import type { AgentDNA, DNAEntity, DNAQueryParams, DNAListResponse } from './modules/AgentDNA';
import type { AgentCommand } from './modules/AgentCommand';
import type { ProteinCommandChannel } from './modules/ProteinCommandChannel';
import type { EntitySnapshotRepository } from './cache/entity-snapshot-repository';
import type { AgentProtocol } from './protocol/AgentProtocol';
import type { AgentI18n } from './modules/AgentI18n';
import type { AgentRBAC } from './modules/AgentRBAC';
import type { AgentEcosystem } from './modules/AgentEcosystem';
import type { AgentSocial } from './modules/AgentSocial';
import type { AgentSupport } from './modules/AgentSupport';
import type { AgentWebPush } from './modules/AgentWebPush';
import type { AgentsFleet } from './modules/AgentsFleet';
import type { AgentEconomyFacade } from './economy/AgentEconomyFacade';
import type { AgentFinanceFacade } from './finance/AgentFinanceFacade';
import type { AuthStateStore } from './utils/auth-state';
import type { ITabActivitySurface } from './modules/TabActivitySurface';
import type {
  Messenger,
  MakeMessengerOpts,
  MessengerFetchThreadHistoryParams,
  MessengerFetchSocialDeltaParams,
  MessengerSocialDeltaHttpOpts,
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
import type { APIResponse } from './types';
import type { GuidancePlatformFacade } from './guidance/GuidancePlatformFacade';

/** Same contract as `DNATableWrapper` on AgentStackSDK (projects / users). */
export interface PlatformDNATableWrapper {
  list<T = any>(params?: DNAQueryParams): Promise<DNAListResponse<T>>;
  get<T = any>(uuid: string): Promise<DNAEntity<T>>;
  create<T = any>(entity: Partial<DNAEntity<T>>): Promise<DNAEntity<T>>;
  update<T = any>(
    uuid: string,
    updates: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>
  ): Promise<DNAEntity<T>>;
  delete(uuid: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Canonical subset for agents and compatibility: use `sdk.platform` instead of
 * scanning every property on AgentStackSDK.
 */
export interface AgentStackPlatformSurface {
  /** Shared HTTP: auth headers, retries, optional GET batching */
  http: HTTPClient;
  /** Login, refresh, profile */
  auth: AgentAuth;
  authStateStore: AuthStateStore;
  /** Main REST surface (projects, users, …) */
  api: AgentAPI;
  /**
   * Admin data BFF (`/api/admin/data/*`) — **platform operator only**.
   * Not available when `SDKConfig.sdkAudience` is `integrator` (default).
   */
  adminData: AgentAdminData;
  dna: AgentDNA;
  projects: PlatformDNATableWrapper;
  users: PlatformDNATableWrapper;
  /** Ecosystem facade: REST + /commands/* + snapshots + dna* */
  protocol: AgentProtocol;
  /** Rules Engine — POST /command */
  command: AgentCommand;
  proteinCommandChannel: ProteinCommandChannel;
  /** Alias of entitySnapshotRepository */
  snapshots: EntitySnapshotRepository;
  i18n: AgentI18n;
  rbac: AgentRBAC;
  ecosystem: AgentEcosystem;
  /** Agents Fleet (`/api/projects/{id}/agents/*`, `/api/users/me/agents/*`) */
  agentsFleet: AgentsFleet;
  /**
   * AgentNet L0 + compute credits + paid runs — tenant paths only
   * (`/api/agentnet/{project_id}/*`). No `/api/admin/*` (root `sdk.admin` for platform ops).
   */
  economy: AgentEconomyFacade;
  /** Finance Hub BFF (`/api/finance/*`) — portfolio, swap, project fund */
  finance: AgentFinanceFacade;
  /** AgentSocial messenger / friends / PAS */
  social: AgentSocial;
  /** Project support REST facade (`/api/support/*`). */
  support: AgentSupport;
  /** Web Push VAPID subscription API */
  webPush: AgentWebPush;
  /** Guided path REST (`/api/projects/{id}/guidance/*`) — {@link GuidanceClient} factory */
  guidance: GuidancePlatformFacade;
  /**
   * Tab visibility coordinator (browser shells): pauses background polling / WS pokes when attached.
   * Optional — set by the host app (e.g. `sdk.activity = coordinator`).
   */
  activity?: ITabActivitySurface;

  /**
   * Long-poll messenger facade for embeds: `makeMessenger({ http, clientConfig })` with
   * `MessengerClientConfig` derived from the same resolved HTTP config as {@link HTTPClient}.
   */
  createMessengerEmbed: (opts?: MakeMessengerOpts) => Messenger;

  /**
   * Thread snapshot GET (dm vs shared) bound to {@link AgentSocial} — same as
   * `messengerFetchThreadHistory(sdk.social, opts)` without importing `AgentSocial` in the widget.
   */
  fetchMessengerThreadHistory: (
    opts: MessengerFetchThreadHistoryParams
  ) => Promise<APIResponse<Record<string, unknown>>>;

  /**
   * Один GET `/api/social/delta` без дублирования путей — тело ответа как `Record` (как в long-poll transport).
   * Для beacon-обёртки см. `fetchMessengerSocialDelta` в `@agentstack/messenger/lib/messengerSocialDeltaFetch`.
   */
  fetchMessengerSocialDelta: (
    opts: MessengerFetchSocialDeltaParams,
    httpOpts?: MessengerSocialDeltaHttpOpts
  ) => Promise<Record<string, unknown>>;

  /** GET `/api/social/channel-invites/inbox` — зеркало {@link AgentSocial.channelInvitesInbox}. */
  getMessengerChannelInvitesInbox: (
    httpOpts?: MessengerChannelInvitesInboxHttpOpts
  ) => ReturnType<AgentSocial['channelInvitesInbox']>;

  /** POST `/api/social/channel-invites/link-token` — share-link для канала. */
  postMessengerChannelInvitesLinkToken: (
    body: MessengerChannelInvitesLinkTokenBody,
    httpOpts?: MessengerChannelInvitesLinkTokenHttpOpts
  ) => ReturnType<AgentSocial['channelInvitesLinkToken']>;

  postMessengerChannelInvitesAccept: (
    body: MessengerChannelInvitesAcceptBody,
    httpOpts?: MessengerChannelInvitesAcceptHttpOpts
  ) => ReturnType<AgentSocial['channelInvitesAccept']>;

  postMessengerChannelInvitesDecline: (
    body: MessengerChannelInvitesDeclineBody,
    httpOpts?: MessengerChannelInvitesDeclineHttpOpts
  ) => ReturnType<AgentSocial['channelInvitesDecline']>;

  postMessengerChannelInvitesRedeem: (
    body: MessengerChannelInvitesRedeemBody,
    httpOpts?: MessengerChannelInvitesRedeemHttpOpts
  ) => ReturnType<AgentSocial['channelInvitesRedeem']>;

  /** POST `/api/social/public/publish` — каталог открытых каналов. */
  postMessengerPublicPublish: (
    body: MessengerPublicPublishBody,
    httpOpts?: MessengerPublicPublishHttpOpts
  ) => ReturnType<AgentSocial['publicPublish']>;

  /** POST `/api/social/public/unpublish`. */
  postMessengerPublicUnpublish: (
    body: MessengerPublicUnpublishBody,
    httpOpts?: MessengerPublicUnpublishHttpOpts
  ) => ReturnType<AgentSocial['publicUnpublish']>;

  /** GET `/api/social/settings/privacy` — зеркало {@link AgentSocial.settingsPrivacyGet}. */
  getMessengerSettingsPrivacy: (
    httpOpts?: Parameters<AgentSocial['settingsPrivacyGet']>[0]
  ) => ReturnType<AgentSocial['settingsPrivacyGet']>;

  /** PUT `/api/social/settings/privacy` — зеркало {@link AgentSocial.settingsPrivacyPut}. */
  putMessengerSettingsPrivacy: (
    body: Parameters<AgentSocial['settingsPrivacyPut']>[0],
    httpOpts?: Parameters<AgentSocial['settingsPrivacyPut']>[1]
  ) => ReturnType<AgentSocial['settingsPrivacyPut']>;

  /** POST `/api/social/chat/message/comment` — зеркало {@link AgentSocial.chatMessageComment}. */
  postMessengerChatMessageComment: (
    body: Parameters<AgentSocial['chatMessageComment']>[0],
    httpOpts?: Parameters<AgentSocial['chatMessageComment']>[1]
  ) => ReturnType<AgentSocial['chatMessageComment']>;

  /** POST `/api/social/chat/message/react` — зеркало {@link AgentSocial.chatMessageReact}. */
  postMessengerChatMessageReact: (
    body: Parameters<AgentSocial['chatMessageReact']>[0],
    httpOpts?: Parameters<AgentSocial['chatMessageReact']>[1]
  ) => ReturnType<AgentSocial['chatMessageReact']>;

  /** POST `/api/social/messenger/push-surface` — зеркало {@link AgentSocial.messengerPushSurfacePost}. */
  postMessengerPushSurface: (
    body: Parameters<AgentSocial['messengerPushSurfacePost']>[0],
    httpOpts?: Parameters<AgentSocial['messengerPushSurfacePost']>[1]
  ) => ReturnType<AgentSocial['messengerPushSurfacePost']>;

  /** POST `/api/social/chat/read` — зеркало {@link AgentSocial.chatReadSet}. */
  postMessengerChatReadSet: (
    body: Parameters<AgentSocial['chatReadSet']>[0],
    httpOpts?: Parameters<AgentSocial['chatReadSet']>[1]
  ) => ReturnType<AgentSocial['chatReadSet']>;

  /** GET `/api/social/messenger/prefs` — зеркало {@link AgentSocial.messengerPrefsGet}. */
  getMessengerPrefs: (
    httpOpts?: Parameters<AgentSocial['messengerPrefsGet']>[0]
  ) => ReturnType<AgentSocial['messengerPrefsGet']>;

  /** PUT `/api/social/messenger/prefs` — зеркало {@link AgentSocial.messengerPrefsPut}. */
  putMessengerPrefs: (
    body: Parameters<AgentSocial['messengerPrefsPut']>[0],
    httpOpts?: Parameters<AgentSocial['messengerPrefsPut']>[1]
  ) => ReturnType<AgentSocial['messengerPrefsPut']>;

  /** GET `/api/social/chat/read-map` — зеркало {@link AgentSocial.chatReadMap}. */
  getMessengerChatReadMap: (
    httpOpts?: Parameters<AgentSocial['chatReadMap']>[0]
  ) => ReturnType<AgentSocial['chatReadMap']>;

  /** GET `/api/social/chat/index` — зеркало {@link AgentSocial.chatIndexGet}. */
  getMessengerChatIndex: (
    httpOpts?: Parameters<AgentSocial['chatIndexGet']>[0]
  ) => ReturnType<AgentSocial['chatIndexGet']>;

  /** PUT `/api/social/chat/index` — зеркало {@link AgentSocial.chatIndexPut}. */
  putMessengerChatIndex: (
    body: Parameters<AgentSocial['chatIndexPut']>[0],
    httpOpts?: Parameters<AgentSocial['chatIndexPut']>[1]
  ) => ReturnType<AgentSocial['chatIndexPut']>;

  /** POST `/api/social/chat/index/remove` — зеркало {@link AgentSocial.chatIndexRemove}. */
  postMessengerChatIndexRemove: (
    body: Parameters<AgentSocial['chatIndexRemove']>[0],
    httpOpts?: Parameters<AgentSocial['chatIndexRemove']>[1]
  ) => ReturnType<AgentSocial['chatIndexRemove']>;

  getMessengerFriendsRequestsOut: (
    params?: Parameters<AgentSocial['friendsRequestsOut']>[0],
    httpOpts?: Parameters<AgentSocial['friendsRequestsOut']>[1]
  ) => ReturnType<AgentSocial['friendsRequestsOut']>;

  /** GET `/api/social/friends/user-ids` — зеркало {@link AgentSocial.friendsUserIds}. */
  getMessengerFriendsUserIds: (
    httpOpts?: Parameters<AgentSocial['friendsUserIds']>[0]
  ) => ReturnType<AgentSocial['friendsUserIds']>;

  /** GET `/api/social/friends/cards` — зеркало {@link AgentSocial.friendsCards}. */
  getMessengerFriendsCards: (
    httpOpts?: Parameters<AgentSocial['friendsCards']>[0]
  ) => ReturnType<AgentSocial['friendsCards']>;

  getMessengerChannel: (
    homeProjectId: number,
    channelId: string,
    httpOpts?: Parameters<AgentSocial['channelGet']>[2]
  ) => ReturnType<AgentSocial['channelGet']>;

  getMessengerPublicQuota: (
    httpOpts?: Parameters<AgentSocial['publicQuota']>[0]
  ) => ReturnType<AgentSocial['publicQuota']>;

  getMessengerPublicMine: (
    homeProjectId?: Parameters<AgentSocial['publicMine']>[0],
    httpOpts?: Parameters<AgentSocial['publicMine']>[1]
  ) => ReturnType<AgentSocial['publicMine']>;

  getMessengerPublicIndex: (
    params: Parameters<AgentSocial['publicIndex']>[0],
    httpOpts?: Parameters<AgentSocial['publicIndex']>[1]
  ) => ReturnType<AgentSocial['publicIndex']>;

  getMessengerPresenceOnline: (
    homeProjectId: number,
    httpOpts?: Parameters<AgentSocial['presenceOnline']>[1]
  ) => ReturnType<AgentSocial['presenceOnline']>;

  postMessengerUsersPublicCards: (
    body: Parameters<AgentSocial['usersPublicCards']>[0],
    httpOpts?: Parameters<AgentSocial['usersPublicCards']>[1]
  ) => ReturnType<AgentSocial['usersPublicCards']>;

  postMessengerChannelCreate: (
    body: Parameters<AgentSocial['channelCreate']>[0],
    httpOpts?: Parameters<AgentSocial['channelCreate']>[1]
  ) => ReturnType<AgentSocial['channelCreate']>;

  postMessengerChannelsRegister: (
    body: Parameters<AgentSocial['channelsRegister']>[0],
    httpOpts?: Parameters<AgentSocial['channelsRegister']>[1]
  ) => ReturnType<AgentSocial['channelsRegister']>;

  postMessengerChannelsUpdate: (
    body: Parameters<AgentSocial['channelsUpdate']>[0],
    httpOpts?: Parameters<AgentSocial['channelsUpdate']>[1]
  ) => ReturnType<AgentSocial['channelsUpdate']>;

  postMessengerDmEnsure: (
    body: Parameters<AgentSocial['dmEnsure']>[0],
    httpOpts?: Parameters<AgentSocial['dmEnsure']>[1]
  ) => ReturnType<AgentSocial['dmEnsure']>;

  postMessengerChannelsDelete: (
    body: Parameters<AgentSocial['channelsDelete']>[0],
    httpOpts?: Parameters<AgentSocial['channelsDelete']>[1]
  ) => ReturnType<AgentSocial['channelsDelete']>;

  /** GET `/api/social/channel/{id}/history` — зеркало {@link AgentSocial.channelHistory}. */
  getMessengerChannelHistory: (
    homeProjectId: number,
    channelId: string,
    httpOpts?: Parameters<AgentSocial['channelHistory']>[2]
  ) => ReturnType<AgentSocial['channelHistory']>;

  /** POST `/api/social/channel/{id}/resolve-messages` — зеркало {@link AgentSocial.channelMessagesResolve}. */
  postMessengerChannelMessagesResolve: (
    homeProjectId: number,
    channelId: string,
    pairs: Parameters<AgentSocial['channelMessagesResolve']>[2],
    httpOpts?: Parameters<AgentSocial['channelMessagesResolve']>[3]
  ) => ReturnType<AgentSocial['channelMessagesResolve']>;

  /** POST `/api/social/friends/request` — зеркало {@link AgentSocial.friendRequest}. */
  postMessengerFriendRequest: (
    body: Parameters<AgentSocial['friendRequest']>[0],
    httpOpts?: Parameters<AgentSocial['friendRequest']>[1]
  ) => ReturnType<AgentSocial['friendRequest']>;

  /** POST `/api/social/friends/remove` — зеркало {@link AgentSocial.friendsRemove}. */
  postMessengerFriendsRemove: (
    body: Parameters<AgentSocial['friendsRemove']>[0],
    httpOpts?: Parameters<AgentSocial['friendsRemove']>[1]
  ) => ReturnType<AgentSocial['friendsRemove']>;

  /** POST `/api/social/friends/block` — зеркало {@link AgentSocial.friendsBlock}. */
  postMessengerFriendsBlock: (
    body: Parameters<AgentSocial['friendsBlock']>[0],
    httpOpts?: Parameters<AgentSocial['friendsBlock']>[1]
  ) => ReturnType<AgentSocial['friendsBlock']>;
}

/** Alias for docs / IDE: “standard” integration surface. */
export type StandardSDKSurface = AgentStackPlatformSurface;

export interface SDKCapabilityEntry {
  id: string;
  enabled: boolean;
  layer: 'platform' | 'domain';
  /** Logical group for prompts (transport, identity, …) */
  group: string;
  description: string;
}

export interface SDKCapabilityTaskEntry {
  taskId: string;
  domain: string;
  comfortBudget: number;
  shells: Array<'dev' | 'user'>;
}

export interface SDKCapabilityMatrix {
  semantic: string;
  generation: string;
  /** Platform slice (sdk.platform) */
  platform: SDKCapabilityEntry[];
  /** Other constructor-initialized modules on AgentStackSDK */
  domain: SDKCapabilityEntry[];
  /** Comfort tasks metadata (`sdk.capability_tasks.gen1`) */
  tasks: SDKCapabilityTaskEntry[];
}

const PLATFORM_CAPABILITY_SEED: Omit<SDKCapabilityEntry, 'enabled'>[] = [
  { id: 'http', layer: 'platform', group: 'transport', description: 'HTTPClient' },
  { id: 'auth', layer: 'platform', group: 'identity', description: 'AgentAuth' },
  { id: 'authStateStore', layer: 'platform', group: 'identity', description: 'AuthStateStore' },
  { id: 'api', layer: 'platform', group: 'data', description: 'AgentAPI' },
  { id: 'dna', layer: 'platform', group: 'data', description: 'AgentDNA' },
  { id: 'projects', layer: 'platform', group: 'data', description: 'DNA table wrapper projects' },
  { id: 'users', layer: 'platform', group: 'data', description: 'DNA table wrapper users' },
  { id: 'protocol', layer: 'platform', group: 'ecosystem', description: 'AgentProtocol' },
  { id: 'command', layer: 'platform', group: 'ecosystem', description: 'AgentCommand Rules' },
  {
    id: 'proteinCommandChannel',
    layer: 'platform',
    group: 'ecosystem',
    description: 'ProteinCommandChannel',
  },
  { id: 'snapshots', layer: 'platform', group: 'cache', description: 'EntitySnapshotRepository' },
  { id: 'i18n', layer: 'platform', group: 'ux', description: 'AgentI18n' },
  { id: 'rbac', layer: 'platform', group: 'security', description: 'AgentRBAC' },
  { id: 'ecosystem', layer: 'platform', group: 'channels', description: 'AgentEcosystem' },
  { id: 'social', layer: 'platform', group: 'social', description: 'AgentSocial messenger/friends/PAS' },
  { id: 'support', layer: 'platform', group: 'social', description: 'AgentSupport `/api/support/*` inbox & threads' },
  { id: 'webPush', layer: 'platform', group: 'notifications', description: 'AgentWebPush VAPID subscribe' },
  {
    id: 'guidance',
    layer: 'platform',
    group: 'ecosystem',
    description: 'GuidancePlatformFacade — sdk.platform.guidance.forProject(id)',
  },
  {
    id: 'activity',
    layer: 'platform',
    group: 'lifecycle',
    description: 'Tab visibility coordinator — pausable polling and WS poke registry',
  },
  {
    id: 'messengerEmbed',
    layer: 'platform',
    group: 'social',
    description:
      'createMessengerEmbed + fetchMessengerThreadHistory / delta + channel-invites + public publish helpers; `MESSENGER_HOST_CONTRACT_VERSION`',
  },
  {
    id: 'economy',
    layer: 'platform',
    group: 'commerce',
    description: 'AgentEconomyFacade — tenant `/api/agentnet/{project_id}/*` (no admin routes)',
  },
  {
    id: 'adminData',
    layer: 'platform',
    group: 'admin',
    description: 'AgentAdminData — platform operator only (`/api/admin/data/*`)',
  },
];

const DOMAIN_CAPABILITY_SEED: Omit<SDKCapabilityEntry, 'enabled'>[] = [
  { id: 'neural', layer: 'domain', group: 'neural', description: 'AgentNeural' },
  { id: 'docs', layer: 'domain', group: 'content', description: 'AgentDocs' },
  { id: 'payments', layer: 'domain', group: 'commerce', description: 'AgentPayments' },
  {
    id: 'economy',
    layer: 'domain',
    group: 'commerce',
    description: 'AgentEconomyFacade — sdk.platform.economy / sdk.economy',
  },
  { id: 'analytics', layer: 'domain', group: 'commerce', description: 'AgentAnalytics' },
  { id: 'webhooks', layer: 'domain', group: 'integrations', description: 'AgentWebhooks' },
  {
    id: 'integrations',
    layer: 'domain',
    group: 'integrations',
    description: 'AgentIntegrations — recipes, connections, deliveries',
  },
  { id: 'scheduler', layer: 'domain', group: 'integrations', description: 'AgentScheduler' },
  { id: 'notifications', layer: 'domain', group: 'integrations', description: 'AgentNotifications' },
  { id: 'wallets', layer: 'domain', group: 'commerce', description: 'AgentWallets' },
  { id: 'invoices', layer: 'domain', group: 'commerce', description: 'AgentInvoices' },
  { id: 'billing', layer: 'domain', group: 'commerce', description: 'AgentBilling' },
  { id: 'logic', layer: 'domain', group: 'rules', description: 'AgentLogic' },
  { id: 'marketplace', layer: 'domain', group: 'commerce', description: 'AgentMarketplace' },
  {
    id: 'commerce.storefront',
    layer: 'domain',
    group: 'commerce',
    description: 'sdk.commerce.discovery.listOffers (legacy alias)',
  },
  {
    id: 'commerce.shop',
    layer: 'domain',
    group: 'commerce',
    description: 'sdk.commerce.discovery.getProduct PDP BFF',
  },
  {
    id: 'commerce.cart',
    layer: 'domain',
    group: 'commerce',
    description: 'sdk.commerce.cart',
  },
  {
    id: 'commerce.checkout',
    layer: 'domain',
    group: 'commerce',
    description: 'sdk.commerce.checkout',
  },
  {
    id: 'commerce.orders',
    layer: 'domain',
    group: 'commerce',
    description: 'sdk.commerce.orders',
  },
  { id: 'assets', layer: 'domain', group: 'media', description: 'AgentAssets' },
  { id: 'globalAssets', layer: 'domain', group: 'media', description: 'AgentGlobalAssets' },
  { id: 'buffs', layer: 'domain', group: 'game', description: 'AgentBuffs' },
  { id: 'protein', layer: 'domain', group: 'protein', description: 'AgentProtein high-level' },
  { id: 'proteinProcessor', layer: 'domain', group: 'protein', description: 'ProteinResponseProcessor' },
  { id: 'pageComposition', layer: 'domain', group: 'protein', description: 'PageCompositionSystem' },
  { id: 'gameData', layer: 'domain', group: 'protein', description: 'GameDataSystem' },
  { id: 'storage', layer: 'domain', group: 'media', description: 'AgentStorage' },
  { id: 'agentsFleet', layer: 'domain', group: 'agents', description: 'AgentsFleet' },
  {
    id: 'admin',
    layer: 'domain',
    group: 'admin',
    description: 'AgentAdmin — platform operator only (`/api/admin/*`, AgentNet ops)',
  },
];

function domainEnabled(
  id: string,
  gates?: Partial<Record<string, boolean>>
): boolean {
  if (!gates) return true;
  if (id === 'economy') {
    const economyGate = gates.economy ?? gates.agentcoin;
    if (economyGate === false) return false;
    return true;
  }
  const v = gates[id];
  if (v === undefined) return true;
  return v !== false;
}

/**
 * Build capability matrix. Platform slice is always enabled; domain entries use `gates` from `SDKConfig.modules`.
 */
export function buildCapabilityMatrix(
  semantic: string,
  generation: string,
  domainGates?: Partial<Record<string, boolean>>,
  audience?: SDKAudience,
): SDKCapabilityMatrix {
  const platformSeed = filterCapabilityEntriesForAudience(
    PLATFORM_CAPABILITY_SEED,
    audience,
  );
  const domainSeed = filterCapabilityEntriesForAudience(
    DOMAIN_CAPABILITY_SEED,
    audience,
  );
  return {
    semantic,
    generation,
    platform: platformSeed.map((e) => ({ ...e, enabled: true })),
    domain: domainSeed.map((e) => ({
      ...e,
      enabled: domainEnabled(e.id, domainGates),
    })),
    tasks: [...TASK_CATALOG_METADATA],
  };
}

/** Flat map for Compass / verify gates (`frontend.platform.capability_tasks.gen1`). */
export function flattenCapabilityMatrix(
  matrix: SDKCapabilityMatrix | undefined,
): Record<string, boolean | undefined> {
  if (!matrix) return {};
  const out: Record<string, boolean | undefined> = {};
  for (const entry of [...matrix.platform, ...matrix.domain]) {
    out[entry.id] = entry.enabled;
  }
  return out;
}
