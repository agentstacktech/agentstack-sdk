/**
 * Bots Fleet SDK — genetic: ``sdk.bots.gen1``.
 */

import { HTTPClient } from '../client/http-client';

export class AgentBots {
  constructor(private client: HTTPClient) {}

  list(projectId: number) {
    return this.client.get<{ bots: unknown[] }>(`/projects/${projectId}/bots`);
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

  /** Quick-start helper — maps channel + use case to built-in template (`sdk.bots.gen1`). */
  quickStartCreate(
    projectId: number,
    body: {
      channel:
        | 'telegram'
        | 'whatsapp'
        | 'web_widget'
        | 'instagram'
        | 'slack';
      useCase: 'info' | 'store' | 'payments' | 'full';
      name?: string;
      variables?: Record<string, string>;
    },
  ) {
    const templateByUseCase: Record<typeof body.useCase, string> = {
      info: 'menu_info',
      store: 'store_front',
      payments: 'payments_desk',
      full: 'commerce_full',
    };
    const labels: Record<typeof body.channel, string> = {
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      web_widget: 'Web widget',
      instagram: 'Instagram',
      slack: 'Slack',
    };
    const useCase = body.useCase;
    const name = body.name?.trim() || `${labels[body.channel]} bot`;
    return this.create(projectId, {
      name,
      brain_mode: 'echo',
      template_id: templateByUseCase[useCase],
      template_variables: body.variables,
    });
  }

  update(projectId: number, botId: string, spec: Record<string, unknown>) {
    return this.client.put<{ bot: unknown }>(`/projects/${projectId}/bots/${botId}`, spec);
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
    body: { mode: string; agent_uuid?: string; logic_id?: string; fallback_text?: string },
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
    return this.client.post<{ hook_url: string; activation: unknown }>(
      `/projects/${projectId}/bots/${botId}/activate`,
      { hook_base: hookBase ?? 'http://localhost:8000' },
    );
  }

  conversations(projectId: number, botId: string, filter?: string) {
    const qs = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return this.client.get<{ conversations: unknown[] }>(
      `/projects/${projectId}/bots/${botId}/conversations${qs}`,
    );
  }

  health(projectId: number, botId: string) {
    return this.client.get<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/health`,
    );
  }

  simulate(projectId: number, botId: string, text: string, externalUserId = 'sim-user') {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/simulate`,
      { text, external_user_id: externalUserId },
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
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${botId}/conversations/${encodeURIComponent(conversationId)}/handoff`,
      { active, notify_user: notifyUser },
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
}
