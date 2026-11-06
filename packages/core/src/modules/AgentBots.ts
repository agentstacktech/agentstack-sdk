/**
 * Bots Fleet SDK — genetic: ``sdk.bots.gen1``.
 */

import { HTTPClient } from '../client/http-client';
import type { BotOutboundAttachment } from '../bots/BotAttachmentTypes';
import type { RequestConfig } from '../types';

type BotsEnvOpts = { envUuid?: string | null };

function botsSandboxGetOptions(opts?: BotsEnvOpts): Partial<RequestConfig> | undefined {
  const env = String(opts?.envUuid ?? '').trim();
  return env ? { headers: { 'X-AgentStack-Env': env } } : undefined;
}

export class AgentBots {
  constructor(private client: HTTPClient) {}

  list(projectId: number, options?: { source?: 'ecs' | 'dna'; envUuid?: string | null }) {
    const qs =
      options?.source === 'dna' ? '?source=dna' : options?.source === 'ecs' ? '?source=ecs' : '';
    return this.client.get<{ bots: unknown[] }>(
      `/projects/${projectId}/bots${qs}`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }

  /** Rebuild ECS bots fleet index (Studio empty-list recovery). */
  rebuildFleetIndex(projectId: number) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/fleet/rebuild`,
      {},
    );
  }

  /** Project bots fleet health — mirrors MCP ``bots.fleet_diagnostics``. */
  fleetDiagnostics(projectId: number, options?: BotsEnvOpts) {
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/fleet/diagnostics`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }

  /** Idempotent mentor /menu+/operator heal — mirrors MCP ``bots.ensure_mentor_commands``. */
  healMentorCommands(projectId: number, botId: string) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/heal-mentor-commands`,
      {},
    );
  }

  templates(projectId: number) {
    return this.client.get<{ templates: unknown[] }>(`/projects/${projectId}/bots/templates`);
  }

  get(projectId: number, botId: string, options?: BotsEnvOpts) {
    return this.client.get<{ bot: unknown }>(
      `/projects/${projectId}/bots/${botId}`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }

  create(
    projectId: number,
    body: {
      name: string;
      brain_mode?: string;
      template_id?: string;
      template_variables?: Record<string, string>;
    },
  ) {
    return this.client.post<{ bot: unknown }>(`/projects/${projectId}/bots`, body);
  }

  update(projectId: number, botId: string, spec: Record<string, unknown>) {
    return this.client.put<{
      bot: unknown;
      telegram_menu?: { ok?: boolean; skipped?: string; error?: string; n?: number };
    }>(`/projects/${projectId}/bots/${botId}`, spec);
  }

  attachChannel(
    projectId: number,
    botId: string,
    body: { connection_uuid: string; kind: string; external_bot_id?: string },
  ) {
    return this.client.post<{ bot: unknown }>(
      `/projects/${projectId}/bots/${botId}/attach_channel`,
      body,
    );
  }

  setBrain(
    projectId: number,
    botId: string,
    body: {
      mode: string;
      /** Pass null to clear; omit to leave unchanged on the server. */
      agent_uuid?: string | null;
      logic_id?: string | null;
      fallback_text?: string;
      rag_collections?: string[];
      rag_trigger_mode?: string;
      rag_trigger_phrases?: string[];
      /** Studio debug: append source doc + original extractive under AI answer. */
      rag_debug?: boolean;
      replacements?: Array<{ find: string; replace: string }>;
      unified_diff?: string;
      allow_shrink?: boolean;
    },
  ) {
    return this.client.post<{ bot: unknown }>(
      `/projects/${projectId}/bots/${botId}/set_brain`,
      body,
    );
  }

  goLive(
    projectId: number,
    botId: string,
    body?: { hook_base?: string; activate_webhook?: boolean },
  ) {
    return this.client.post<{ bot: unknown; activation?: unknown; activation_error?: string }>(
      `/projects/${projectId}/bots/${botId}/go_live`,
      body ?? {},
    );
  }

  activate(projectId: number, botId: string, hookBase?: string) {
    const trimmed = hookBase?.trim();
    // Empty body → Core uses AGENTSTACK_PUBLIC_URL / default_hook_base (never localhost).
    return this.client.post<{ hook_url: string; activation: unknown }>(
      `/projects/${projectId}/bots/${botId}/activate`,
      trimmed ? { hook_base: trimmed } : {},
    );
  }

  /**
   * List conversations. `filter` / `includeMessages` / `limit` / `cursor` mirror REST + MCP
   * `bots.conversations` (inbox defaults `include_messages=false`).
   */
  conversations(
    projectId: number,
    botId: string,
    opts?: {
      filter?: string;
      /** Agent reply mailbox (`agentstack` or agent id). Not the same as filter=needs_reply. */
      replyFor?: string;
      /** pending = open inbound to owner; history = any thread that targeted owner. */
      replyForScope?: 'pending' | 'history';
      /** With includeMessages, filter inbound turns to this reply_target. */
      inboundReplyTarget?: string;
      includeMessages?: boolean;
      limit?: number;
      cursor?: string;
      envUuid?: string | null;
    },
  ) {
    const params = new URLSearchParams();
    if (opts?.filter) params.set('filter', opts.filter);
    if (opts?.replyFor) params.set('reply_for', opts.replyFor);
    if (opts?.replyForScope) params.set('reply_for_scope', opts.replyForScope);
    if (opts?.inboundReplyTarget) params.set('inbound_reply_target', opts.inboundReplyTarget);
    if (opts?.includeMessages) params.set('include_messages', 'true');
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.cursor) params.set('cursor', opts.cursor);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<{ conversations: unknown[]; next_cursor?: string }>(
      `/projects/${projectId}/bots/${botId}/conversations${qs}`,
      undefined,
      botsSandboxGetOptions(opts),
    );
  }

  /** Full-index inbox tab counts (W8-U6 — not limited to list page size). */
  inboxFilterCounts(projectId: number, botId: string, opts?: { envUuid?: string | null }) {
    return this.client.get<{ counts: Record<string, number> }>(
      `/projects/${projectId}/bots/${botId}/conversations/inbox_counts`,
      undefined,
      botsSandboxGetOptions(opts),
    );
  }

  /**
   * One conversation thread page (newest-at-end). ``before`` is hlc/at of the oldest shown turn.
   */
  conversation(
    projectId: number,
    botId: string,
    conversationId: string,
    opts?: { limit?: number; before?: string; envUuid?: string | null },
  ) {
    const params = new URLSearchParams();
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.before) params.set('before', opts.before);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}${qs}`,
      undefined,
      botsSandboxGetOptions(opts),
    );
  }

  /**
   * Health snapshot. Optional `include` mirrors REST/MCP (`queues`, `telegram`, `max`, …).
   * Sandbox reads: pass `envUuid` or rely on HTTP client `sandboxEnv` (`X-AgentStack-Env`).
   */
  health(
    projectId: number,
    botId: string,
    opts?: { include?: string[]; envUuid?: string | null },
  ) {
    const params = new URLSearchParams();
    if (opts?.include?.length) {
      params.set('include', opts.include.join(','));
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/health${qs}`,
      undefined,
      botsSandboxGetOptions(opts),
    );
  }

  dlqReplay(projectId: number, botId: string, itemId: string) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/dlq/${encodeURIComponent(itemId)}/replay`,
      {},
    );
  }

  /** Project-scoped bots DLQ list (ANR-05). Queue plane is prod; header keeps cache/SDK parity with fleet reads. */
  fleetDlqList(projectId: number, limit = 50, opts?: BotsEnvOpts) {
    return this.client.get<{ success: boolean; dlq: unknown[]; count: number }>(
      `/projects/${projectId}/bots/fleet/dlq`,
      { limit },
      botsSandboxGetOptions(opts),
    );
  }

  /** Replay DLQ item scoped to project (preferred over bot-scoped alias). */
  fleetDlqReplay(projectId: number, itemId: string) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/fleet/dlq/${encodeURIComponent(itemId)}/replay`,
      {},
    );
  }

  simulate(
    projectId: number,
    botId: string,
    text: string,
    externalUserId = 'sim-user',
    options?: {
      chat_type?: string;
      external_chat_id?: string;
      channel_kind?: string;
      envUuid?: string | null;
      mentioned_bot?: boolean;
      reply_to_bot?: boolean;
    },
  ) {
    const envHdr = botsSandboxGetOptions({ envUuid: options?.envUuid });
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/simulate`,
      {
        text,
        external_user_id: externalUserId,
        ...(options?.chat_type ? { chat_type: options.chat_type } : {}),
        ...(options?.external_chat_id ? { external_chat_id: options.external_chat_id } : {}),
        ...(options?.channel_kind ? { channel_kind: options.channel_kind } : {}),
        ...(options?.mentioned_bot != null ? { mentioned_bot: options.mentioned_bot } : {}),
        ...(options?.reply_to_bot != null ? { reply_to_bot: options.reply_to_bot } : {}),
      },
      {
        useAiTimeout: true,
        headers: {
          'X-Request-Lane': 'ai_stream',
          ...(envHdr?.headers as Record<string, string> | undefined),
        },
      },
    );
  }

  /** RFC group_access priemka — supergroup guest/member scenarios via REST simulate. */
  simulateGroupScenario(
    projectId: number,
    botId: string,
    scenario: 'guest_faq' | 'member_mention' | 'owner_grant',
    options?: { external_chat_id?: string; envUuid?: string | null },
  ) {
    const chatId = options?.external_chat_id ?? '-100999001';
    const presets: Record<string, { text: string; chat_type: string; mentioned_bot?: boolean }> = {
      guest_faq: { text: 'привет', chat_type: 'supergroup' },
      member_mention: { text: '@bot help', chat_type: 'supergroup', mentioned_bot: true },
      owner_grant: { text: '/grant 123456 1', chat_type: 'supergroup' },
    };
    const p = presets[scenario] ?? presets.guest_faq;
    return this.simulate(projectId, botId, p.text, `sim-${scenario}`, {
      chat_type: p.chat_type,
      external_chat_id: chatId,
      mentioned_bot: p.mentioned_bot,
      envUuid: options?.envUuid,
    });
  }

  staffReply(
    projectId: number,
    botId: string,
    conversationId: string,
    text: string,
    clearHandoff = false,
    requireHandoff = false,
    attachments?: BotOutboundAttachment[],
    envUuid?: string | null,
    sourceAgentId?: string | null,
    sourceKind = 'staff',
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/staff_reply`,
      {
        text,
        clear_handoff: clearHandoff,
        require_handoff: requireHandoff,
        ...(attachments?.length ? { attachments } : {}),
        ...(sourceAgentId ? { source_agent_id: sourceAgentId, source_kind: sourceKind } : {}),
      },
      botsSandboxGetOptions({ envUuid }),
    );
  }

  fetchMediaBlob(
    projectId: number,
    botId: string,
    query: {
      storageFileId?: string;
      conversationId?: string;
      providerMediaId?: string;
    },
    envUuid?: string | null,
  ) {
    const q = new URLSearchParams();
    if (query.storageFileId) q.set('storage_file_id', query.storageFileId);
    if (query.conversationId) q.set('conversation_id', query.conversationId);
    if (query.providerMediaId) q.set('provider_media_id', query.providerMediaId);
    const qs = q.toString();
    return this.client.get<Blob>(
      `/projects/${projectId}/bots/${encodeURIComponent(botId)}/media${qs ? `?${qs}` : ''}`,
      undefined,
      { responseType: 'blob', ...botsSandboxGetOptions({ envUuid }) },
    );
  }

  setHandoff(
    projectId: number,
    botId: string,
    conversationId: string,
    active: boolean,
    notifyUser = false,
    opts?: { claim?: boolean; envUuid?: string | null },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/handoff`,
      {
        active,
        notify_user: notifyUser,
        ...(opts?.claim !== undefined ? { claim: opts.claim } : {}),
      },
      botsSandboxGetOptions({ envUuid: opts?.envUuid }),
    );
  }

  pause(projectId: number, botId: string, body?: { deactivate_webhook?: boolean }) {
    return this.client.post<{ bot: unknown; deactivation?: unknown }>(
      `/projects/${projectId}/bots/${botId}/pause`,
      body ?? {},
    );
  }

  archive(projectId: number, botId: string, body?: { deactivate_webhook?: boolean }) {
    return this.client.post<{ bot: unknown; deactivation?: unknown }>(
      `/projects/${projectId}/bots/${botId}/archive`,
      body ?? {},
    );
  }

  broadcast(
    projectId: number,
    botId: string,
    body: {
      text?: string;
      attachments?: BotOutboundAttachment[];
      external_user_ids?: string[];
      dry_run?: boolean;
      template_name?: string;
      template_language?: string;
      sync_fanout?: boolean;
      async_fanout?: boolean;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/broadcast`,
      body,
    );
  }

  broadcastStatus(
    projectId: number,
    botId: string,
    params: {
      fanout_job_id?: string;
      plan_key?: string;
      include_queues?: boolean;
    },
  ) {
    const q = new URLSearchParams();
    if (params.fanout_job_id) q.set('fanout_job_id', params.fanout_job_id);
    if (params.plan_key) q.set('plan_key', params.plan_key);
    if (params.include_queues === false) q.set('include_queues', 'false');
    const qs = q.toString();
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/broadcast/status${qs ? `?${qs}` : ''}`,
    );
  }

  wabaTemplates(projectId: number, connectionUuid?: string) {
    const qs = connectionUuid ? `?connection_uuid=${encodeURIComponent(connectionUuid)}` : '';
    return this.client.get<{
      templates: Array<{ name?: string; language?: string; status?: string }>;
      default_broadcast_template?: string;
      source?: string;
    }>(`/projects/${projectId}/bots/waba/templates${qs}`);
  }

  sendCommerceOffer(
    projectId: number,
    botId: string,
    conversationId: string,
    body: {
      listing_uuid: string;
      cta_label?: string;
      intro_text?: string;
      mirror_to_chat?: boolean;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/commerce_offer`,
      body,
    );
  }

  simulateCommerceOffer(
    projectId: number,
    botId: string,
    body: {
      listing_uuid: string;
      external_user_id?: string;
      /** Preferred — aligns with `/simulate` `channel_kind`. */
      channel_kind?: string;
      /** @deprecated Prefer `channel_kind`. */
      channel?: string;
      cta_label?: string;
      intro_text?: string;
    },
  ) {
    const { channel, channel_kind, ...rest } = body;
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/simulate/commerce_offer`,
      {
        ...rest,
        channel_kind: channel_kind || channel,
      },
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  /** Group ACL — mirrors REST `/group-access*` (`core.bots.group_access.gen1`). */
  groupAccessChats(projectId: number, botId: string, options?: BotsEnvOpts) {
    return this.client.get<{ chat_keys?: string[] }>(
      `/projects/${projectId}/bots/${encodeURIComponent(botId)}/group-access/chats`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }

  groupAccessGet(
    projectId: number,
    botId: string,
    params: { external_chat_id: string; provider: string },
    options?: BotsEnvOpts,
  ) {
    const qs = new URLSearchParams({
      external_chat_id: params.external_chat_id,
      provider: params.provider,
    });
    return this.client.get<{
      chat_key?: string;
      config?: Record<string, unknown> | null;
      session_mode?: string;
      mode_source?: string;
    }>(
      `/projects/${projectId}/bots/${encodeURIComponent(botId)}/group-access?${qs}`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }

  groupAccessPatch(
    projectId: number,
    botId: string,
    body: {
      external_chat_id: string;
      provider: string;
      config: Record<string, unknown>;
    },
    options?: BotsEnvOpts,
  ) {
    return this.client.patch<Record<string, unknown>>(
      `/projects/${projectId}/bots/${encodeURIComponent(botId)}/group-access`,
      body,
      botsSandboxGetOptions(options),
    );
  }

  groupAccessAudit(
    projectId: number,
    botId: string,
    params?: { limit?: number; chat_key?: string },
    options?: BotsEnvOpts,
  ) {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.chat_key) qs.set('chat_key', params.chat_key);
    const q = qs.toString();
    return this.client.get<{ items?: Array<Record<string, unknown>> }>(
      `/projects/${projectId}/bots/${encodeURIComponent(botId)}/group-access/audit${q ? `?${q}` : ''}`,
      undefined,
      botsSandboxGetOptions(options),
    );
  }
}
