/**
 * Mentor tenant SDK — genetic: ``sdk.mentor.gen1``.
 *
 * Deprecated: prefer ``AgentKnowledge`` (`sdk.knowledge`).
 */

import { HTTPClient } from '../client/http-client';
import type { KnowledgeConfig, KnowledgeConfigPatch } from './AgentKnowledge';

/** @deprecated Prefer KnowledgeConfig via sdk.knowledge */
export type MentorConfig = KnowledgeConfig & {
  use_mentor_pipeline?: boolean;
};

let _mentorSdkDeprecatedWarned = false;

function warnMentorSdkDeprecated(): void {
  if (_mentorSdkDeprecatedWarned) return;
  _mentorSdkDeprecatedWarned = true;
  console.warn(
    '[AgentStack SDK] AgentMentor is deprecated — use AgentKnowledge (sdk.knowledge) instead.',
  );
}

export class AgentMentor {
  constructor(private client: HTTPClient) {}

  config(projectId: number) {
    warnMentorSdkDeprecated();
    return this.client.get<{
      ok: boolean;
      config: MentorConfig;
      safety_playbooks?: Record<string, unknown>;
      crisis_playbooks?: Record<string, unknown>;
    }>(`/projects/${projectId}/mentor/config`);
  }

  patchConfig(projectId: number, body: KnowledgeConfigPatch) {
    return this.client.patch<{
      ok: boolean;
      config: MentorConfig;
      safety_playbooks?: Record<string, unknown>;
      crisis_playbooks?: Record<string, unknown>;
    }>(`/projects/${projectId}/mentor/config`, body);
  }

  playground(
    projectId: number,
    body: {
      text: string;
      bot_uuid: string;
      external_user_id?: string;
      chat_type?: string;
      external_chat_id?: string;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/bots/${encodeURIComponent(body.bot_uuid)}/simulate`,
      {
        text: body.text,
        external_user_id: body.external_user_id ?? 'playground-user',
        ...(body.chat_type ? { chat_type: body.chat_type } : {}),
        ...(body.external_chat_id ? { external_chat_id: body.external_chat_id } : {}),
      },
    );
  }

  journal(projectId: number, limit = 50, includeRestricted = false) {
    const qs = new URLSearchParams({
      limit: String(limit),
      include_restricted: includeRestricted ? 'true' : 'false',
    });
    return this.client.get<{ ok: boolean; turns: unknown[] }>(
      `/projects/${projectId}/mentor/journal?${qs.toString()}`,
    );
  }

  purgeJournal(projectId: number) {
    return this.client.post<{ ok: boolean; queued?: boolean; job_id?: string }>(
      `/projects/${projectId}/mentor/journal/purge`,
      {},
    );
  }

  runEval(projectId: number) {
    return this.client.post<{ ok: boolean; passed?: number; total?: number; pass_rate?: number }>(
      `/projects/${projectId}/mentor/eval/run`,
      {},
    );
  }

  runRetrievalEval(
    projectId: number,
    body: { collection_id: string; min_hit_rate?: number; principal_user_id?: number },
  ) {
    return this.client.post<{
      ok: boolean;
      hits?: number;
      total?: number;
      hit_rate?: number;
      results?: unknown[];
    }>(`/projects/${projectId}/mentor/eval/retrieval`, body);
  }

  runFullEval(
    projectId: number,
    body?: { collection_id?: string; min_hit_rate?: number; principal_user_id?: number },
  ) {
    return this.client.post<{
      ok: boolean;
      safety?: Record<string, unknown>;
      retrieval?: Record<string, unknown> | null;
    }>(`/projects/${projectId}/mentor/eval/run-all`, body ?? {});
  }

  exportJson(projectId: number) {
    return this.client.get<{ ok: boolean; bundle: { config: MentorConfig; journal: unknown[] } }>(
      `/projects/${projectId}/mentor/export`,
    );
  }

  exportZip(projectId: number) {
    return this.client.get<Blob>(`/projects/${projectId}/mentor/export.zip`, undefined, {
      responseType: 'blob',
    });
  }

  listPrincipalLinks(projectId: number) {
    return this.client.get<{ ok: boolean; links: unknown[] }>(
      `/projects/${projectId}/mentor/principal-links`,
    );
  }

  upsertPrincipalLink(
    projectId: number,
    body: { telegram_user_id: string; platform_user_id: number },
  ) {
    return this.client.post<{ ok: boolean; link: unknown }>(
      `/projects/${projectId}/mentor/principal-links`,
      body,
    );
  }

  createTelegramBindCode(projectId: number, botUsername?: string) {
    const qs = botUsername ? `?bot_username=${encodeURIComponent(botUsername)}` : '';
    return this.client.post<{
      ok: boolean;
      code?: string;
      start_param?: string;
      telegram_url?: string | null;
      expires_minutes?: number;
    }>(`/projects/${projectId}/mentor/principal-links/telegram-bind-code${qs}`, {});
  }

  ingestKb(
    projectId: number,
    body: {
      collection_id: string;
      documents: Array<{ content: string; source_doc_id?: string; metadata?: Record<string, unknown> }>;
      enqueue?: boolean;
    },
  ) {
    return this.client.post<{ ok: boolean; queued?: boolean; job_ids?: string[]; ingested?: number }>(
      `/projects/${projectId}/mentor/kb/ingest`,
      body,
    );
  }
}
