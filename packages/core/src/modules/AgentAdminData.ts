/**
 * Admin Data BFF — people + DNA list + health for platform admin shell.
 *
 * Genetic tag: `sdk.platform.admin_data.gen1`
 */

import { HTTPClient } from '../client/http-client';
import { normalizeGetQueryArg } from '../client/http-client';

export interface AdminDataPeopleMeta {
  project_id: number;
  project_count: number;
  user_count: number;
  page: number;
  per_page: number;
  projects_source?: string;
  users_source?: string;
}

export interface AdminDataPeopleResponse {
  projects: AdminDataProjectRow[];
  users: AdminDataUserRow[];
  meta: AdminDataPeopleMeta;
}

/** Row shape aligned with GET /api/projects list entries. */
export interface AdminDataProjectRow {
  id?: number;
  project_id?: number;
  uuid?: string;
  name?: string;
  is_active?: boolean;
  status?: string;
  updated_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Row shape aligned with UsersRoutePage / get_project_users. */
export interface AdminDataUserRow {
  id?: number;
  user_id?: number;
  project_id?: number;
  uuid?: string;
  email?: string;
  username?: string;
  display_name?: string;
  role?: string;
  is_active?: boolean;
  avatar?: unknown;
  updated_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AdminDataDnaListParams {
  table_name?: string;
  project_id?: number;
  unified_8dna_role?: 'project' | 'user';
  exclude_blanks?: boolean;
  limit?: number;
  offset?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
  /** Card vs DNA contour. */
  contour?: 'dna' | 'card';
  /** Filter execution logs by service. */
  service_name?: string;
  /** Comma-separated leaves to keep when a row is over the byte budget. At most 16. */
  paths?: string;
}

export interface AdminDataDnaListResponse {
  table: string;
  entities: unknown[];
  total: number;
  limit: number;
  offset: number;
  /** True when admission shed served stale L1 card contour (`X-Admission-Stale: 1`). */
  admission_stale?: boolean;
}

export interface AdminDataHealthResponse {
  ok: boolean;
  projects_count: number;
  users_count: number;
  sample_projects_returned?: number;
  ecosystem_project_id?: number;
  dna_list_counts?: { project?: number; user?: number };
  projects_count_excl_showcase?: number;
  showcase_projects_count?: number;
}

export interface AdminDataSnapshotResponse {
  health: AdminDataHealthResponse;
  people_summary: {
    project_count: number;
    user_count: number;
    users_returned: number;
  };
  people?: AdminDataPeopleResponse;
  dna_list_samples: Record<string, { total: number; returned: number }>;
}

const ADMIN_GET_OPTS = { skipCache: true, skipBatching: true } as const;

function admissionStaleFromHeaders(
  headers: Record<string, string> | undefined,
): boolean {
  if (!headers) return false;
  const raw =
    headers['x-admission-stale'] ??
    headers['X-Admission-Stale'] ??
    headers['X-ADMISSION-STALE'];
  return raw === '1' || String(raw).toLowerCase() === 'true';
}

function withAdminDnaListAdmissionStale<T extends AdminDataDnaListResponse>(
  data: T,
  headers: Record<string, string> | undefined,
): T {
  if (data.admission_stale === true) {
    return data;
  }
  if (!admissionStaleFromHeaders(headers)) {
    return data;
  }
  return { ...data, admission_stale: true };
}

export class AgentAdminData {
  constructor(private readonly http: HTTPClient) {}

  async people(params?: {
    project_id?: number;
    page?: number;
    per_page?: number;
  }): Promise<AdminDataPeopleResponse> {
    const q = normalizeGetQueryArg(params ?? {});
    const res = await this.http.get<AdminDataPeopleResponse>(
      '/api/admin/data/people',
      q,
      ADMIN_GET_OPTS,
    );
    return res.data;
  }

  async dnaList(params?: AdminDataDnaListParams): Promise<AdminDataDnaListResponse> {
    const q = normalizeGetQueryArg(params ?? {});
    const res = await this.http.get<AdminDataDnaListResponse>(
      '/api/admin/data/dna-list',
      q,
      ADMIN_GET_OPTS,
    );
    return withAdminDnaListAdmissionStale(res.data, res.headers);
  }

  async health(): Promise<AdminDataHealthResponse> {
    const res = await this.http.get<AdminDataHealthResponse>(
      '/api/admin/data/health',
      undefined,
      ADMIN_GET_OPTS,
    );
    return res.data;
  }

  /** Alias for people bundle (BFF v2.1). */
  getPeopleBundle = this.people;

  async snapshot(params?: {
    project_id?: number;
    page?: number;
    per_page?: number;
  }): Promise<AdminDataSnapshotResponse> {
    const q = normalizeGetQueryArg(params ?? {});
    const res = await this.http.get<AdminDataSnapshotResponse>(
      '/api/admin/data/snapshot',
      q,
      ADMIN_GET_OPTS,
    );
    return res.data;
  }
}
