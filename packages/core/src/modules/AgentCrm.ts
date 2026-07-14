/**
 * CRM SDK — genetic: ``sdk.crm.gen1``.
 *
 * REST surface: `/api/projects/{project_id}/crm/*`
 */

import { HTTPClient } from '../client/http-client';
import { parseCrmEtagRev } from './crmEtag';

export class AgentCrm {
  constructor(private client: HTTPClient) {}

  listContacts(
    projectId: number,
    params?: { page?: number; per_page?: number; q?: string; lifecycle?: string },
  ) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.q) qs.set('q', params.q);
    if (params?.lifecycle) qs.set('lifecycle', params.lifecycle);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.client.get<{ contacts: unknown[]; total: number }>(
      `/projects/${projectId}/crm/contacts${suffix}`,
    );
  }

  createContact(projectId: number, contact: Record<string, unknown>) {
    return this.client.post<{ contact: unknown }>(
      `/projects/${projectId}/crm/contacts`,
      contact,
    );
  }

  getContact360(projectId: number, contactId: string) {
    return this.client.get<{ contact: unknown; timeline: unknown[] }>(
      `/projects/${projectId}/crm/contacts/${contactId}/360`,
    );
  }

  listBoard(projectId: number, pipelineId?: string) {
    const qs = pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : '';
    return this.client.get<{ pipeline: unknown; columns: unknown[] }>(
      `/projects/${projectId}/crm/board${qs}`,
    );
  }

  createDeal(projectId: number, deal: Record<string, unknown>) {
    return this.client.post<{ deal: unknown }>(
      `/projects/${projectId}/crm/deals`,
      deal,
    );
  }

  moveDealStage(
    projectId: number,
    dealId: string,
    body: { stage_id: string; expected_rev?: number },
  ) {
    const headers: Record<string, string> = {};
    if (body.expected_rev != null) {
      headers['If-Match'] = `"${body.expected_rev}"`;
    }
    return this.client.patch<{ deal: unknown; success?: boolean }>(
      `/projects/${projectId}/crm/deals/${dealId}/stage`,
      body,
      Object.keys(headers).length ? { headers } : undefined,
    ).then((response) => {
      const etagRev = parseCrmEtagRev(response.headers);
      if (etagRev == null || !response.data?.deal || typeof response.data.deal !== 'object') {
        return response;
      }
      const deal = response.data.deal as Record<string, unknown>;
      return {
        ...response,
        data: {
          ...response.data,
          deal: { ...deal, rev: etagRev },
        },
      };
    });
  }

  getDealTimeline(projectId: number, dealId: string) {
    return this.client.get<{ deal_id: string; timeline: unknown[] }>(
      `/projects/${projectId}/crm/deals/${encodeURIComponent(dealId)}/timeline`,
    );
  }

  logActivity(projectId: number, activity: Record<string, unknown>) {
    return this.client.post<{ activity: unknown }>(
      `/projects/${projectId}/crm/activities`,
      activity,
    );
  }

  planQuickCreate(projectId: number, spec: Record<string, unknown>) {
    return this.client.post<{ plan: unknown }>(
      `/projects/${projectId}/crm/quick-create/plan`,
      spec,
    );
  }

  applyQuickCreate(projectId: number, plan: Record<string, unknown>) {
    return this.client.post<{ contact?: unknown; deal?: unknown }>(
      `/projects/${projectId}/crm/quick-create/apply`,
      { plan },
    );
  }

  magicFill(projectId: number, sourceText: string, partialAnswers?: Record<string, unknown>) {
    return this.client.post<{ answers: Record<string, unknown> }>(
      `/projects/${projectId}/crm/ai/magic-fill`,
      { source_text: sourceText, partial_answers: partialAnswers ?? {} },
    );
  }

  search(projectId: number, q: string, limit = 50) {
    return this.client.get<{ results: unknown[]; total: number }>(
      `/projects/${projectId}/crm/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
  }

  getNextActions(projectId: number, contactId: string) {
    return this.client.get<{ contact_id: string; next_actions: unknown[] }>(
      `/projects/${projectId}/crm/contacts/${encodeURIComponent(contactId)}/next-actions`,
    );
  }

  startSdrRun(projectId: number, contactId: string, prompt?: string) {
    return this.client.post<{ started: boolean; run?: unknown }>(
      `/projects/${projectId}/crm/contacts/${encodeURIComponent(contactId)}/sdr-run`,
      prompt ? { prompt } : {},
    );
  }

  importContacts(projectId: number, contacts: Record<string, unknown>[], source = 'import') {
    return this.client.post<{ created: number; updated: number; total: number }>(
      `/projects/${projectId}/crm/contacts/import`,
      { contacts, source },
    );
  }

  suggestField(projectId: number, field: string, context?: Record<string, unknown>) {
    return this.client.post<{ field: string; suggestions: unknown[] }>(
      `/projects/${projectId}/crm/ai/suggest-field`,
      { field, context: context ?? {} },
    );
  }

  listCustomFields(projectId: number) {
    return this.client.get<{ custom_fields: unknown[] }>(
      `/projects/${projectId}/crm/custom-fields`,
    );
  }

  getCustomFieldsSchema(projectId: number, tier = 'advanced') {
    return this.client.get<{ schema: Record<string, unknown> }>(
      `/projects/${projectId}/crm/custom-fields/schema?tier=${encodeURIComponent(tier)}`,
    );
  }

  updateCustomFields(projectId: number, customFields: Record<string, unknown>[]) {
    return this.client.put<{ custom_fields: unknown[] }>(
      `/projects/${projectId}/crm/custom-fields`,
      { custom_fields: customFields },
    );
  }

  mergeContacts(projectId: number, primaryId: string, duplicateId: string) {
    return this.client.post<{ contact: unknown }>(`/projects/${projectId}/crm/contacts/merge`, {
      primary_id: primaryId,
      duplicate_id: duplicateId,
    });
  }

  getCrmConfig(projectId: number) {
    return this.client.get<{ config: Record<string, unknown> }>(
      `/projects/${projectId}/crm/config`,
    );
  }

  patchCrmConfig(projectId: number, patch: Record<string, unknown>) {
    return this.client.patch<{ config: Record<string, unknown> }>(
      `/projects/${projectId}/crm/config`,
      patch,
    );
  }
}
