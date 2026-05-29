/**
 * AgentProtocol — unified facade over REST, protein command bus, Rules commands,
 * high-level protein, and the entity snapshot repository (framework-agnostic).
 *
 * @see docs/AGENT_PROTOCOL.md (repo root)
 */

import type { HTTPClient } from '../client/http-client';
import { assertPlatformOperatorSurface } from '../config/integratorScope';
import type { APIResponse } from '../types';
import type { AgentCommand } from '../modules/AgentCommand';
import type { AgentProtein } from '../modules/AgentProtein';
import type {
  ProteinBatchCommandRequest,
  ProteinCommandChannel,
  ProteinCommandExecuteRequest,
} from '../modules/ProteinCommandChannel';
import type {
  EntitySnapshotRepository,
  MergeStrategy,
  SnapshotEnvelope,
  SnapshotMeta,
} from '../cache/entity-snapshot-repository';
import type { ProteinRequest, ProteinResponse } from '../modules/AgentProtein';
import type { AgentDNA } from '../modules/AgentDNA';
import type {
  AgentSocial,
  SocialFriendRequestInRow,
  SocialFriendRequestOutRow,
} from '../modules/AgentSocial';
import type { AgentWebPush, PushHealthData, PushSubscriptionJSON } from '../modules/AgentWebPush';
import type { AgentEconomyFacade } from '../economy/AgentEconomyFacade';
import type {
  DNAEntity,
  DNAFilter,
  DNAQueryParams,
  DNAListResponse,
} from '../modules/AgentDNA';
import { SerialMutationQueue } from './command-queue';
import type { AgentFinanceFacade } from '../finance/AgentFinanceFacade';

export interface AgentProtocolDeps {
  http: HTTPClient;
  commands: ProteinCommandChannel;
  snapshots: EntitySnapshotRepository;
  /** Rules Engine — POST `/command` */
  rulesCommand?: AgentCommand;
  /** High-level protein — POST `/protein/execute` */
  protein?: AgentProtein;
  /** 8DNA REST — `/dna/*` (same as `sdk.dna`, exposed for one entry point). */
  dna?: AgentDNA;
  /** Messenger / friends / PAS — `/api/social/*`, `/api/pas/*` */
  social?: AgentSocial;
  /** Web Push VAPID subscription — `/api/push/*` */
  webPush?: AgentWebPush;
  /** AgentNet L0 + compute credits — `/api/agentnet/*` */
  economy?: AgentEconomyFacade;
  /** Finance hub — `/api/finance/*` (portfolio, project treasury, swap). */
  finance?: AgentFinanceFacade;
}

export interface AgentProtocolOptions {
  /**
   * Default `maxAgeMs` for {@link readThroughSnapshot} when the call omits it.
   * `undefined` means cache is used whenever present (no staleness check by time).
   */
  snapshotDefaultMaxAgeMs?: number;
}

export interface SearchSnapshotsOptions {
  /** Only snapshot keys starting with this prefix (e.g. `project-data:`). */
  keyPrefix?: string;
  /** Only flat paths starting with this dotted prefix. */
  pathPrefix?: string;
  predicate?: (path: string, value: unknown, snapshotKey: string) => boolean;
  /** Max matching rows returned (default 100). */
  maxResults?: number;
  /** Max snapshots scanned (default 50). */
  maxSnapshots?: number;
}

export type SnapshotSearchHit = {
  snapshotKey: string;
  path: string;
  value: unknown;
};

/**
 * Single entry for apps and automation: planes documented in AGENT_PROTOCOL.md.
 */
export class AgentProtocol {
  private readonly mutationQueue = new SerialMutationQueue();

  constructor(
    private readonly deps: AgentProtocolDeps,
    private readonly options: AgentProtocolOptions = {}
  ) {}

  // ---------------------------------------------------------------------------
  // Command plane — /commands/*
  // ---------------------------------------------------------------------------

  executeCommand<T = unknown>(request: ProteinCommandExecuteRequest): Promise<T> {
    return this.deps.commands.executeCommand<T>(request);
  }

  executeCommandsBatch<T = unknown>(request: ProteinBatchCommandRequest): Promise<T> {
    return this.deps.commands.executeBatchCommands<T>(request);
  }

  // ---------------------------------------------------------------------------
  // Rules plane — /command (optional)
  // ---------------------------------------------------------------------------

  /**
   * Rules Engine client command (`category.action`). Requires `rulesCommand` in deps.
   */
  async executeRulesCommand(
    command: string,
    data: Record<string, unknown> = {}
  ): ReturnType<AgentCommand['executeCommand']> {
    if (!this.deps.rulesCommand) {
      throw new Error('AgentProtocol: rulesCommand (AgentCommand) is not configured');
    }
    return this.deps.rulesCommand.executeCommand(command, data);
  }

  // ---------------------------------------------------------------------------
  // High-level protein — /protein/execute (optional)
  // ---------------------------------------------------------------------------

  async executeProteinRequest(request: ProteinRequest): Promise<ProteinResponse> {
    if (!this.deps.protein) {
      throw new Error('AgentProtocol: AgentProtein is not configured');
    }
    return this.deps.protein.executeProteinRequest(request);
  }

  // ---------------------------------------------------------------------------
  // REST plane (thin wrappers — batching for GET is HTTPClient policy)
  // Batching / preferBatch is configured on HTTPClient/RequestBatcher, not duplicated here.
  // ---------------------------------------------------------------------------

  restGet<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<T>> {
    return this.deps.http.get<T>(url, params, opts);
  }

  restPost<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<T>> {
    return this.deps.http.post<T>(url, body, opts);
  }

  restPut<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<T>> {
    return this.deps.http.put<T>(url, body, opts);
  }

  restPatch<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Parameters<HTTPClient['patch']>[2]
  ): Promise<APIResponse<T>> {
    return this.deps.http.patch<T>(url, body, opts);
  }

  restDelete<T = unknown>(
    url: string,
    opts?: Parameters<HTTPClient['delete']>[1]
  ): Promise<APIResponse<T>> {
    return this.deps.http.delete<T>(url, opts);
  }

  /** PAS: read current user's social public id lists for a home project. */
  pasGetSocialPublicMe(
    homeProjectId: number,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{
      home_project_id: number;
      user_id: number;
      slice: Record<string, string[]>;
    }>
  > {
    const s = this.deps.social;
    if (s) return s.pasGetSocialPublicMe(homeProjectId, opts);
    return this.deps.http.get('/api/pas/social_public/me', { home_project_id: homeProjectId }, opts);
  }

  /** PAS: replace provided kinds in the current user's public slice. */
  pasPutSocialPublicMe(
    body: {
      home_project_id: number;
      channels?: string[];
      chats?: string[];
      groups?: string[];
    },
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<{ success: boolean }>> {
    const s = this.deps.social;
    if (s) return s.pasPutSocialPublicMe(body, opts);
    return this.deps.http.put('/api/pas/social_public/me', body, opts);
  }

  /** Model A: batch-resolve channel/surrogate ids to metadata. */
  socialExpandEntities(
    homeProjectId: number,
    ids: string[],
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ entities: Record<string, Record<string, unknown>> }>> {
    const s = this.deps.social;
    if (s) return s.expandEntities(homeProjectId, ids, opts);
    return this.deps.http.post(
      '/api/social/entities/expand',
      { home_project_id: homeProjectId, ids },
      opts
    );
  }

  /**
   * Ecosystem-operator AgentSocial admin — POST `/api/admin/social/execute`.
   * Same actions as MCP `social.admin.*`; requires ecosystem owner on project 1.
   */
  socialAdminExecute(
    body: { action: string; params?: Record<string, unknown> },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    assertPlatformOperatorSurface(
      this.deps.http.getConfig(),
      'sdk.platform.protocol.socialAdminExecute',
    );
    return this.deps.http.post('/api/admin/social/execute', body, opts);
  }

  /**
   * Ecosystem-operator Agents Fleet admin — POST `/api/admin/agents/execute`.
   */
  agentsAdminExecute(
    body: { action: string; params?: Record<string, unknown> },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    assertPlatformOperatorSurface(
      this.deps.http.getConfig(),
      'sdk.platform.protocol.agentsAdminExecute',
    );
    return this.deps.http.post('/api/admin/agents/execute', body, opts);
  }

  /**
   * Messenger: merged chat history. Poll with `since_seq` for deltas (agent-friendly;
   * live UI uses stream relay). See docs/AGENT_SOCIAL_CONTRACTS.md.
   */
  socialChatHistory(
    params: {
      home_project_id?: number;
      channel_id: string;
      since_seq?: number;
    },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.chatHistory(params, opts);
    return this.deps.http.get('/api/social/chat/history', params, opts);
  }

  /** Post a channel message (ACL + DM policy same as REST). */
  socialChatPost(
    payload: {
      home_project_id?: number;
      channel_id: string;
      body: string;
      meta?: Record<string, unknown>;
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ message: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.chatPost(payload, opts);
    return this.deps.http.post('/api/social/chat/message', payload, opts);
  }

  /** DM merged thread (user-scoped outboxes; ``dm_hp*`` channel ids). */
  socialDmThread(
    params: { home_project_id?: number; channel_id: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.dmThread(params, opts);
    return this.deps.http.get('/api/social/dm/thread', params, opts);
  }

  /** Post to own DM outbox (user DNA cell). */
  socialDmMessagePost(
    payload: {
      home_project_id?: number;
      channel_id: string;
      body: string;
      meta?: Record<string, unknown>;
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ message: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.dmMessagePost(payload, opts);
    return this.deps.http.post('/api/social/dm/message', payload, opts);
  }

  /** Create pure distributed public channel (project or user DNA ring). */
  socialChannelCreate(
    body: {
      home_project_id?: number;
      owner_type: 'project' | 'user';
      title: string;
      description?: string;
      settings?: Record<string, unknown>;
      avatar_url?: string;
      visibility?: 'open' | 'private';
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ channel?: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.channelCreate(body, opts);
    return this.deps.http.post('/api/social/channel', body, opts);
  }

  socialChannelHistory(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.channelHistory(homeProjectId, channelId, opts);
    const enc = encodeURIComponent(channelId);
    return this.deps.http.get(
      `/api/social/channel/${enc}/history`,
      { home_project_id: homeProjectId },
      opts
    );
  }

  socialChannelMessagePost(
    homeProjectId: number,
    channelId: string,
    payload: {
      body: string;
      attachments?: Record<string, unknown>[];
      reply_to?: string | null;
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.channelMessagePost(homeProjectId, channelId, payload, opts);
    const enc = encodeURIComponent(channelId);
    return this.deps.http.post(
      `/api/social/channel/${enc}/message`,
      { home_project_id: homeProjectId, ...payload },
      opts
    );
  }

  socialChannelMessagesResolve(
    homeProjectId: number,
    channelId: string,
    pairs: { author_id: number; msg_id: string }[],
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ messages?: unknown[] }>> {
    const s = this.deps.social;
    if (s) return s.channelMessagesResolve(homeProjectId, channelId, pairs, opts);
    const enc = encodeURIComponent(channelId);
    return this.deps.http.post(
      `/api/social/channel/${enc}/resolve-messages`,
      { home_project_id: homeProjectId, pairs },
      opts
    );
  }

  socialChannelSubscribe(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.channelSubscribe(homeProjectId, channelId, opts);
    const enc = encodeURIComponent(channelId);
    const q = `?home_project_id=${encodeURIComponent(String(homeProjectId))}`;
    return this.deps.http.post(`/api/social/channel/${enc}/subscribe${q}`, {}, opts);
  }

  /** Last-read pointer for the current user and channel. */
  socialChatReadGet(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ read: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.chatReadGet(homeProjectId, channelId, opts);
    return this.deps.http.get(
      '/api/social/chat/read',
      { home_project_id: homeProjectId, channel_id: channelId },
      opts
    );
  }

  /** Persist read receipt / last-read for messenger UI. */
  socialChatReadSet(
    payload: {
      home_project_id: number;
      channel_id: string;
      last_message_id?: string | null;
      last_seq?: number | null;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; read: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.chatReadSet(payload, opts);
    return this.deps.http.post('/api/social/chat/read', payload, opts);
  }

  /** List friends (AgentSocial graph). */
  socialFriendsList(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ friends: unknown[] }>> {
    const s = this.deps.social;
    if (s) return s.friendsList(opts);
    return this.deps.http.get('/api/social/friends', {}, opts);
  }

  /** Send a friend request (optional `source` for public_channel context). */
  socialFriendRequest(
    payload: { to_user_id: number; source?: Record<string, unknown> },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; result?: string }>> {
    const s = this.deps.social;
    if (s) return s.friendRequest(payload, opts);
    return this.deps.http.post('/api/social/friends/request', payload, opts);
  }

  socialChatPin(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.chatPin(payload, opts);
    return this.deps.http.post('/api/social/chat/pin', payload, opts);
  }

  socialChatUnpin(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.chatUnpin(payload, opts);
    return this.deps.http.post('/api/social/chat/unpin', payload, opts);
  }

  socialChatMessageEdit(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
      body: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.chatMessageEdit(payload, opts);
    return this.deps.http.post('/api/social/chat/message/edit', payload, opts);
  }

  socialChatMessageDelete(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.chatMessageDelete(payload, opts);
    return this.deps.http.post('/api/social/chat/message/delete', payload, opts);
  }

  socialChatMessageReact(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
      emoji: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.chatMessageReact(payload, opts);
    return this.deps.http.post('/api/social/chat/message/react', payload, opts);
  }

  socialChatIndexGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ entries?: unknown[]; etag?: string }>
  > {
    const s = this.deps.social;
    if (s) return s.chatIndexGet(opts);
    return this.deps.http.get('/api/social/chat/index', undefined, opts);
  }

  socialChatIndexPut(
    body: { entries: unknown[] },
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<{ success?: boolean; etag?: string }>> {
    const s = this.deps.social;
    if (s) return s.chatIndexPut(body, opts);
    return this.deps.http.put('/api/social/chat/index', body, opts);
  }

  socialChatIndexRemove(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ success?: boolean; etag?: string; entries?: unknown[] }>
  > {
    const s = this.deps.social;
    if (s) return s.chatIndexRemove(body, opts);
    return this.deps.http.post('/api/social/chat/index/remove', body, opts);
  }

  socialChatReadMap(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ reads?: Record<string, Record<string, unknown>> }>
  > {
    const s = this.deps.social;
    if (s) return s.chatReadMap(opts);
    return this.deps.http.get('/api/social/chat/read-map', undefined, opts);
  }

  socialMessengerPrefsGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.messengerPrefsGet(opts);
    return this.deps.http.get('/api/social/messenger/prefs', undefined, opts);
  }

  socialMessengerPrefsPut(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.messengerPrefsPut(body, opts);
    return this.deps.http.put('/api/social/messenger/prefs', body, opts);
  }

  socialSettingsPrivacyGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.settingsPrivacyGet(opts);
    return this.deps.http.get('/api/social/settings/privacy', undefined, opts);
  }

  socialSettingsPrivacyPut(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.settingsPrivacyPut(body, opts);
    return this.deps.http.put('/api/social/settings/privacy', body, opts);
  }

  socialFriendsCards(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ cards?: unknown[] }>
  > {
    const s = this.deps.social;
    if (s) return s.friendsCards(opts);
    return this.deps.http.get('/api/social/friends/cards', undefined, opts);
  }

  socialFriendsUserIds(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ friend_user_ids?: number[] }>
  > {
    const s = this.deps.social;
    if (s) return s.friendsUserIds(opts);
    return this.deps.http.get('/api/social/friends/user-ids', undefined, opts);
  }

  socialFriendsRequestsIn(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{ requests?: SocialFriendRequestInRow[]; cards?: unknown[] }>
  > {
    const s = this.deps.social;
    if (s) return s.friendsRequestsIn(params, opts);
    return this.deps.http.get('/api/social/friends/requests/in', params ?? {}, opts);
  }

  socialFriendsRequestsOut(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{ requests?: SocialFriendRequestOutRow[]; cards?: unknown[] }>
  > {
    const s = this.deps.social;
    if (s) return s.friendsRequestsOut(params, opts);
    return this.deps.http.get('/api/social/friends/requests/out', params ?? {}, opts);
  }

  socialFollowersList(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.followersList(params, opts);
    return this.deps.http.get('/api/social/followers', params ?? {}, opts);
  }

  socialFriendsRequestRespond(
    body: {
      from_user_id: number;
      request_id: string;
      action: 'accept' | 'reject' | 'subscriber' | 'block';
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.friendsRequestRespond(body, opts);
    return this.deps.http.post('/api/social/friends/request/respond', body, opts);
  }

  socialFriendsRemove(
    body: { user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.friendsRemove(body, opts);
    return this.deps.http.post('/api/social/friends/remove', body, opts);
  }

  socialFriendsBlock(
    body: { user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.friendsBlock(body, opts);
    return this.deps.http.post('/api/social/friends/block', body, opts);
  }

  socialFriendsCancel(
    body: { to_user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.friendsCancel(body, opts);
    return this.deps.http.post('/api/social/friends/cancel', body, opts);
  }

  socialUsersLookup(
    body: { query: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ matches?: unknown[] }>> {
    const s = this.deps.social;
    if (s) return s.usersLookup(body, opts);
    return this.deps.http.post('/api/social/users/lookup', body, opts);
  }

  socialUsersPublicCards(
    body: { user_ids: number[] },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.usersPublicCards(body, opts);
    return this.deps.http.post('/api/social/users/public-cards', body, opts);
  }

  socialChannelGet(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ channel?: Record<string, unknown> }>> {
    const s = this.deps.social;
    if (s) return s.channelGet(homeProjectId, channelId, opts);
    const enc = encodeURIComponent(channelId);
    return this.deps.http.get(`/api/social/channels/${homeProjectId}/${enc}`, undefined, opts);
  }

  socialChannelsRegister(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ channel_id?: string }>> {
    const s = this.deps.social;
    if (s) return s.channelsRegister(body, opts);
    return this.deps.http.post('/api/social/channels/register', body, opts);
  }

  socialChannelsUpdate(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.channelsUpdate(body, opts);
    return this.deps.http.post('/api/social/channels/update', body, opts);
  }

  socialChannelsDelete(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.channelsDelete(body, opts);
    return this.deps.http.post('/api/social/channels/delete', body, opts);
  }

  socialChannelInvitesInbox(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ invites?: unknown[] }>
  > {
    const s = this.deps.social;
    if (s) return s.channelInvitesInbox(opts);
    return this.deps.http.get('/api/social/channel-invites/inbox', undefined, opts);
  }

  socialChannelInvitesAccept(
    body: { invite_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ home_project_id?: number; channel_id?: string; title?: string }>
  > {
    const s = this.deps.social;
    if (s) return s.channelInvitesAccept(body, opts);
    return this.deps.http.post('/api/social/channel-invites/accept', body, opts);
  }

  socialChannelInvitesDecline(
    body: { invite_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.channelInvitesDecline(body, opts);
    return this.deps.http.post('/api/social/channel-invites/decline', body, opts);
  }

  socialChannelInvitesLinkToken(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ token?: string }>> {
    const s = this.deps.social;
    if (s) return s.channelInvitesLinkToken(body, opts);
    return this.deps.http.post('/api/social/channel-invites/link-token', body, opts);
  }

  socialChannelInvitesRedeem(
    body: { token: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ home_project_id?: number; channel_id?: string; title?: string }>
  > {
    const s = this.deps.social;
    if (s) return s.channelInvitesRedeem(body, opts);
    return this.deps.http.post('/api/social/channel-invites/redeem', body, opts);
  }

  socialPresenceOnline(
    homeProjectId: number,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{ user_ids?: number[]; total_connections?: number }>
  > {
    const s = this.deps.social;
    if (s) return s.presenceOnline(homeProjectId, opts);
    return this.deps.http.get(
      '/api/social/presence/online',
      { home_project_id: homeProjectId },
      opts
    );
  }

  socialPublicQuota(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ quota: { max_channels: number; max_chats: number; max_groups: number } }>
  > {
    const s = this.deps.social;
    if (s) return s.publicQuota(opts);
    return this.deps.http.get('/api/social/public/quota', undefined, opts);
  }

  socialPublicMine(
    homeProjectId = 1,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{
      public_maps: {
        channels: Record<string, string[]>;
        chats: Record<string, string[]>;
        groups: Record<string, string[]>;
      };
    }>
  > {
    const s = this.deps.social;
    if (s) return s.publicMine(homeProjectId, opts);
    return this.deps.http.get(
      '/api/social/public/me',
      { home_project_id: homeProjectId },
      opts
    );
  }

  socialPublicIndex(
    params: Record<string, unknown>,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const s = this.deps.social;
    if (s) return s.publicIndex(params, opts);
    return this.deps.http.get('/api/social/public/index', params, opts);
  }

  socialPublicPublish(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.publicPublish(body, opts);
    return this.deps.http.post('/api/social/public/publish', body, opts);
  }

  socialPublicUnpublish(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    const s = this.deps.social;
    if (s) return s.publicUnpublish(body, opts);
    return this.deps.http.post('/api/social/public/unpublish', body, opts);
  }

  /** Web Push: VAPID public key for `PushManager.subscribe`. */
  webPushGetVapidPublicKey(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ publicKey: string | null; configured?: boolean }>> {
    return this.requireWebPush().getVapidPublicKey(opts);
  }

  /** Web Push: global server readiness (authenticated). */
  webPushGetDeliveryStatus(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{
      publicKeyConfigured: boolean;
      signingConfigured: boolean;
      pywebpushAvailable: boolean;
      canDeliver: boolean;
      messengerOsPushNote?: string;
    }>
  > {
    return this.requireWebPush().getDeliveryStatus(opts);
  }

  /** Web Push: per-user health + worker counters (authenticated). */
  webPushGetPushHealth(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<PushHealthData>> {
    return this.requireWebPush().getPushHealth(opts);
  }

  /** Web Push: register browser subscription (authenticated). */
  webPushRegisterSubscription(
    body: { subscription: PushSubscriptionJSON; user_agent?: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.requireWebPush().registerSubscription(body, opts);
  }

  /** Web Push: remove subscription by endpoint. */
  webPushUnregisterSubscription(
    endpoint: string,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; removed: boolean }>> {
    return this.requireWebPush().unregisterSubscription(endpoint, opts);
  }

  private requireWebPush(): AgentWebPush {
    if (!this.deps.webPush) {
      throw new Error('AgentProtocol: AgentWebPush is not configured');
    }
    return this.deps.webPush;
  }

  // ---------------------------------------------------------------------------
  // 8DNA plane — /dna/* (optional; delegates to AgentDNA)
  // ---------------------------------------------------------------------------

  private requireDna(): AgentDNA {
    if (!this.deps.dna) {
      throw new Error('AgentProtocol: AgentDNA is not configured');
    }
    return this.deps.dna;
  }

  dnaList<T = unknown>(
    table: string,
    params?: DNAQueryParams
  ): Promise<DNAListResponse<T>> {
    return this.requireDna().list<T>(table, params);
  }

  dnaGet<T = unknown>(table: string, uuid: string): Promise<DNAEntity<T>> {
    return this.requireDna().get<T>(table, uuid);
  }

  dnaCreate<T = unknown>(
    table: string,
    entity: Partial<DNAEntity<T>>
  ): Promise<DNAEntity<T>> {
    return this.requireDna().create<T>(table, entity);
  }

  dnaUpdate<T = unknown>(
    table: string,
    uuid: string,
    updates: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>
  ): Promise<DNAEntity<T>> {
    return this.requireDna().update<T>(table, uuid, updates);
  }

  dnaPatch<T = unknown>(
    table: string,
    uuid: string,
    patches: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>
  ): Promise<DNAEntity<T>> {
    return this.requireDna().patch<T>(table, uuid, patches);
  }

  dnaDelete(
    table: string,
    uuid: string
  ): Promise<{ success: boolean; message: string }> {
    return this.requireDna().delete(table, uuid);
  }

  dnaQuery<T = unknown>(table: string, filter: DNAFilter): Promise<DNAListResponse<T>> {
    return this.requireDna().query<T>(table, filter);
  }

  // ---------------------------------------------------------------------------
  // Snapshot plane
  // ---------------------------------------------------------------------------

  getSnapshot<T = unknown>(key: string): SnapshotEnvelope<T> | undefined {
    return this.deps.snapshots.getSnapshot<T>(key);
  }

  setSnapshot<T>(key: string, data: T, meta: SnapshotMeta): void {
    this.deps.snapshots.setSnapshot(key, data, meta);
  }

  hasSnapshot(key: string): boolean {
    return this.deps.snapshots.has(key);
  }

  mergeSnapshot(
    key: string,
    partial: unknown,
    strategy: MergeStrategy,
    mergeMaxDepth?: number
  ): SnapshotEnvelope | undefined {
    return this.deps.snapshots.mergeSnapshot(key, partial, strategy, mergeMaxDepth);
  }

  invalidateSnapshot(key: string): boolean {
    return this.deps.snapshots.invalidate(key);
  }

  invalidateSnapshotPrefix(prefix: string): number {
    return this.deps.snapshots.invalidatePrefix(prefix);
  }

  /**
   * Return cached data if present and fresh enough; otherwise `loader()` then store.
   */
  async readThroughSnapshot<T>(
    key: string,
    loader: () => Promise<{ data: T; meta: SnapshotMeta }>,
    opts?: { maxAgeMs?: number }
  ): Promise<T> {
    const maxAge = opts?.maxAgeMs ?? this.options.snapshotDefaultMaxAgeMs;
    const existing = this.deps.snapshots.getSnapshot<T>(key);
    if (existing) {
      if (maxAge === undefined || Date.now() - existing.meta.fetchedAt <= maxAge) {
        return existing.data;
      }
    }
    const loaded = await loader();
    this.deps.snapshots.setSnapshot(key, loaded.data, loaded.meta);
    return loaded.data;
  }

  readPath(snapshotKey: string, dottedPath: string): unknown {
    return this.deps.snapshots.getAtPath(snapshotKey, dottedPath);
  }

  getOrBuildPathIndex(snapshotKey: string): Record<string, unknown> | undefined {
    return this.deps.snapshots.getOrBuildPathIndex(snapshotKey);
  }

  listSnapshotKeys(): string[] {
    return this.deps.snapshots.listSnapshotKeys();
  }

  /**
   * Search cached snapshots only: walks flat path maps (bounded).
   * Not full-text search across the network.
   */
  searchSnapshots(options: SearchSnapshotsOptions = {}): SnapshotSearchHit[] {
    const maxResults = options.maxResults ?? 100;
    const maxSnapshots = options.maxSnapshots ?? 50;
    const out: SnapshotSearchHit[] = [];
    let scanned = 0;
    for (const snapshotKey of this.deps.snapshots.listSnapshotKeys()) {
      if (scanned >= maxSnapshots) break;
      if (options.keyPrefix && !snapshotKey.startsWith(options.keyPrefix)) {
        continue;
      }
      scanned++;
      const idx = this.deps.snapshots.getOrBuildPathIndex(snapshotKey);
      if (!idx) continue;
      for (const path of Object.keys(idx)) {
        if (options.pathPrefix && !path.startsWith(options.pathPrefix)) {
          continue;
        }
        const value = idx[path];
        if (options.predicate && !options.predicate(path, value, snapshotKey)) {
          continue;
        }
        out.push({ snapshotKey, path, value });
        if (out.length >= maxResults) {
          return out;
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Mutation queue (client-side coalescing)
  // ---------------------------------------------------------------------------

  /**
   * Run a mutation after prior enqueued mutations finish (same tab / process).
   */
  runMutation<T>(fn: () => Promise<T>): Promise<T> {
    return this.mutationQueue.enqueue(fn);
  }

  // ---------------------------------------------------------------------------
  // Economy — `/api/agentnet/*` (optional dep)
  // ---------------------------------------------------------------------------

  private requireEconomy(): AgentEconomyFacade {
    if (!this.deps.economy) {
      throw new Error('AgentProtocol: economy dep missing — use sdk.platform.economy');
    }
    return this.deps.economy;
  }

  economyGetBalance(
    projectId: number,
    accountKey: string,
    assetCode = 'AGNT',
  ) {
    return this.requireEconomy().ledger.getBalance(projectId, { accountKey, assetCode });
  }

  economyQuoteComputeCredits(
    projectId: number,
    body: { buyer_user_id: number; credits_atomic: number; demo_intent_id?: string },
  ) {
    return this.requireEconomy().credits.quote(projectId, body);
  }

  economyPurchaseComputeCredits(
    projectId: number,
    body: {
      buyer_user_id: number;
      credits_atomic: number;
      idempotency_key: string;
      quote_id: string;
      quote_hash?: string;
      include_proof?: boolean;
    },
  ) {
    return this.requireEconomy().credits.purchase(projectId, body);
  }
}

export function createAgentProtocol(
  deps: AgentProtocolDeps,
  options?: AgentProtocolOptions
): AgentProtocol {
  return new AgentProtocol(deps, options);
}
