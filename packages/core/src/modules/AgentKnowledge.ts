/**
 * Knowledge platform SDK — genetic: ``sdk.knowledge.gen1``.
 */

import { HTTPClient } from '../client/http-client';

export type KnowledgeChunkSpan = {
  index: number;
  start: number;
  end: number;
  heading?: string;
};

/** Operator corpus row from GET /knowledge/content (joined body in ``text``). */
export type KnowledgeContentItem = {
  source_doc_id?: string;
  title?: string;
  text?: string;
  chunk_count?: number;
  chunk_spans?: KnowledgeChunkSpan[];
  gene_stems?: string[];
  access_tier?: string;
  collection_id?: string;
  product_ids?: string[];
  status?: string;
};

/** Read-only chunk row from GET /kb/chunks (not a Studio save path). */
export type KnowledgeKbChunk = {
  doc_id?: string;
  text?: string;
  chunk_index?: number;
  source_doc_id?: string;
  metadata?: Record<string, unknown>;
};

export type KnowledgeSupportContacts = {
  conversation_url?: string;
  label_ru?: string;
  label_en?: string;
  telegram_url?: string;
  email?: string;
};

export type KnowledgeGeneLexiconEntry = {
  stems?: string[];
  idents?: string[];
  aliases?: string[];
};

export type KnowledgeFaqPhenotype = {
  name: string;
  all_of?: string[];
  any_of?: string[];
  none_of?: string[];
  retrieve?: string;
  boost_idents?: string[];
  penalize_idents?: string[];
  skip_without_lock?: boolean;
  penalize_bg_vs?: boolean;
  penalize_noise?: boolean;
  noise_unless_asked?: boolean;
  covers_all?: string[];
  covers_any?: string[];
  heading_needles?: string[];
  penalize_heading_needles?: string[];
  drop_sentence_stems?: string[];
  retrieve_expand?: string;
};

export type KnowledgeGenePack = {
  version?: number;
  program_stems?: string[];
  aliases?: Record<string, string>;
  lexicon?: Record<string, KnowledgeGeneLexiconEntry>;
  phenotypes?: KnowledgeFaqPhenotype[];
  sanitize_drop?: string[];
  skip_asked_stems?: string[];
  situational_needles?: string[];
};

export type KnowledgeConfig = {
  support_url?: string;
  contacts?: KnowledgeSupportContacts;
  default_locale?: string;
  /** GET metadata only — stripped on PATCH by Core. */
  crisis_playbook_version?: string;
  moderator_user_ids?: number[];
  min_rag_score?: number;
  grounded_first?: boolean;
  hyde_enabled?: boolean;
  term_aliases?: Record<string, string>;
  gene_pack?: KnowledgeGenePack;
  context_map_enabled?: boolean;
  crag_enabled?: boolean;
  rerank_enabled?: boolean;
  retention_days?: number;
  llm_primary?: string;
  llm_fallback?: string;
  /** Mentor-channel Plan follow-up context. PromptPanel is the only writer. */
  plan_history_enabled?: boolean;
  plan_history_max_user_messages?: number;
  slo_p95_ms?: number;
  max_concurrent_runs?: number;
  use_assistant_pipeline?: boolean;
  safety_fail_mode?: 'fail_open' | 'fail_closed_crisis';
  safety_term_allowlist?: string[];
  collection_ids?: string[];
  entitlement_sources?: string[];
  getcourse_cache_ttl_sec?: number;
  product_id_map?: Record<string, string>;
  allowed_link_domains?: string[];
  onboarding_email_prompt_ru?: string;
  require_email_for_paid?: boolean;
  crisis_notify_webhook_url?: string | null;
  default_playground_bot_uuid?: string | null;
  moderator_hours_msk?: {
    start?: number;
    end?: number;
    weekdays_only?: boolean;
  };
  safety_reactions?: Record<
    string,
    {
      playbook_id?: string;
      notify_moderators?: boolean;
      auto_handoff?: boolean;
    }
  >;
};

/** Writable knowledge DNA fields (excludes GET-only metadata). */
export type KnowledgeConfigPatch = Omit<Partial<KnowledgeConfig>, 'crisis_playbook_version'> & {
  safety_playbooks?: Record<string, unknown>;
  /** Full dict replace (UI). MCP default is patch overlay when omitted. */
  safety_playbooks_write_mode?: 'replace' | 'patch' | 'merge';
  /** @deprecated alias — prefer safety_playbooks */
  crisis_playbooks?: Record<string, unknown>;
};

/** Platform overlay slots written via existing prompt/config PATCH. */
export type KnowledgePolicyTemplateSlot =
  | 'synthesis'
  | 'crisis'
  | 'situational'
  | 'gate';

export type KnowledgePolicyTemplate = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  slots: KnowledgePolicyTemplateSlot[];
  plan_preview?: string;
};

export type KnowledgePolicyTemplateApplyBody = {
  template_id: string;
  slots?: KnowledgePolicyTemplateSlot[];
  agent_uuid?: string;
};

export type KnowledgePolicyTemplateApplyResult = {
  ok: boolean;
  template_id: string;
  applied: KnowledgePolicyTemplateSlot[];
  skipped: KnowledgePolicyTemplateSlot[];
  reasons?: Record<string, string>;
};

export type KnowledgePolicyTemplateStatus = {
  ok: boolean;
  synthesis_applied: string[];
  catalog_template_ids: string[];
  playbook_ids: string[];
  playbook_count: number;
  safety_fail_mode: string;
  grounded_first: boolean;
  situational_needles_count: number;
  gene_phenotypes_count: number;
  plan_instructions_chars: number;
  agent_uuid?: string;
  prompt_reason?: string;
};

export type KnowledgeAccessGrantBody = {
  principal_user_id: number;
  product_id: string;
  tier?: string;
  expires_at?: string | null;
};

export type KnowledgeChannelLinkBody = {
  channel: string;
  external_user_id: string;
  platform_user_id: number;
};

export type KnowledgePlaygroundBody = {
  text: string;
  bot_uuid: string;
  external_user_id?: string;
  chat_type?: string;
  external_chat_id?: string;
  principal_user_id?: number;
  access_tier?: string;
  product_id?: string;
};

export type KnowledgeAccessSimulateBody = {
  principal_user_id?: number;
  product_id?: string;
  channel?: string;
  external_user_id?: string;
};

export type KnowledgePromptRecord = {
  system_preamble?: string;
  plan_instructions?: string;
  agent_uuid?: string;
  template_id?: string;
};

export type KnowledgePromptEnvelope = {
  ok: boolean;
  prompt: KnowledgePromptRecord | null;
  reason?: string;
};

export type KnowledgeAccessGrant = {
  principal_user_id?: number;
  product_id?: string;
  tier?: string;
  source?: string;
  expires_at?: string;
};

export type KnowledgeChannelLink = {
  channel?: string;
  external_user_id?: string;
  platform_user_id?: number;
};

export type KnowledgeGetCourseStatus = {
  recipe_installed?: boolean;
  export_api_configured?: boolean;
  circuit_state?: string;
};

export type KnowledgeEvalCase = {
  id?: string;
  passed?: boolean;
  category?: string;
};

export type KnowledgeEvalSuite = {
  ok?: boolean;
  passed?: number;
  total?: number;
  pass_rate?: number;
  results?: KnowledgeEvalCase[];
};

export type KnowledgeRetrievalEvalResult = {
  ok?: boolean;
  hits?: number;
  total?: number;
  hit_rate?: number;
  results?: unknown[];
};

export type KnowledgeEvalReadback = {
  ok?: boolean;
  readback_rate?: number;
  total?: number;
  readback_count?: number;
};

export type KnowledgeEvalBaselineReport = {
  ok?: boolean;
  regressions?: string[];
};

export type KnowledgeFullEvalResult = {
  ok?: boolean;
  safety?: KnowledgeEvalSuite;
  retrieval?: KnowledgeRetrievalEvalResult | null;
  readback?: KnowledgeEvalReadback;
  baseline?: KnowledgeEvalBaselineReport;
};

export type KnowledgeEvalBaselineStored = {
  safetyPassed?: number;
  safetyTotal?: number;
  retrievalHits?: number;
  retrievalTotal?: number;
  retrievalRate?: number;
  at?: string;
};

export class AgentKnowledge {
  constructor(private client: HTTPClient) {}

  config(projectId: number) {
    return this.client.get<{
      ok: boolean;
      config: KnowledgeConfig;
      safety_playbooks?: Record<string, unknown>;
      crisis_playbooks?: Record<string, unknown>;
    }>(`/projects/${projectId}/knowledge/config`);
  }

  patchConfig(projectId: number, body: KnowledgeConfigPatch) {
    return this.client.patch<{
      ok: boolean;
      config: KnowledgeConfig;
      safety_playbooks?: Record<string, unknown>;
      crisis_playbooks?: Record<string, unknown>;
    }>(`/projects/${projectId}/knowledge/config`, body);
  }

  listPolicyTemplates(projectId: number) {
    return this.client.get<{
      ok: boolean;
      templates: KnowledgePolicyTemplate[];
    }>(`/projects/${projectId}/knowledge/policy-templates`);
  }

  policyTemplateStatus(projectId: number, agentUuid?: string) {
    const qs = agentUuid ? `?agent_uuid=${encodeURIComponent(agentUuid)}` : '';
    return this.client.get<KnowledgePolicyTemplateStatus>(
      `/projects/${projectId}/knowledge/policy-templates/status${qs}`,
    );
  }

  applyPolicyTemplate(projectId: number, body: KnowledgePolicyTemplateApplyBody) {
    return this.client.post<KnowledgePolicyTemplateApplyResult>(
      `/projects/${projectId}/knowledge/policy-templates/apply`,
      body,
    );
  }

  journal(
    projectId: number,
    limit = 50,
    includeRestricted = false,
    cursor?: string,
  ) {
    const qs = new URLSearchParams({
      limit: String(limit),
      include_restricted: includeRestricted ? 'true' : 'false',
    });
    if (cursor) qs.set('cursor', cursor);
    return this.client.get<{ ok: boolean; turns: unknown[]; next_cursor?: string | null }>(
      `/projects/${projectId}/knowledge/journal?${qs.toString()}`,
    );
  }

  purgeJournal(projectId: number) {
    return this.client.post<{ ok: boolean; queued?: boolean; job_id?: string }>(
      `/projects/${projectId}/knowledge/journal/purge`,
      {},
    );
  }

  exportJournal(projectId: number, cursor?: string) {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.client.get<{ ok: boolean; turns: unknown[]; next_cursor?: string | null }>(
      `/projects/${projectId}/knowledge/journal/export${qs}`,
    );
  }

  playground(projectId: number, body: KnowledgePlaygroundBody) {
    return this.client.post<Record<string, unknown>>(
      `/projects/${projectId}/knowledge/playground`,
      body,
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  listChannelLinks(projectId: number, limit = 100) {
    const qs = new URLSearchParams({ limit: String(limit) });
    return this.client.get<{ ok: boolean; links: KnowledgeChannelLink[] }>(
      `/projects/${projectId}/knowledge/channel-links?${qs.toString()}`,
    );
  }

  upsertChannelLink(projectId: number, body: KnowledgeChannelLinkBody) {
    return this.client.post<{ ok: boolean; link: unknown }>(
      `/projects/${projectId}/knowledge/channel-links`,
      body,
    );
  }

  createBindCode(projectId: number, channel: string, botUsername?: string) {
    const qs = botUsername ? `?bot_username=${encodeURIComponent(botUsername)}` : '';
    return this.client.post<{
      ok: boolean;
      code?: string;
      start_param?: string;
      telegram_url?: string | null;
      expires_minutes?: number;
    }>(`/projects/${projectId}/knowledge/channel-links/${encodeURIComponent(channel)}/bind-code${qs}`, {});
  }

  listAccessGrants(projectId: number, principalUserId?: number) {
    const qs =
      principalUserId != null && principalUserId > 0
        ? `?principal_user_id=${principalUserId}`
        : '';
    return this.client.get<{ ok: boolean; grants: KnowledgeAccessGrant[] }>(
      `/projects/${projectId}/knowledge/access/grants${qs}`,
    );
  }

  upsertAccessGrant(projectId: number, body: KnowledgeAccessGrantBody) {
    return this.client.post<{ ok: boolean; grant: unknown }>(
      `/projects/${projectId}/knowledge/access/grants`,
      body,
    );
  }

  revokeAccessGrant(projectId: number, body: { principal_user_id: number; product_id: string }) {
    return this.client.delete<{ ok: boolean; revoked?: boolean }>(
      `/projects/${projectId}/knowledge/access/grants`,
      { body },
    );
  }

  simulateAccess(projectId: number, body: KnowledgeAccessSimulateBody) {
    return this.client.post<{
      ok: boolean;
      tier?: string;
      gc_sync_status?: string;
      context?: Record<string, unknown>;
    }>(`/projects/${projectId}/knowledge/access/simulate`, body);
  }

  getGetCourseStatus(projectId: number) {
    return this.client.get<{ ok: boolean; getcourse: KnowledgeGetCourseStatus }>(
      `/projects/${projectId}/knowledge/access/getcourse-status`,
    );
  }

  reconcileGetCourse(projectId: number, principalUserId?: number) {
    const qs =
      principalUserId != null && principalUserId > 0
        ? `?principal_user_id=${principalUserId}`
        : '';
    return this.client.post<{ ok: boolean; job_id?: string; queued?: boolean }>(
      `/projects/${projectId}/knowledge/access/getcourse-reconcile${qs}`,
      {},
    );
  }

  listEntitlementPending(projectId: number, limit = 50) {
    return this.client.get<{ ok: boolean; pending: unknown[]; count?: number }>(
      `/projects/${projectId}/knowledge/access/entitlement-pending?limit=${limit}`,
    );
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
      `/projects/${projectId}/knowledge/kb/ingest`,
      body,
    );
  }

  listKbChunks(
    projectId: number,
    collectionId: string,
    limit = 50,
    sourceDocId?: string,
  ) {
    const qs = new URLSearchParams({ collection_id: collectionId, limit: String(limit) });
    if (sourceDocId) qs.set('source_doc_id', sourceDocId);
    return this.client.get<{ ok: boolean; chunks: KnowledgeKbChunk[]; count?: number }>(
      `/projects/${projectId}/knowledge/kb/chunks?${qs.toString()}`,
    );
  }

  patchKbChunk(
    projectId: number,
    docId: string,
    body: { text: string; collection_id?: string },
  ) {
    return this.client.patch<{ ok: boolean; source_doc_id?: string; chunks_added?: number }>(
      `/projects/${projectId}/knowledge/kb/chunks/${encodeURIComponent(docId)}`,
      body,
    );
  }

  ingestJobStatus(projectId: number, jobId: string) {
    return this.client.get<{ ok: boolean; job_id: string; status?: string }>(
      `/projects/${projectId}/knowledge/ingest/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  listContent(
    projectId: number,
    params?: {
      collection_id?: string;
      access_tier?: string;
      limit?: number;
      q?: string;
      cursor?: string;
    },
  ) {
    const qs = new URLSearchParams();
    if (params?.collection_id) qs.set('collection_id', params.collection_id);
    if (params?.access_tier) qs.set('access_tier', params.access_tier);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.q) qs.set('q', params.q);
    if (params?.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.client.get<{
      ok: boolean;
      items: KnowledgeContentItem[];
      next_cursor?: string | null;
    }>(`/projects/${projectId}/knowledge/content${suffix}`);
  }

  /** Collection read — REST GET (Core `@router.get("/content/relations")`). */
  listContentRelations(projectId: number) {
    return this.client.get<{ ok: boolean; relations: unknown[] }>(
      `/projects/${projectId}/knowledge/content/relations`,
    );
  }

  upsertContentRelation(
    projectId: number,
    body: {
      source_doc_id: string;
      target_doc_id: string;
      relation_type: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.client.post<{ ok: boolean; relation: unknown }>(
      `/projects/${projectId}/knowledge/content/relations`,
      body,
    );
  }

  listRegistry(projectId: number) {
    return this.client.get<{ ok: boolean; entries: unknown[] }>(
      `/projects/${projectId}/knowledge/registry`,
    );
  }

  upsertRegistryEntry(projectId: number, body: Record<string, unknown>) {
    return this.client.post<{ ok: boolean; entry: unknown }>(
      `/projects/${projectId}/knowledge/registry`,
      body,
    );
  }

  patchRegistryEntry(projectId: number, entryId: string, body: Record<string, unknown>) {
    return this.client.patch<{ ok: boolean; entry: unknown }>(
      `/projects/${projectId}/knowledge/registry/${encodeURIComponent(entryId)}`,
      body,
    );
  }

  deleteRegistryEntry(projectId: number, entryId: string) {
    return this.client.delete<{ ok: boolean }>(
      `/projects/${projectId}/knowledge/registry/${encodeURIComponent(entryId)}`,
    );
  }

  importRegistry(
    projectId: number,
    body: { entries?: unknown[]; csv?: string; dry_run?: boolean },
  ) {
    return this.client.post<{ ok: boolean; imported?: number; skipped?: number }>(
      `/projects/${projectId}/knowledge/registry/import`,
      body,
    );
  }

  listReviewQueue(projectId: number) {
    return this.client.get<{ ok: boolean; reviews: unknown[] }>(
      `/projects/${projectId}/knowledge/review-queue`,
    );
  }

  deleteJournalUser(projectId: number, principalUserId: number) {
    return this.client.delete<{ ok: boolean; deleted?: number }>(
      `/projects/${projectId}/knowledge/journal/user/${principalUserId}`,
    );
  }

  importZip(projectId: number, file: File | Blob) {
    const form = new FormData();
    form.append('file', file);
    return this.client.post<{ ok: boolean; imported?: Record<string, unknown> }>(
      `/projects/${projectId}/knowledge/import.zip`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }

  getPrompt(projectId: number, opts?: { agentUuid?: string }) {
    const uid = (opts?.agentUuid || '').trim();
    const qs = uid ? `?agent_uuid=${encodeURIComponent(uid)}` : '';
    return this.client.get<KnowledgePromptEnvelope>(
      `/projects/${projectId}/knowledge/prompt${qs}`,
    );
  }

  patchPrompt(projectId: number, body: Record<string, unknown>) {
    return this.client.patch<KnowledgePromptEnvelope>(
      `/projects/${projectId}/knowledge/prompt`,
      body,
    );
  }

  health(projectId: number) {
    return this.client.get<{ ok: boolean; health: Record<string, unknown> }>(
      `/projects/${projectId}/knowledge/health`,
    );
  }

  runEval(projectId: number) {
    return this.client.post<KnowledgeEvalSuite>(
      `/projects/${projectId}/knowledge/eval/run`,
      {},
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  runRetrievalEval(
    projectId: number,
    body: { collection_id: string; min_hit_rate?: number; principal_user_id?: number },
  ) {
    return this.client.post<KnowledgeRetrievalEvalResult>(
      `/projects/${projectId}/knowledge/eval/retrieval`,
      body,
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  runFullEval(
    projectId: number,
    body?: { collection_id?: string; min_hit_rate?: number; principal_user_id?: number },
  ) {
    return this.client.post<KnowledgeFullEvalResult>(
      `/projects/${projectId}/knowledge/eval/run-all`,
      body ?? {},
      {
        useAiTimeout: true,
        headers: { 'X-Request-Lane': 'ai_stream' },
      },
    );
  }

  exportJson(projectId: number) {
    return this.client.get<{ ok: boolean; bundle: Record<string, unknown> }>(
      `/projects/${projectId}/knowledge/export`,
    );
  }

  exportContextMap(projectId: number) {
    return this.client.get<{
      ok: boolean;
      relations: unknown[];
      gene_tokens: Array<{ stem?: string; doc_ids?: string[] }>;
    }>(`/projects/${projectId}/knowledge/context-map/export`);
  }

  exportZip(projectId: number) {
    return this.client.get<Blob>(`/projects/${projectId}/knowledge/export.zip`, undefined, {
      responseType: 'blob',
    });
  }

  importBundle(projectId: number, body: Record<string, unknown>) {
    return this.client.post<{ ok: boolean; imported?: Record<string, unknown> }>(
      `/projects/${projectId}/knowledge/import`,
      body,
    );
  }

  evalBaseline(projectId: number) {
    return this.client.get<{
      ok: boolean;
      baseline: { stored?: KnowledgeEvalBaselineStored } & Record<string, unknown>;
    }>(
      `/projects/${projectId}/knowledge/eval/baseline`,
    );
  }

  patchContent(
    projectId: number,
    sourceDocId: string,
    body: {
      title?: string;
      text?: string;
      access_tier?: string;
      gene_stems?: string[];
      [key: string]: unknown;
    },
    collectionId = 'knowledge_kb',
  ) {
    const qs = `?collection_id=${encodeURIComponent(collectionId)}`;
    const next: Record<string, unknown> = { ...body };
    if (next.text != null) {
      if (next.write_mode == null) next.write_mode = 'replace';
      if (next.allow_shrink == null) next.allow_shrink = true;
    } else if (next.write_mode == null) {
      next.write_mode = 'patch';
    }
    return this.client.patch<{
      ok: boolean;
      metadata?: Record<string, unknown> | null;
      text_updated?: boolean;
    }>(
      `/projects/${projectId}/knowledge/content/${encodeURIComponent(sourceDocId)}${qs}`,
      next,
    );
  }

  deleteContent(projectId: number, sourceDocId: string, collectionId = 'knowledge_kb') {
    const qs = `?collection_id=${encodeURIComponent(collectionId)}`;
    return this.client.delete<{ ok: boolean }>(
      `/projects/${projectId}/knowledge/content/${encodeURIComponent(sourceDocId)}${qs}`,
    );
  }

  resolveReview(projectId: number, turnId: string, body: { action: string; note?: string }) {
    return this.client.post<{ ok: boolean }>(
      `/projects/${projectId}/knowledge/review-queue/${encodeURIComponent(turnId)}/resolve`,
      body,
    );
  }
}
