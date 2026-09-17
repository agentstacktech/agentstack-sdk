/**
 * REST helpers for project support — ``/api/support/*``.
 *
 * Genetic tag: ``sdk.support.gen1``
 */

const BASE = '/api/support';

type HttpLike = {
  get<T = unknown>(path: string, params?: unknown, opts?: unknown): Promise<{ data: T }>;
  post<T = unknown>(path: string, body?: unknown, opts?: unknown): Promise<{ data: T }>;
  put<T = unknown>(path: string, body?: unknown, opts?: unknown): Promise<{ data: T }>;
};

export type SupportProjectRolesResponse = {
  projects: Array<{ project_id: number; roles: string[] }>;
};

export type SupportEligibilityRow = {
  project_id: number;
  end_user_support_enabled: boolean;
  public_support_messenger_enabled: boolean;
  public_support_channel_id: string | null;
  public_support_channel_title: string;
};

export type SupportEligibilityPayload = { projects: SupportEligibilityRow[] };

/** TanStack key for ``GET /api/support/eligibility`` (SPA DualShell + ``useSupportEligibility``). */
export function supportEligibilityQueryKey(projectIds: number | readonly number[]) {
  const list = (Array.isArray(projectIds) ? projectIds : [projectIds]).filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0,
  );
  const key = [...new Set(list)].sort((a, b) => a - b).join(',');
  return ['support', 'eligibility', key] as const;
}

/** TanStack key for ``GET /api/support/my-thread``. */
export function supportMyThreadQueryKey(projectId: number) {
  return ['support', 'my-thread', projectId] as const;
}

/** Staff view of a user channel — ``GET /api/support/thread/:channelUserId``. */
export function supportStaffThreadQueryKey(projectId: number, channelUserId: number) {
  return ['support', 'user-app-thread', projectId, channelUserId] as const;
}

export type SupportInboxFilters = {
  status?: string;
  assignee_user_id?: number;
  limit?: number;
};

/** TanStack key for ``GET /api/support/inbox``. */
export function supportInboxQueryKey(projectId: number, filters: SupportInboxFilters = {}) {
  const status = filters.status?.trim() ?? '';
  const assignee = filters.assignee_user_id ?? '';
  const limit = filters.limit ?? '';
  return ['support', 'inbox', projectId, status, assignee, limit] as const;
}

/** Ticket status filter options (inbox UI). */
export const SUPPORT_TICKET_STATUS_FILTER_OPTIONS = [
  '',
  'open',
  'pending',
  'resolved',
  'closed',
  'reopened',
] as const;

export function eligibilityRowForProject(
  data: SupportEligibilityPayload | undefined,
  projectId: number,
): SupportEligibilityRow | undefined {
  return (data?.projects ?? []).find((p) => p.project_id === projectId);
}

/** Map ``GET /api/support/eligibility`` rows by ``project_id`` (hub picker). */
export function eligibilityRowsByProjectId(
  data: SupportEligibilityPayload | undefined,
): Map<number, SupportEligibilityRow> {
  const m = new Map<number, SupportEligibilityRow>();
  for (const row of data?.projects ?? []) {
    if (row && typeof row.project_id === 'number') {
      m.set(row.project_id, row);
    }
  }
  return m;
}

export async function supportGetMeProjectRoles(client: HttpLike) {
  const r = await client.get<SupportProjectRolesResponse>(`${BASE}/me/project-roles`);
  return r.data;
}

export async function supportGetMyThread(
  client: HttpLike,
  params: { project_id: number; since_seq?: number; limit?: number }
) {
  const r = await client.get<Record<string, unknown>>(`${BASE}/my-thread`, params);
  return r.data;
}

export async function supportPostUserMessage(
  client: HttpLike,
  body: { project_id: number; body: string; client_message_id?: string | null }
) {
  const r = await client.post<Record<string, unknown>>(`${BASE}/messages`, body);
  return r.data;
}

export async function supportGetInbox(
  client: HttpLike,
  params: { project_id: number; limit?: number; status?: string; assignee_user_id?: number }
) {
  const r = await client.get<Record<string, unknown>>(`${BASE}/inbox`, params);
  return r.data;
}

export async function supportGetConfig(client: HttpLike, params: { project_id: number }) {
  const r = await client.get<Record<string, unknown>>(`${BASE}/config`, params);
  return r.data;
}

export async function supportGetEligibility(client: HttpLike, params: { project_ids: number[] }) {
  const csv = supportEligibilityQueryKey(params.project_ids ?? [])[2];
  const r = await client.get<SupportEligibilityPayload>(`${BASE}/eligibility`, {
    project_ids: csv,
  });
  return r.data;
}

export type SupportProjectSearchResult = {
  project_id: number;
  title?: string;
  end_user_support_enabled?: boolean;
  public_support_messenger_enabled?: boolean;
  public_support_channel_id?: string | null;
  public_support_channel_title?: string;
};

export async function supportSearchProjects(
  client: HttpLike,
  params: { q?: string; limit?: number }
) {
  const r = await client.get<{ projects: SupportProjectSearchResult[] }>(`${BASE}/projects/search`, {
    q: params.q ?? '',
    limit: params.limit ?? 24,
  });
  return r.data;
}

export async function supportTransitionTicket(
  client: HttpLike,
  params: {
    project_id: number;
    channel_user_id: number;
    ticket_id: string;
    status: string;
    reason?: string;
  }
) {
  const r = await client.post<{ ticket?: Record<string, unknown> }>(
    `${BASE}/thread/${params.channel_user_id}/tickets/${encodeURIComponent(params.ticket_id)}/transition`,
    { status: params.status, reason: params.reason },
    { params: { project_id: params.project_id } }
  );
  return r.data;
}

export async function supportAssignTicket(
  client: HttpLike,
  params: {
    project_id: number;
    channel_user_id: number;
    ticket_id: string;
    assignee_user_id?: number | null;
  }
) {
  const r = await client.post<{ ticket?: Record<string, unknown> }>(
    `${BASE}/thread/${params.channel_user_id}/tickets/${encodeURIComponent(params.ticket_id)}/assign`,
    { assignee_user_id: params.assignee_user_id ?? null },
    { params: { project_id: params.project_id } }
  );
  return r.data;
}

export async function supportSetMyThreadReaction(
  client: HttpLike,
  params: { project_id: number; message_id: string; helpful: boolean }
) {
  const r = await client.post<{ message?: Record<string, unknown> }>(
    `${BASE}/my-thread/reaction`,
    { message_id: params.message_id, helpful: params.helpful },
    { params: { project_id: params.project_id } }
  );
  return r.data;
}

export async function supportRequestHuman(
  client: HttpLike,
  params: { project_id: number; ticket_id: string }
) {
  const r = await client.post<{ ticket?: Record<string, unknown> }>(
    `${BASE}/my-thread/tickets/${encodeURIComponent(params.ticket_id)}/request-human`,
    {},
    { params: { project_id: params.project_id } }
  );
  return r.data;
}

export async function supportGetStaffThread(
  client: HttpLike,
  params: {
    project_id: number;
    channel_user_id: number;
    since_seq?: number;
    limit?: number;
  }
) {
  const { channel_user_id, project_id, since_seq, limit } = params;
  const r = await client.get<Record<string, unknown>>(`${BASE}/thread/${channel_user_id}`, {
    project_id,
    since_seq,
    limit,
  });
  return r.data;
}

export async function supportPostStaffThreadMessage(
  client: HttpLike,
  params: { project_id: number; channel_user_id: number; body: string }
) {
  const { channel_user_id, project_id, body } = params;
  const r = await client.post<Record<string, unknown>>(
    `${BASE}/thread/${channel_user_id}/messages`,
    { body },
    { params: { project_id } }
  );
  return r.data;
}

export async function supportPutConfig(
  client: HttpLike,
  params: { project_id: number },
  body: { patch: Record<string, unknown> }
) {
  const r = await client.put<Record<string, unknown>>(
    `${BASE}/config`,
    body,
    { params: { project_id: params.project_id } }
  );
  return r.data;
}

/** ``GET /api/support/ai-binding/health`` — staff AI binding diagnostics. */
export async function supportGetAiBindingHealth(
  client: HttpLike,
  params: { project_id: number }
) {
  const r = await client.get<Record<string, unknown>>(`${BASE}/ai-binding/health`, {
    params: { project_id: params.project_id },
  });
  return r.data;
}
