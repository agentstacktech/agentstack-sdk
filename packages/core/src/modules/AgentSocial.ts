/**
 * AgentSocial — REST surface for messenger, friends, PAS (AgentSocial).
 *
 * Same routes as {@link AgentProtocol} social* helpers; use this module when you want
 * a dedicated import (`sdk.social`) in user apps. Protocol delegates here when configured.
 */

import { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';

/** Row in ``requests`` from GET ``/api/social/friends/requests/in``. */
export type SocialFriendRequestInRow = {
  from_user_id?: number;
  at?: string;
  request_id?: string;
  source?: Record<string, unknown>;
};

/** Row in ``requests`` from GET ``/api/social/friends/requests/out``. */
export type SocialFriendRequestOutRow = {
  to_user_id?: number;
  at?: string;
  request_id?: string;
  source?: Record<string, unknown>;
};

export class AgentSocial {
  constructor(private readonly client: HTTPClient) {}

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
    return this.client.get('/api/pas/social_public/me', { home_project_id: homeProjectId }, opts);
  }

  pasPutSocialPublicMe(
    body: {
      home_project_id: number;
      channels?: string[];
      chats?: string[];
      groups?: string[];
    },
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.client.put('/api/pas/social_public/me', body, opts);
  }

  expandEntities(
    homeProjectId: number,
    ids: string[],
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ entities: Record<string, Record<string, unknown>> }>> {
    return this.client.post(
      '/api/social/entities/expand',
      { home_project_id: homeProjectId, ids },
      opts
    );
  }

  chatHistory(
    params: {
      home_project_id?: number;
      channel_id: string;
      since_seq?: number;
      /**
       * Exclusive upper bound on ``seq``. Pass the ``next_cursor`` from a
       * prior response here to fetch the window **immediately older** than
       * what the client already has — async older-history pagination, gene
       * ``frontend.social.messenger.pagination.gen1``.
       */
      before_seq?: number;
      limit?: number;
    },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.get('/api/social/chat/history', params, opts);
  }

  /**
   * Merged DM thread from user-scoped outboxes (deterministic ``dm_hp*`` channel ids).
   */
  dmThread(
    params: {
      home_project_id?: number;
      channel_id: string;
      since_seq?: number;
      /**
       * Exclusive upper bound on ``seq`` — combine with ``limit`` to walk
       * older pages of the thread. See `chatHistory` for the contract.
       */
      before_seq?: number;
      /** Tail window size; enables ``has_more`` / ``next_cursor`` in response. */
      limit?: number;
    },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.get('/api/social/dm/thread', params, opts);
  }

  /**
   * Bundled chat index (+ reserved thread slots) for Local-First cold start.
   * @see GET /api/social/initial-snapshot
   */
  messengerInitialSnapshot(
    params?: { home_project_id?: number; limit_channels?: number; messages_per_channel?: number },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.get('/api/social/initial-snapshot', params ?? {}, opts);
  }

  /**
   * Unified delta endpoint (Phase A3). One round-trip answers the Local-First
   * SyncEngine's catch-up question across appended messages, patch log, read
   * receipts and — when CRDT is enabled — Yjs updates.
   *
   * Response shape:
   *  {
   *    channel_id, server_seq, server_hlc,
   *    messages_appended: [...],
   *    messages_patched:  [...],
   *    reactions:         [...],
   *    read_receipts:     {...} | null,
   *    y_updates:         [...],
   *    has_more?: boolean, next_cursor?: number
   *  }
   *
   * @see GET /api/social/delta
   */
  socialDelta(
    params: {
      home_project_id?: number;
      channel_id: string;
      since_seq?: number;
      /** Wire-HLC (base36) — reserved for Phase B CRDT y_update catch-up. */
      since_hlc?: string;
      /** Reaction-feed cursor (base36) — ``reactions[]`` strictly after this HLC. */
      since_reaction_hlc?: string;
      /** Comment-feed cursor (base36) — ``comments[]`` strictly after this HLC. */
      since_comment_hlc?: string;
      /** Tail window for ``messages_appended``; enables cursor fields in the response. */
      limit?: number;
    },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.get('/api/social/delta', params, opts);
  }

  /**
   * Apply one immutable reaction cell (server SoT). Same contract as
   * ``POST /api/social/chat/message/react``.
   */
  chatMessageReact(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
      emoji: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{
      status?: string;
      message_id?: string;
      channel_id?: string;
      emoji?: string;
      hlc?: string;
      current_emoji?: string;
    }>
  > {
    return this.client.post('/api/social/chat/message/react', payload, opts);
  }

  /**
   * Upsert one per-user comment cell on a message (server SoT).
   * @see POST /api/social/chat/message/comment
   */
  chatMessageComment(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
      text: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{
      status?: string;
      message_id?: string;
      channel_id?: string;
      text?: string;
      hlc?: string;
    }>
  > {
    return this.client.post('/api/social/chat/message/comment', payload, opts);
  }

  /**
   * Foreground surface beacon for messenger Web Push coalescing
   * (``POST /api/social/messenger/push-surface``).
   */
  messengerPushSurfacePost(
    payload: {
      home_project_id: number;
      channel_id: string;
      doc_visible: boolean;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.post('/api/social/messenger/push-surface', payload, opts);
  }

  /** Append a message to the current user's DM outbox (user DNA cell). */
  dmMessagePost(
    payload: {
      home_project_id?: number;
      channel_id: string;
      body: string;
      meta?: Record<string, unknown>;
      attachments?: Record<string, unknown>[];
      /** Client idempotency key; replays with the same value return the same stored row. */
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ message: Record<string, unknown> }>> {
    return this.client.post('/api/social/dm/message', payload, opts);
  }

  /**
   * Pure distributed public channel (ring in project or user DNA + `data_channels` row with `room_kind=pc_pure`).
   * Use **`POST /api/social/channel`** — not `channels/register`. For legacy registry-only rooms
   * (`open_chat`, surrogate ids) use {@link AgentSocial.channelsRegister} and legacy `chat/history`.
   */
  channelCreate(
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
    return this.client.post('/api/social/channel', body, opts);
  }

  channelPureGet(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ channel?: Record<string, unknown> }>> {
    const enc = encodeURIComponent(channelId);
    return this.client.get(
      `/api/social/channel/${enc}`,
      { home_project_id: homeProjectId },
      opts
    );
  }

  channelHistory(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2] & {
      /**
       * When true, ask the server to inline resolved message bodies on each ring card
       * (``cards[].body``, ``edited_at``) and flip ``bodies_included: true`` in the response.
       * Saves one RTT on cold open — the client does not need a follow-up
       * ``POST /channel/{id}/resolve-messages`` roundtrip. Defaults to ``false`` (legacy).
       */
      includeBodies?: boolean;
      /**
       * Trim the server ring to the most recent N cards. The client tail only needs
       * 1–1.5 screens; older pages are fetched on demand via ``startReached``.
       * When omitted, the server's default window is used.
       */
      limit?: number;
    }
  ): Promise<APIResponse<Record<string, unknown>>> {
    const enc = encodeURIComponent(channelId);
    const params: Record<string, unknown> = { home_project_id: homeProjectId };
    if (opts?.includeBodies) {
      params.include_bodies = 1;
    }
    if (typeof opts?.limit === 'number' && opts.limit > 0) {
      params.limit = Math.trunc(opts.limit);
    }
    const forwardOpts = opts
      ? (({ includeBodies: _ib, limit: _lim, ...rest }) => rest)(opts)
      : undefined;
    return this.client.get(`/api/social/channel/${enc}/history`, params, forwardOpts);
  }

  channelMessagePost(
    homeProjectId: number,
    channelId: string,
    payload: {
      body: string;
      attachments?: Record<string, unknown>[];
      reply_to?: string | null;
      /** Client idempotency key; replays return the same ring card. */
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const enc = encodeURIComponent(channelId);
    return this.client.post(
      `/api/social/channel/${enc}/message`,
      { home_project_id: homeProjectId, ...payload },
      opts
    );
  }

  channelMessagesResolve(
    homeProjectId: number,
    channelId: string,
    pairs: { author_id: number; msg_id: string }[],
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ messages?: unknown[] }>> {
    const enc = encodeURIComponent(channelId);
    return this.client.post(
      `/api/social/channel/${enc}/resolve-messages`,
      { home_project_id: homeProjectId, pairs },
      opts
    );
  }

  channelSubscribe(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const enc = encodeURIComponent(channelId);
    const q = `?home_project_id=${encodeURIComponent(String(homeProjectId))}`;
    return this.client.post(`/api/social/channel/${enc}/subscribe${q}`, {}, opts);
  }

  channelMessagePatch(
    homeProjectId: number,
    channelId: string,
    msgId: string,
    body: string,
    opts?: Parameters<HTTPClient['patch']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const encC = encodeURIComponent(channelId);
    const encM = encodeURIComponent(msgId);
    const q = `?home_project_id=${encodeURIComponent(String(homeProjectId))}`;
    return this.client.patch(
      `/api/social/channel/${encC}/message/${encM}${q}`,
      { body },
      opts
    );
  }

  channelMessageDelete(
    homeProjectId: number,
    channelId: string,
    msgId: string,
    opts?: Parameters<HTTPClient['delete']>[1]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const encC = encodeURIComponent(channelId);
    const encM = encodeURIComponent(msgId);
    const q = `?home_project_id=${encodeURIComponent(String(homeProjectId))}`;
    return executeOrNotFoundFallback(
      () => this.client.delete(`/api/social/channel/${encC}/message/${encM}${q}`, opts),
      {
        data: {},
        status: 204,
        statusText: 'No Content',
        headers: {}
      }
    );
  }

  chatPost(
    payload: {
      home_project_id?: number;
      channel_id: string;
      body: string;
      meta?: Record<string, unknown>;
      attachments?: Record<string, unknown>[];
      /** Client idempotency key; replays return the same stored message. */
      client_message_id?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ message: Record<string, unknown> }>> {
    return this.client.post('/api/social/chat/message', payload, opts);
  }

  chatReadGet(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ read: Record<string, unknown> }>> {
    return this.client.get(
      '/api/social/chat/read',
      { home_project_id: homeProjectId, channel_id: channelId },
      opts
    );
  }

  chatReadSet(
    payload: {
      home_project_id: number;
      channel_id: string;
      last_message_id?: string | null;
      last_seq?: number | null;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; read: Record<string, unknown> }>> {
    return this.client.post('/api/social/chat/read', payload, opts);
  }

  chatPin(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/chat/pin', payload, opts);
  }

  chatUnpin(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/chat/unpin', payload, opts);
  }

  chatMessageEdit(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
      body: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/chat/message/edit', payload, opts);
  }

  chatMessageDelete(
    payload: {
      home_project_id: number;
      channel_id: string;
      message_id: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/chat/message/delete', payload, opts);
  }

  chatIndexGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ entries?: unknown[]; etag?: string }>
  > {
    return this.client.get('/api/social/chat/index', undefined, opts);
  }

  chatIndexPut(
    body: { entries: unknown[] },
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<
    APIResponse<{ success?: boolean; etag?: string; entries?: unknown[] }>
  > {
    return this.client.put('/api/social/chat/index', body, opts);
  }

  chatIndexRemove(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ success?: boolean; etag?: string; entries?: unknown[] }>
  > {
    return this.client.post('/api/social/chat/index/remove', body, opts);
  }

  chatReadMap(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ reads?: Record<string, Record<string, unknown>> }>
  > {
    return this.client.get('/api/social/chat/read-map', undefined, opts);
  }

  messengerPrefsGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<unknown>> {
    return this.client.get('/api/social/messenger/prefs', undefined, opts);
  }

  /**
   * Partial messenger prefs (8DNA `agent_social.messenger_prefs`). Common keys include
   * `messenger_push_global_enabled`, `messenger_push_by_channel`, `messenger_os_push_despite_relay`,
   * `messenger_in_app_toast_enabled`, `messenger_in_app_sound_enabled`, `messenger_disclose_read_receipts`.
   */
  messengerPrefsPut(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.put('/api/social/messenger/prefs', body, opts);
  }

  settingsPrivacyGet(opts?: Parameters<HTTPClient['get']>[2]): Promise<APIResponse<unknown>> {
    return this.client.get('/api/social/settings/privacy', undefined, opts);
  }

  settingsPrivacyPut(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.put('/api/social/settings/privacy', body, opts);
  }

  friendsList(
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ friends: unknown[] }>> {
    return this.client.get('/api/social/friends', {}, opts);
  }

  friendsCards(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ cards?: unknown[] }>
  > {
    return this.client.get('/api/social/friends/cards', undefined, opts);
  }

  friendsUserIds(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ friend_user_ids?: number[] }>
  > {
    return this.client.get('/api/social/friends/user-ids', undefined, opts);
  }

  friendsRequestsIn(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{ requests?: SocialFriendRequestInRow[]; cards?: unknown[] }>
  > {
    return this.client.get('/api/social/friends/requests/in', params ?? {}, opts);
  }

  friendsRequestsOut(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{ requests?: SocialFriendRequestOutRow[]; cards?: unknown[] }>
  > {
    return this.client.get('/api/social/friends/requests/out', params ?? {}, opts);
  }

  followersList(
    params?: { expand?: string },
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.get('/api/social/followers', params ?? {}, opts);
  }

  friendRequest(
    payload: { to_user_id: number; source?: Record<string, unknown> },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ success: boolean; result?: string }>> {
    return this.client.post('/api/social/friends/request', payload, opts);
  }

  /**
   * Ensure a 1:1 DM channel with ``peer_user_id`` (subject to their ``dm_policy``).
   * 403 detail may be ``dm_policy_friends_only``, ``dm_policy_nobody``, etc.
   */
  dmEnsure(
    body: { peer_user_id: number; home_project_id?: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{
      home_project_id: number;
      channel_id: string;
      peer_user_id: number;
      created?: boolean;
      peer_display_name?: string | null;
    }>
  > {
    return this.client.post('/api/social/dm/ensure', body, opts);
  }

  friendsRequestRespond(
    body: {
      from_user_id: number;
      request_id: string;
      action: 'accept' | 'reject' | 'subscriber' | 'block';
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/friends/request/respond', body, opts);
  }

  friendsRemove(
    body: { user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/friends/remove', body, opts);
  }

  /** Block user (clears friendship and pending requests on both sides). */
  friendsBlock(
    body: { user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/friends/block', body, opts);
  }

  friendsCancel(
    body: { to_user_id: number },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/friends/cancel', body, opts);
  }

  usersLookup(
    body: { query: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ matches?: unknown[] }>> {
    return this.client.post('/api/social/users/lookup', body, opts);
  }

  usersPublicCards(
    body: { user_ids: number[]; expand?: 'profile_detail' | string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/users/public-cards', body, opts);
  }

  channelGet(
    homeProjectId: number,
    channelId: string,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<{ channel?: Record<string, unknown> }>> {
    const enc = encodeURIComponent(channelId);
    return this.client.get(`/api/social/channels/${homeProjectId}/${enc}`, undefined, opts);
  }

  channelsRegister(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ channel_id?: string }>> {
    return this.client.post('/api/social/channels/register', body, opts);
  }

  channelsUpdate(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/channels/update', body, opts);
  }

  channelsDelete(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/channels/delete', body, opts);
  }

  channelInvitesInbox(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ invites?: unknown[] }>
  > {
    return this.client.get('/api/social/channel-invites/inbox', undefined, opts);
  }

  channelInvitesAccept(
    body: { invite_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ home_project_id?: number; channel_id?: string; title?: string }>
  > {
    return this.client.post('/api/social/channel-invites/accept', body, opts);
  }

  channelInvitesDecline(
    body: { invite_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/channel-invites/decline', body, opts);
  }

  channelInvitesLinkToken(
    body: { home_project_id: number; channel_id: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<{ token?: string }>> {
    return this.client.post('/api/social/channel-invites/link-token', body, opts);
  }

  channelInvitesRedeem(
    body: { token: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<
    APIResponse<{ home_project_id?: number; channel_id?: string; title?: string }>
  > {
    return this.client.post('/api/social/channel-invites/redeem', body, opts);
  }

  presenceOnline(
    homeProjectId: number,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<
    APIResponse<{
      user_ids?: number[];
      /** Sum of active relay sockets in this project (may exceed unique users). */
      total_connections?: number;
    }>
  > {
    return this.client.get(
      '/api/social/presence/online',
      { home_project_id: homeProjectId },
      opts
    );
  }

  publicQuota(opts?: Parameters<HTTPClient['get']>[2]): Promise<
    APIResponse<{ quota: { max_channels: number; max_chats: number; max_groups: number } }>
  > {
    return this.client.get('/api/social/public/quota', undefined, opts);
  }

  publicMine(
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
    return this.client.get(
      '/api/social/public/me',
      { home_project_id: homeProjectId },
      opts
    );
  }

  publicIndex(
    params: Record<string, unknown>,
    opts?: Parameters<HTTPClient['get']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.client.get('/api/social/public/index', params, opts);
  }

  publicPublish(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/public/publish', body, opts);
  }

  publicUnpublish(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['post']>[2]
  ): Promise<APIResponse<unknown>> {
    return this.client.post('/api/social/public/unpublish', body, opts);
  }
}
