/**
 * Bots Fleet SDK — genetic: ``sdk.bots.gen1``.
 */

import { HTTPClient } from '../client/http-client';

export class AgentBots {
  constructor(private client: HTTPClient) {}

  list(projectId: number, options?: { source?: 'ecs' | 'dna' }) {
    const qs =
      options?.source === 'dna' ? '?source=dna' : options?.source === 'ecs' ? '?source=ecs' : '';
    return this.client.get<{ bots: unknown[] }>(`/projects/${projectId}/bots${qs}`);
  }

  /** Rebuild ECS bots fleet index (Studio empty-list recovery). */
  rebuildFleetIndex(projectId: number) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/fleet/rebuild`,
      {},
    );
  }

  /** Project bots fleet health — mirrors MCP ``bots.fleet_diagnostics``. */
  fleetDiagnostics(projectId: number) {
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/fleet/diagnostics`,
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

  get(projectId: number, botId: string) {
    return this.client.get<{ bot: unknown }>(`/projects/${projectId}/bots/${botId}`);
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
      includeMessages?: boolean;
      limit?: number;
      cursor?: string;
    },
  ) {
    const params = new URLSearchParams();
    if (opts?.filter) params.set('filter', opts.filter);
    if (opts?.includeMessages) params.set('include_messages', 'true');
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.cursor) params.set('cursor', opts.cursor);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<{ conversations: unknown[]; next_cursor?: string }>(
      `/projects/${projectId}/bots/${botId}/conversations${qs}`,
    );
  }

  /**
   * One conversation thread page (newest-at-end). ``before`` is hlc/at of the oldest shown turn.
   */
  conversation(
    projectId: number,
    botId: string,
    conversationId: string,
    opts?: { limit?: number; before?: string },
  ) {
    const params = new URLSearchParams();
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.before) params.set('before', opts.before);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}${qs}`,
    );
  }

  /**
   * Health snapshot. Optional `include` mirrors REST/MCP (`queues`, `telegram`, `max`, …).
   * OpenAPI regen optional — signature asserted in frontend `agentBotsSdkSignatures.test.ts`.
   */
  health(projectId: number, botId: string, opts?: { include?: string[] }) {
    const params = new URLSearchParams();
    if (opts?.include?.length) {
      params.set('include', opts.include.join(','));
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/health${qs}`,
    );
  }

  dlqReplay(projectId: number, botId: string, itemId: string) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/dlq/${encodeURIComponent(itemId)}/replay`,
      {},
    );
  }

  /** Project-scoped bots DLQ list (ANR-05). */
  fleetDlqList(projectId: number, limit = 50) {
    return this.client.get<{ success: boolean; dlq: unknown[]; count: number }>(
      `/projects/${projectId}/bots/fleet/dlq`,
      { limit },
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
    options?: { chat_type?: string; external_chat_id?: string; channel_kind?: string },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/simulate`,
      {
        text,
        external_user_id: externalUserId,
        ...(options?.chat_type ? { chat_type: options.chat_type } : {}),
        ...(options?.external_chat_id ? { external_chat_id: options.external_chat_id } : {}),
        ...(options?.channel_kind ? { channel_kind: options.channel_kind } : {}),
      },
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  staffReply(
    projectId: number,
    botId: string,
    conversationId: string,
    text: string,
    clearHandoff = false,
    requireHandoff = false,
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/staff_reply`,
      { text, clear_handoff: clearHandoff, require_handoff: requireHandoff },
    );
  }

  setHandoff(
    projectId: number,
    botId: string,
    conversationId: string,
    active: boolean,
    notifyUser = false,
    opts?: { claim?: boolean },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/handoff`,
      {
        active,
        notify_user: notifyUser,
        ...(opts?.claim !== undefined ? { claim: opts.claim } : {}),
      },
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
      text: string;
      external_user_ids?: string[];
      dry_run?: boolean;
      template_name?: string;
      template_language?: string;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/broadcast`,
      body,
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
}
