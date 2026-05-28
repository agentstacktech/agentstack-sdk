/**
 * Messenger SDK facade (Phase F1).
 *
 * Unified, channel-oriented API for third-party apps and widgets:
 *
 *   ```ts
 *   const channel = sdk.messenger.channel({ homeProjectId, channelId });
 *   const unsub = channel.messages.live((msgs) => render(msgs));
 *   await channel.send({ body: 'hello' });
 *   await channel.edit(messageId, { body: 'hi*' });
 *   await channel.react(messageId, { emoji: '🔥' });
 *   channel.presence.setTyping(true);
 *   ```
 *
 * Backends:
 *   - **Same-origin, SharedWorker available** → `WorkerBridge` transport
 *     (preferred; same surface that the main app uses, so no duplicate WS
 *     and IDB writes).
 *   - **Cross-origin / widget** → `RestPollTransport` (long-poll on
 *     `GET /api/social/delta` every `pollIntervalMs`).
 *
 * The transport is selected by `messengerTransport.autoSelect(ctx)` based on
 * the runtime environment; callers can override with {@link makeMessenger} options
 * (`transport`, `pollIntervalMs`) or the object form `{ http, clientConfig }`.
 *
 * Genetic tag: `sdk.messenger.facade.gen1`.
 */

import { HTTPClient } from '../client/http-client';
import { sortMessengerMessagesForLive } from '../messenger/timelineOrdering';
import type { APIResponse } from '../types';
import { AgentSocial } from './AgentSocial';

/** DM vs shared-channel contour for {@link messengerFetchThreadHistory}. */
export type MessengerThreadHistoryContour = 'dm' | 'shared';

/**
 * Single transport entry-point for merged thread history GETs (widgets / MCP should not
 * duplicate ``/api/social/dm/thread`` vs ``/api/social/chat/history`` assembly).
 */
export async function messengerFetchThreadHistory(
  social: AgentSocial,
  opts: {
    homeProjectId: number;
    channelId: string;
    contour: MessengerThreadHistoryContour;
    since_seq?: number;
    before_seq?: number;
    limit?: number;
    signal?: AbortSignal;
    /**
     * Merged into the HTTP options passed to ``dmThread`` / ``chatHistory`` (e.g. prefetch
     * ``skipCache``, ``timeout``). ``signal`` from ``opts`` wins over any signal here.
     */
    httpOpts?: Omit<NonNullable<Parameters<AgentSocial['dmThread']>[1]>, 'signal'>;
  }
): Promise<APIResponse<Record<string, unknown>>> {
  const params = {
    home_project_id: opts.homeProjectId,
    channel_id: opts.channelId,
    since_seq: opts.since_seq,
    before_seq: opts.before_seq,
    limit: opts.limit,
  };
  const mergedHttp =
    opts.signal != null || opts.httpOpts != null
      ? { ...(opts.httpOpts ?? {}), ...(opts.signal != null ? { signal: opts.signal } : {}) }
      : undefined;
  return opts.contour === 'dm'
    ? social.dmThread(params, mergedHttp)
    : social.chatHistory(params, mergedHttp);
}

/** Second argument of {@link messengerFetchThreadHistory} (exported for `sdk.platform` typing). */
export type MessengerFetchThreadHistoryParams = Parameters<typeof messengerFetchThreadHistory>[1];

/**
 * GET `/api/social/delta` — один вызов для догона Local-First (сообщения, патчи, реакции, read, y_updates).
 * Интеграторам и MCP не нужно дублировать query-сборку: тот же контракт, что {@link AgentSocial.socialDelta}.
 *
 * Телеметрия `delta.events_on_reconnect` остаётся в `@agentstack/messenger/lib/messengerSocialDeltaFetch`
 * (`fetchMessengerSocialDelta`), который вызывает эту функцию и эмитит beacon.
 */
export type MessengerSocialDeltaParams = Parameters<AgentSocial['socialDelta']>[0];
export type MessengerSocialDeltaHttpOpts = Parameters<AgentSocial['socialDelta']>[1];

/**
 * Минимальный контракт для GET `/api/social/delta` (виджеты, тесты, `AgentSocial`).
 * Умышленно слабее, чем `Pick<AgentSocial, 'socialDelta'>`, чтобы моки могли вернуть только `{ data }`.
 */
export interface MessengerSocialDeltaSource {
  socialDelta(
    params: MessengerSocialDeltaParams,
    httpOpts?: MessengerSocialDeltaHttpOpts
  ): Promise<{ data?: Record<string, unknown> }>;
}

export async function messengerFetchSocialDelta(
  social: MessengerSocialDeltaSource,
  params: MessengerSocialDeltaParams,
  httpOpts?: MessengerSocialDeltaHttpOpts
): Promise<Record<string, unknown>> {
  const res = await social.socialDelta(params, httpOpts);
  return (res.data ?? {}) as Record<string, unknown>;
}

/** Второй аргумент {@link messengerFetchSocialDelta} (для типизации `sdk.platform`). */
export type MessengerFetchSocialDeltaParams = MessengerSocialDeltaParams;

// ─────────────────────────────────────────────────────────────────────────────
// Channel invites + public directory (same REST as AgentSocial; narrow facade)
// ─────────────────────────────────────────────────────────────────────────────

export type MessengerChannelInvitesInboxHttpOpts = Parameters<
  AgentSocial['channelInvitesInbox']
>[0];

export type MessengerChannelInvitesAcceptBody = Parameters<AgentSocial['channelInvitesAccept']>[0];
export type MessengerChannelInvitesAcceptHttpOpts = Parameters<AgentSocial['channelInvitesAccept']>[1];

export type MessengerChannelInvitesDeclineBody = Parameters<AgentSocial['channelInvitesDecline']>[0];
export type MessengerChannelInvitesDeclineHttpOpts = Parameters<
  AgentSocial['channelInvitesDecline']
>[1];

export type MessengerChannelInvitesLinkTokenBody = Parameters<
  AgentSocial['channelInvitesLinkToken']
>[0];
export type MessengerChannelInvitesLinkTokenHttpOpts = Parameters<
  AgentSocial['channelInvitesLinkToken']
>[1];

export type MessengerChannelInvitesRedeemBody = Parameters<AgentSocial['channelInvitesRedeem']>[0];
export type MessengerChannelInvitesRedeemHttpOpts = Parameters<
  AgentSocial['channelInvitesRedeem']
>[1];

export type MessengerPublicPublishBody = Parameters<AgentSocial['publicPublish']>[0];
export type MessengerPublicPublishHttpOpts = Parameters<AgentSocial['publicPublish']>[1];

export type MessengerPublicUnpublishBody = Parameters<AgentSocial['publicUnpublish']>[0];
export type MessengerPublicUnpublishHttpOpts = Parameters<AgentSocial['publicUnpublish']>[1];

export async function messengerChannelInvitesInbox(
  social: Pick<AgentSocial, 'channelInvitesInbox'>,
  httpOpts?: MessengerChannelInvitesInboxHttpOpts
) {
  return social.channelInvitesInbox(httpOpts);
}

export async function messengerChannelInvitesAccept(
  social: Pick<AgentSocial, 'channelInvitesAccept'>,
  body: MessengerChannelInvitesAcceptBody,
  httpOpts?: MessengerChannelInvitesAcceptHttpOpts
) {
  return social.channelInvitesAccept(body, httpOpts);
}

export async function messengerChannelInvitesDecline(
  social: Pick<AgentSocial, 'channelInvitesDecline'>,
  body: MessengerChannelInvitesDeclineBody,
  httpOpts?: MessengerChannelInvitesDeclineHttpOpts
) {
  return social.channelInvitesDecline(body, httpOpts);
}

export async function messengerChannelInvitesLinkToken(
  social: Pick<AgentSocial, 'channelInvitesLinkToken'>,
  body: MessengerChannelInvitesLinkTokenBody,
  httpOpts?: MessengerChannelInvitesLinkTokenHttpOpts
) {
  return social.channelInvitesLinkToken(body, httpOpts);
}

export async function messengerChannelInvitesRedeem(
  social: Pick<AgentSocial, 'channelInvitesRedeem'>,
  body: MessengerChannelInvitesRedeemBody,
  httpOpts?: MessengerChannelInvitesRedeemHttpOpts
) {
  return social.channelInvitesRedeem(body, httpOpts);
}

export async function messengerPublicPublish(
  social: Pick<AgentSocial, 'publicPublish'>,
  body: MessengerPublicPublishBody,
  httpOpts?: MessengerPublicPublishHttpOpts
) {
  return social.publicPublish(body, httpOpts);
}

export async function messengerPublicUnpublish(
  social: Pick<AgentSocial, 'publicUnpublish'>,
  body: MessengerPublicUnpublishBody,
  httpOpts?: MessengerPublicUnpublishHttpOpts
) {
  return social.publicUnpublish(body, httpOpts);
}

// ─────────────────────────────────────────────────────────────────────────────
// MessengerPage-sized REST (SPA + MCP; delegates AgentSocial — Wave W)
// ─────────────────────────────────────────────────────────────────────────────

/** POST `/api/social/chat/message/comment` — делегат {@link AgentSocial.chatMessageComment}. */
export async function messengerChatMessageComment(
  social: Pick<AgentSocial, 'chatMessageComment'>,
  body: Parameters<AgentSocial['chatMessageComment']>[0],
  httpOpts?: Parameters<AgentSocial['chatMessageComment']>[1]
) {
  return social.chatMessageComment(body, httpOpts);
}

/** POST `/api/social/chat/message/react` — делегат {@link AgentSocial.chatMessageReact}. */
export async function messengerChatMessageReact(
  social: Pick<AgentSocial, 'chatMessageReact'>,
  body: Parameters<AgentSocial['chatMessageReact']>[0],
  httpOpts?: Parameters<AgentSocial['chatMessageReact']>[1]
) {
  return social.chatMessageReact(body, httpOpts);
}

/** POST `/api/social/messenger/push-surface` — делегат {@link AgentSocial.messengerPushSurfacePost}. */
export async function messengerPushSurfacePost(
  social: Pick<AgentSocial, 'messengerPushSurfacePost'>,
  body: Parameters<AgentSocial['messengerPushSurfacePost']>[0],
  httpOpts?: Parameters<AgentSocial['messengerPushSurfacePost']>[1]
) {
  return social.messengerPushSurfacePost(body, httpOpts);
}

/** POST `/api/social/chat/read` — делегат {@link AgentSocial.chatReadSet}. */
export async function messengerChatReadSet(
  social: Pick<AgentSocial, 'chatReadSet'>,
  body: Parameters<AgentSocial['chatReadSet']>[0],
  httpOpts?: Parameters<AgentSocial['chatReadSet']>[1]
) {
  return social.chatReadSet(body, httpOpts);
}

export async function messengerSettingsPrivacyGet(
  social: Pick<AgentSocial, 'settingsPrivacyGet'>,
  httpOpts?: Parameters<AgentSocial['settingsPrivacyGet']>[0]
) {
  return social.settingsPrivacyGet(httpOpts);
}

export async function messengerSettingsPrivacyPut(
  social: Pick<AgentSocial, 'settingsPrivacyPut'>,
  body: Parameters<AgentSocial['settingsPrivacyPut']>[0],
  httpOpts?: Parameters<AgentSocial['settingsPrivacyPut']>[1]
) {
  return social.settingsPrivacyPut(body, httpOpts);
}

export async function messengerPrefsGet(
  social: Pick<AgentSocial, 'messengerPrefsGet'>,
  httpOpts?: Parameters<AgentSocial['messengerPrefsGet']>[0]
) {
  return social.messengerPrefsGet(httpOpts);
}

export async function messengerPrefsPut(
  social: Pick<AgentSocial, 'messengerPrefsPut'>,
  body: Parameters<AgentSocial['messengerPrefsPut']>[0],
  httpOpts?: Parameters<AgentSocial['messengerPrefsPut']>[1]
) {
  return social.messengerPrefsPut(body, httpOpts);
}

/** GET `/api/social/chat/read-map` — делегат {@link AgentSocial.chatReadMap}. */
export async function messengerChatReadMap(
  social: Pick<AgentSocial, 'chatReadMap'>,
  httpOpts?: Parameters<AgentSocial['chatReadMap']>[0]
) {
  return social.chatReadMap(httpOpts);
}

export async function messengerChatIndexGet(
  social: Pick<AgentSocial, 'chatIndexGet'>,
  httpOpts?: Parameters<AgentSocial['chatIndexGet']>[0]
) {
  return social.chatIndexGet(httpOpts);
}

export async function messengerChatIndexPut(
  social: Pick<AgentSocial, 'chatIndexPut'>,
  body: Parameters<AgentSocial['chatIndexPut']>[0],
  httpOpts?: Parameters<AgentSocial['chatIndexPut']>[1]
) {
  return social.chatIndexPut(body, httpOpts);
}

export async function messengerChatIndexRemove(
  social: Pick<AgentSocial, 'chatIndexRemove'>,
  body: Parameters<AgentSocial['chatIndexRemove']>[0],
  httpOpts?: Parameters<AgentSocial['chatIndexRemove']>[1]
) {
  return social.chatIndexRemove(body, httpOpts);
}

export async function messengerFriendsRequestsOut(
  social: Pick<AgentSocial, 'friendsRequestsOut'>,
  params?: Parameters<AgentSocial['friendsRequestsOut']>[0],
  httpOpts?: Parameters<AgentSocial['friendsRequestsOut']>[1]
) {
  return social.friendsRequestsOut(params, httpOpts);
}

/** GET `/api/social/friends/user-ids` — делегат {@link AgentSocial.friendsUserIds}. */
export async function messengerFriendsUserIds(
  social: Pick<AgentSocial, 'friendsUserIds'>,
  httpOpts?: Parameters<AgentSocial['friendsUserIds']>[0]
) {
  return social.friendsUserIds(httpOpts);
}

/** GET `/api/social/friends/cards` — делегат {@link AgentSocial.friendsCards}. */
export async function messengerFriendsCards(
  social: Pick<AgentSocial, 'friendsCards'>,
  httpOpts?: Parameters<AgentSocial['friendsCards']>[0]
) {
  return social.friendsCards(httpOpts);
}

export async function messengerChannelGet(
  social: Pick<AgentSocial, 'channelGet'>,
  homeProjectId: number,
  channelId: string,
  httpOpts?: Parameters<AgentSocial['channelGet']>[2]
) {
  return social.channelGet(homeProjectId, channelId, httpOpts);
}

export async function messengerPublicQuota(
  social: Pick<AgentSocial, 'publicQuota'>,
  httpOpts?: Parameters<AgentSocial['publicQuota']>[0]
) {
  return social.publicQuota(httpOpts);
}

export async function messengerPublicMine(
  social: Pick<AgentSocial, 'publicMine'>,
  homeProjectId?: Parameters<AgentSocial['publicMine']>[0],
  httpOpts?: Parameters<AgentSocial['publicMine']>[1]
) {
  return social.publicMine(homeProjectId, httpOpts);
}

export async function messengerPublicIndex(
  social: Pick<AgentSocial, 'publicIndex'>,
  params: Parameters<AgentSocial['publicIndex']>[0],
  httpOpts?: Parameters<AgentSocial['publicIndex']>[1]
) {
  return social.publicIndex(params, httpOpts);
}

export async function messengerPresenceOnline(
  social: Pick<AgentSocial, 'presenceOnline'>,
  homeProjectId: number,
  httpOpts?: Parameters<AgentSocial['presenceOnline']>[1]
) {
  return social.presenceOnline(homeProjectId, httpOpts);
}

export async function messengerUsersPublicCards(
  social: Pick<AgentSocial, 'usersPublicCards'>,
  body: Parameters<AgentSocial['usersPublicCards']>[0],
  httpOpts?: Parameters<AgentSocial['usersPublicCards']>[1]
) {
  return social.usersPublicCards(body, httpOpts);
}

export async function messengerChannelCreate(
  social: Pick<AgentSocial, 'channelCreate'>,
  body: Parameters<AgentSocial['channelCreate']>[0],
  httpOpts?: Parameters<AgentSocial['channelCreate']>[1]
) {
  return social.channelCreate(body, httpOpts);
}

export async function messengerChannelsRegister(
  social: Pick<AgentSocial, 'channelsRegister'>,
  body: Parameters<AgentSocial['channelsRegister']>[0],
  httpOpts?: Parameters<AgentSocial['channelsRegister']>[1]
) {
  return social.channelsRegister(body, httpOpts);
}

export async function messengerChannelsUpdate(
  social: Pick<AgentSocial, 'channelsUpdate'>,
  body: Parameters<AgentSocial['channelsUpdate']>[0],
  httpOpts?: Parameters<AgentSocial['channelsUpdate']>[1]
) {
  return social.channelsUpdate(body, httpOpts);
}

export async function messengerDmEnsure(
  social: Pick<AgentSocial, 'dmEnsure'>,
  body: Parameters<AgentSocial['dmEnsure']>[0],
  httpOpts?: Parameters<AgentSocial['dmEnsure']>[1]
) {
  return social.dmEnsure(body, httpOpts);
}

export async function messengerChannelsDelete(
  social: Pick<AgentSocial, 'channelsDelete'>,
  body: Parameters<AgentSocial['channelsDelete']>[0],
  httpOpts?: Parameters<AgentSocial['channelsDelete']>[1]
) {
  return social.channelsDelete(body, httpOpts);
}

/** GET `/api/social/channel/{id}/history` — делегат {@link AgentSocial.channelHistory}. */
export async function messengerChannelHistory(
  social: Pick<AgentSocial, 'channelHistory'>,
  homeProjectId: number,
  channelId: string,
  httpOpts?: Parameters<AgentSocial['channelHistory']>[2]
) {
  return social.channelHistory(homeProjectId, channelId, httpOpts);
}

/** POST `/api/social/channel/{id}/resolve-messages` — делегат {@link AgentSocial.channelMessagesResolve}. */
export async function messengerChannelMessagesResolve(
  social: Pick<AgentSocial, 'channelMessagesResolve'>,
  homeProjectId: number,
  channelId: string,
  pairs: Parameters<AgentSocial['channelMessagesResolve']>[2],
  httpOpts?: Parameters<AgentSocial['channelMessagesResolve']>[3]
) {
  return social.channelMessagesResolve(homeProjectId, channelId, pairs, httpOpts);
}

/** POST `/api/social/friends/request` — делегат {@link AgentSocial.friendRequest}. */
export async function messengerFriendRequest(
  social: Pick<AgentSocial, 'friendRequest'>,
  body: Parameters<AgentSocial['friendRequest']>[0],
  httpOpts?: Parameters<AgentSocial['friendRequest']>[1]
) {
  return social.friendRequest(body, httpOpts);
}

/** POST `/api/social/friends/remove` — делегат {@link AgentSocial.friendsRemove}. */
export async function messengerFriendsRemove(
  social: Pick<AgentSocial, 'friendsRemove'>,
  body: Parameters<AgentSocial['friendsRemove']>[0],
  httpOpts?: Parameters<AgentSocial['friendsRemove']>[1]
) {
  return social.friendsRemove(body, httpOpts);
}

/** POST `/api/social/friends/block` — делегат {@link AgentSocial.friendsBlock}. */
export async function messengerFriendsBlock(
  social: Pick<AgentSocial, 'friendsBlock'>,
  body: Parameters<AgentSocial['friendsBlock']>[0],
  httpOpts?: Parameters<AgentSocial['friendsBlock']>[1]
) {
  return social.friendsBlock(body, httpOpts);
}

export interface MessengerChannelRef {
  homeProjectId: number;
  channelId: string;
}

export interface MessengerMessageLike {
  message_id: string;
  author_user_id: number;
  body: string;
  created_at?: string | number;
  server_seq?: number;
  hlc?: string;
  meta?: Record<string, unknown>;
  reactions?: Record<string, unknown>;
  /** Per-user comment cells (server SoT), keyed by user id string. */
  comments?: Record<string, unknown>;
  attachments?: Record<string, unknown>[];
  [extra: string]: unknown;
}

export type MessengerLiveListener = (
  messages: ReadonlyArray<MessengerMessageLike>,
  state: { cursor?: number; hlc?: string }
) => void;

export interface MessengerTransport {
  subscribe(ref: MessengerChannelRef, listener: MessengerLiveListener): () => void;
  send(ref: MessengerChannelRef, body: string, opts?: { clientMessageId?: string; meta?: Record<string, unknown> }): Promise<void>;
  edit(ref: MessengerChannelRef, messageId: string, body: string): Promise<void>;
  react(ref: MessengerChannelRef, messageId: string, emoji: string, remove?: boolean): Promise<void>;
  comment(ref: MessengerChannelRef, messageId: string, text: string): Promise<void>;
  setTyping(ref: MessengerChannelRef, typing: boolean): void;
  dispose(): void;
}

export interface MessengerChannel {
  ref: MessengerChannelRef;
  messages: {
    live(listener: MessengerLiveListener): () => void;
  };
  send(opts: { body: string; clientMessageId?: string; meta?: Record<string, unknown> }): Promise<void>;
  edit(messageId: string, opts: { body: string }): Promise<void>;
  react(messageId: string, opts: { emoji: string; remove?: boolean }): Promise<void>;
  comment(messageId: string, opts: { text: string }): Promise<void>;
  presence: {
    setTyping(typing: boolean): void;
  };
}

export interface Messenger {
  channel(ref: MessengerChannelRef): MessengerChannel;
  dispose(): void;
}

// ──────────────────────────────────────────────────────────────────────────
// REST-poll transport (widget / cross-origin default)
// ──────────────────────────────────────────────────────────────────────────

interface RestPollOpts {
  pollIntervalMs?: number;
  limit?: number;
}

class RestPollTransport implements MessengerTransport {
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private cursors = new Map<
    string,
    { seq?: number; hlc?: string; reaction_hlc?: string; comment_hlc?: string }
  >();
  private listeners = new Map<string, Set<MessengerLiveListener>>();

  constructor(
    private readonly social: AgentSocial,
    private readonly opts: RestPollOpts = {}
  ) {}

  private keyFor(ref: MessengerChannelRef): string {
    return `${ref.homeProjectId}:${ref.channelId}`;
  }

  private async pollOnce(ref: MessengerChannelRef): Promise<void> {
    const key = this.keyFor(ref);
    const cursor = this.cursors.get(key) ?? {};
    const res = await this.social.socialDelta({
      home_project_id: ref.homeProjectId,
      channel_id: ref.channelId,
      since_seq: cursor.seq,
      since_hlc: cursor.hlc,
      since_reaction_hlc: cursor.reaction_hlc,
      since_comment_hlc: cursor.comment_hlc,
      limit: this.opts.limit ?? 50,
    });
    const data = (res?.data ?? {}) as {
      messages_appended?: MessengerMessageLike[];
      server_seq?: number;
      server_hlc?: string;
      next_cursor?: number;
      reactions?: { hlc?: string }[];
      comments?: { hlc?: string }[];
    };
    const rawMsgs = Array.isArray(data.messages_appended) ? data.messages_appended : [];
    const msgs = sortMessengerMessagesForLive(rawMsgs as Record<string, unknown>[]) as MessengerMessageLike[];
    if (typeof data.server_seq === 'number') cursor.seq = data.server_seq;
    if (typeof data.next_cursor === 'number') cursor.seq = data.next_cursor;
    if (typeof data.server_hlc === 'string') cursor.hlc = data.server_hlc;
    const rx = Array.isArray(data.reactions) ? data.reactions : [];
    for (const ev of rx) {
      const hw = ev && typeof ev === 'object' && typeof ev.hlc === 'string' ? ev.hlc : '';
      if (hw && (!cursor.reaction_hlc || hw > cursor.reaction_hlc)) {
        cursor.reaction_hlc = hw;
      }
    }
    const cx = Array.isArray(data.comments) ? data.comments : [];
    for (const ev of cx) {
      const hw = ev && typeof ev === 'object' && typeof ev.hlc === 'string' ? ev.hlc : '';
      if (hw && (!cursor.comment_hlc || hw > cursor.comment_hlc)) {
        cursor.comment_hlc = hw;
      }
    }
    this.cursors.set(key, cursor);
    const set = this.listeners.get(key);
    if (set && msgs.length > 0) {
      set.forEach((l) => {
        try {
          l(msgs, { cursor: cursor.seq, hlc: cursor.hlc });
        } catch {
          /* listener error; ignore */
        }
      });
    }
  }

  subscribe(ref: MessengerChannelRef, listener: MessengerLiveListener): () => void {
    const key = this.keyFor(ref);
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    if (!this.timers.has(key)) {
      const interval = this.opts.pollIntervalMs ?? 2_500;
      const t = setInterval(() => void this.pollOnce(ref).catch(() => undefined), interval);
      this.timers.set(key, t);
      void this.pollOnce(ref).catch(() => undefined);
    }
    return () => {
      const s = this.listeners.get(key);
      s?.delete(listener);
      if (s && s.size === 0) {
        const t = this.timers.get(key);
        if (t) clearInterval(t);
        this.timers.delete(key);
        this.listeners.delete(key);
      }
    };
  }

  async send(
    ref: MessengerChannelRef,
    body: string,
    opts: { clientMessageId?: string; meta?: Record<string, unknown> } = {}
  ): Promise<void> {
    await this.social.dmMessagePost({
      home_project_id: ref.homeProjectId,
      channel_id: ref.channelId,
      body,
      client_message_id: opts.clientMessageId,
      meta: opts.meta,
    });
  }

  async edit(ref: MessengerChannelRef, messageId: string, body: string): Promise<void> {
    await (this.social as unknown as {
      messageEdit?: (p: Record<string, unknown>) => Promise<unknown>;
    }).messageEdit?.({
      home_project_id: ref.homeProjectId,
      channel_id: ref.channelId,
      message_id: messageId,
      body,
    });
  }

  async react(
    ref: MessengerChannelRef,
    messageId: string,
    emoji: string,
    remove?: boolean
  ): Promise<void> {
    if (remove) return;
    await this.social.chatMessageReact({
      home_project_id: ref.homeProjectId,
      channel_id: ref.channelId,
      message_id: messageId,
      emoji,
    });
  }

  async comment(ref: MessengerChannelRef, messageId: string, text: string): Promise<void> {
    await this.social.chatMessageComment({
      home_project_id: ref.homeProjectId,
      channel_id: ref.channelId,
      message_id: messageId,
      text,
    });
  }

  setTyping(_ref: MessengerChannelRef, _typing: boolean): void {
    // REST-poll fallback has no typing channel; this is a no-op.
  }

  dispose(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers.clear();
    this.listeners.clear();
    this.cursors.clear();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Public factory
// ──────────────────────────────────────────────────────────────────────────

/** Embed / standalone contour hints (no `import.meta` — host supplies values). */
export type MessengerClientConfig = {
  apiBaseUrl: string;
  ecosystemProjectId?: number;
};

export interface MakeMessengerOpts {
  transport?: MessengerTransport;
  pollIntervalMs?: number;
  /** Optional defaults for widgets / standalone (transport selection may use later). */
  clientConfig?: MessengerClientConfig;
}

/** Object form: ``makeMessenger({ http: sdk.httpClient, clientConfig: { ... } })`` (standalone / widgets). */
export type MakeMessengerFromHttp = MakeMessengerOpts & {
  http: HTTPClient;
};

function createMessengerFacade(client: HTTPClient, opts: MakeMessengerOpts): Messenger {
  void opts.clientConfig;
  const transport =
    opts.transport ??
    new RestPollTransport(new AgentSocial(client), { pollIntervalMs: opts.pollIntervalMs });

  const bound = new Map<string, MessengerChannel>();

  const channel = (ref: MessengerChannelRef): MessengerChannel => {
    const key = `${ref.homeProjectId}:${ref.channelId}`;
    const existing = bound.get(key);
    if (existing) return existing;
    const facade: MessengerChannel = {
      ref,
      messages: {
        live: (listener) => transport.subscribe(ref, listener),
      },
      send: (sendOpts) =>
        transport.send(ref, sendOpts.body, {
          clientMessageId: sendOpts.clientMessageId,
          meta: sendOpts.meta,
        }),
      edit: (messageId, editOpts) => transport.edit(ref, messageId, editOpts.body),
      react: (messageId, reactOpts) =>
        transport.react(ref, messageId, reactOpts.emoji, reactOpts.remove),
      comment: (messageId, commentOpts) => transport.comment(ref, messageId, commentOpts.text),
      presence: {
        setTyping: (typing) => transport.setTyping(ref, typing),
      },
    };
    bound.set(key, facade);
    return facade;
  };

  return {
    channel,
    dispose(): void {
      transport.dispose();
      bound.clear();
    },
  };
}

/**
 * Widget / standalone entry: pass ``{ http, clientConfig }`` or legacy ``(http, opts)``.
 * Genetic tag: `sdk.messenger.facade.gen1`.
 */
export function makeMessenger(client: HTTPClient, opts?: MakeMessengerOpts): Messenger;
export function makeMessenger(from: MakeMessengerFromHttp): Messenger;
export function makeMessenger(
  clientOrFrom: HTTPClient | MakeMessengerFromHttp,
  opts?: MakeMessengerOpts
): Messenger {
  if (clientOrFrom instanceof HTTPClient) {
    return createMessengerFacade(clientOrFrom, opts ?? {});
  }
  const { http, ...rest } = clientOrFrom;
  return createMessengerFacade(http, rest);
}
