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
}

export interface AdminDataDnaListResponse {
  table: string;
  entities: unknown[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminDataHealthResponse {
  ok: boolean;
  projects_count: number;
  users_count: number;
  sample_projects_returned?: number;
  ecosystem_project_id?: number;
  dna_list_counts?: { project?: number; user?: number };
}

export interface AdminDataSnapshotResponse {
  health: AdminDataHealthResponse;
  people_summary: {
    project_count: number;
    user_count: number;
    users_returned: number;
  };
  dna_list_samples: Record<string, { total: number; returned: number }>;
}

const ADMIN_GET_OPTS = { skipCache: true, skipBatching: true } as const;

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
    return res.data;
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
