/**
 * Project-scoped storage — REST `/api/storage/*`.
 * 8DNA: member files `(project_id, user_id)`; project slice `(project_id, 0)`.
 * Pass `projectId` / `scope` or rely on SDK `X-Project-ID` from config.
 */

import { HTTPClient } from '../client/http-client';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';

export type StorageScope = 'user' | 'project';

export interface StorageQuota {
  permanent_used_bytes: number;
  temp_used_bytes: number;
  permanent_limit_bytes: number;
  temp_limit_bytes: number;
  last_recalc_at?: string | null;
  /** project_owner | acting_user | member_fallback */
  tier_basis?: string;
  quota_tier_source?: string;
  owner_user_id?: number | null;
  subscription_tier_user_id?: number | null;
  acting_user_id?: number | null;
}

export interface StorageFileCard {
  id: string;
  folder_key: string;
  fn?: string;
  orig?: string;
  sz?: number;
  mime?: string;
  cat?: string;
  ts?: string;
  sys?: boolean;
}

/** Row from ``GET /api/storage/temp`` (caller's temp blob). */
export interface StorageTempListItem {
  id: string;
  fn?: string;
  orig?: string;
  sz?: number;
  mime?: string;
  exp?: string;
  ts?: string;
  expired?: boolean;
  url?: string | null;
}

function storageQuery(opts?: {
  projectId?: number;
  scope?: StorageScope;
  extra?: Record<string, string | number | undefined>;
}): string {
  const parts: string[] = [];
  if (opts?.projectId != null) {
    parts.push(`project_id=${encodeURIComponent(String(opts.projectId))}`);
  }
  if (opts?.scope != null && opts.scope !== 'user') {
    parts.push(`scope=${encodeURIComponent(opts.scope)}`);
  }
  if (opts?.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v !== undefined && v !== null) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export class AgentStorage {
  constructor(private client: HTTPClient) {}

  async getTempMeta(
    fileId: string,
    ownerId: number,
    opts?: { projectId?: number }
  ): Promise<{
    ok: boolean;
    project_id?: number;
    owner_id?: number;
    file?: Record<string, unknown>;
  }> {
    const pid = opts?.projectId;
    const qParts: string[] = [`owner_id=${encodeURIComponent(String(ownerId))}`];
    if (pid != null) {
      qParts.push(`project_id=${encodeURIComponent(String(pid))}`);
    }
    const q = qParts.length ? `?${qParts.join('&')}` : '';
    const res = await this.client.get(`/storage/temp/${encodeURIComponent(String(fileId))}/meta${q}`);
    return res.data as {
      ok: boolean;
      project_id?: number;
      owner_id?: number;
      file?: Record<string, unknown>;
    };
  }

  async listTempFiles(opts?: {
    projectId?: number;
    scope?: StorageScope;
    includeExpired?: boolean;
  }): Promise<{
    ok: boolean;
    files: StorageTempListItem[];
    project_id?: number;
    scope?: string;
  }> {
    const extra: Record<string, string | number | undefined> = {};
    if (opts?.includeExpired) {
      extra.include_expired = 1;
    }
    const res = await this.client.get(
      `/storage/temp${storageQuery({
        projectId: opts?.projectId,
        scope: opts?.scope,
        extra: Object.keys(extra).length ? extra : undefined,
      })}`
    );
    return res.data as {
      ok: boolean;
      files: StorageTempListItem[];
      project_id?: number;
      scope?: string;
    };
  }

  async deleteTempFile(
    fileId: string,
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<{ ok: boolean; project_id?: number; scope?: string }> {
    return executeOrNotFoundFallback(
      async () => {
        const res = await this.client.delete(
          `/storage/temp/${encodeURIComponent(String(fileId))}${storageQuery({
            projectId: opts?.projectId,
            scope: opts?.scope,
          })}`
        );
        return (res.data ?? {}) as { ok: boolean; project_id?: number; scope?: string };
      },
      { ok: true, project_id: opts?.projectId, scope: opts?.scope }
    );
  }

  /** Promote a temp upload into permanent `by_folder` (dashboard / messenger). */
  async promoteTempFile(
    fileId: string,
    body: { folder?: string },
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(
      `/storage/temp/${encodeURIComponent(String(fileId))}/promote${storageQuery({
        projectId: opts?.projectId,
        scope: opts?.scope,
      })}`,
      { folder: body.folder ?? '_' }
    );
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async copyByRef(
    source: {
      owner_id: number;
      file_id: string;
      is_temp: boolean;
      folder_key?: string | null;
    },
    targetFolder: string = '_',
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(
      `/storage/copy${storageQuery({ projectId: opts?.projectId, scope: opts?.scope })}`,
      { source, target_folder: targetFolder }
    );
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async resolveBatch(
    refs: {
      owner_id: number;
      file_id: string;
      is_temp: boolean;
      folder_key?: string | null;
    }[],
    opts?: { projectId?: number }
  ): Promise<{
    ok: boolean;
    project_id?: number;
    items?: Array<Record<string, unknown>>;
  }> {
    const q = opts?.projectId != null ? `?project_id=${encodeURIComponent(String(opts.projectId))}` : '';
    const res = await this.client.post(`/storage/resolve-batch${q}`, { refs });
    return res.data as {
      ok: boolean;
      project_id?: number;
      items?: Array<Record<string, unknown>>;
    };
  }

  async getQuota(opts?: { projectId?: number; scope?: StorageScope }): Promise<{
    ok: boolean;
    quota: StorageQuota;
    project_id?: number;
    scope?: string;
  }> {
    const res = await this.client.get(`/storage/quota${storageQuery(opts)}`);
    return res.data as { ok: boolean; quota: StorageQuota; project_id?: number; scope?: string };
  }

  /**
   * Owner/admin: summed usage across all 8DNA rows + owner-tier pool cap.
   */
  async getProjectUsageSummary(opts?: { projectId?: number }): Promise<{
    ok: boolean;
    project_id?: number;
    owner_user_id?: number | null;
    project_pool_limit_bytes?: number;
    usage?: Record<string, unknown>;
  }> {
    const q = storageQuery({
      projectId: opts?.projectId,
    });
    const res = await this.client.get(`/storage/quota/project-summary${q}`);
    return res.data as {
      ok: boolean;
      project_id?: number;
      owner_user_id?: number | null;
      project_pool_limit_bytes?: number;
      usage?: Record<string, unknown>;
    };
  }

  /** Hub v4 aggregate read (`frontend.storage.hub.gen1`). */
  async getHubSummary(opts?: { projectId?: number }): Promise<Record<string, unknown>> {
    const q = storageQuery({ projectId: opts?.projectId });
    const res = await this.client.get(`/storage/ecosystem-summary${q}`);
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async listFiles(
    folder?: string,
    opts?: { projectId?: number; scope?: StorageScope; includeFolders?: boolean }
  ): Promise<{
    ok: boolean;
    files: StorageFileCard[];
    project_id?: number;
    scope?: string;
    folder_index?: string[];
  }> {
    const extra: Record<string, string | number | undefined> = {};
    if (folder !== undefined && folder !== null) {
      extra.folder = folder;
    }
    if (opts?.includeFolders) {
      extra.include_folders = 1;
    }
    const q = storageQuery({
      ...opts,
      extra: Object.keys(extra).length ? extra : undefined,
    });
    const res = await this.client.get(`/storage/files${q}`);
    return res.data as {
      ok: boolean;
      files: StorageFileCard[];
      project_id?: number;
      scope?: string;
      folder_index?: string[];
    };
  }

  async createFolder(
    segments: string[],
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(`/storage/folders${storageQuery(opts)}`, { segments });
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async moveFile(
    fileId: string,
    folderKey: string,
    newFolderKey: string,
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(
      `/storage/files/${encodeURIComponent(fileId)}/move${storageQuery({
        ...opts,
        extra: { folder_key: folderKey },
      })}`,
      { new_folder: newFolderKey }
    );
    return (res.data ?? {}) as Record<string, unknown>;
  }

  /** Ecosystem admin: browse any (project_id, dna_user_id) row */
  async adminListFiles(
    projectId: number,
    dnaUserId: number,
    folder?: string,
    includeFolders?: boolean
  ): Promise<{
    ok: boolean;
    files: StorageFileCard[];
    project_id?: number;
    dna_user_id?: number;
    folder_index?: string[];
  }> {
    const parts: string[] = [
      `project_id=${encodeURIComponent(String(projectId))}`,
      `dna_user_id=${encodeURIComponent(String(dnaUserId))}`,
    ];
    if (folder !== undefined && folder !== null) {
      parts.push(`folder=${encodeURIComponent(folder)}`);
    }
    if (includeFolders) {
      parts.push('include_folders=1');
    }
    const res = await this.client.get(`/admin/storage/files?${parts.join('&')}`);
    return res.data as {
      ok: boolean;
      files: StorageFileCard[];
      project_id?: number;
      dna_user_id?: number;
      folder_index?: string[];
    };
  }

  async adminDeleteFile(
    fileId: string,
    folderKey: string,
    projectId: number,
    dnaUserId: number
  ): Promise<Record<string, unknown>> {
    const q = `?project_id=${encodeURIComponent(String(projectId))}&dna_user_id=${encodeURIComponent(String(dnaUserId))}&folder_key=${encodeURIComponent(folderKey)}`;
    return executeOrNotFoundFallback(
      async () => {
        const res = await this.client.delete(`/admin/storage/files/${encodeURIComponent(fileId)}${q}`);
        return (res.data ?? {}) as Record<string, unknown>;
      },
      { ok: true }
    );
  }

  async adminCreateFolder(
    projectId: number,
    dnaUserId: number,
    segments: string[]
  ): Promise<Record<string, unknown>> {
    const q = `?project_id=${encodeURIComponent(String(projectId))}&dna_user_id=${encodeURIComponent(String(dnaUserId))}`;
    const res = await this.client.post(`/admin/storage/folders${q}`, { segments });
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async adminMoveFile(
    fileId: string,
    folderKey: string,
    newFolderKey: string,
    projectId: number,
    dnaUserId: number
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(
      `/admin/storage/files/${encodeURIComponent(fileId)}/move?project_id=${encodeURIComponent(String(projectId))}&dna_user_id=${encodeURIComponent(String(dnaUserId))}&folder_key=${encodeURIComponent(folderKey)}`,
      { new_folder: newFolderKey }
    );
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async adminUploadFile(
    file: File | Blob,
    options: {
      projectId: number;
      dnaUserId: number;
      folder?: string;
      filename?: string;
      category?: string;
    }
  ): Promise<Record<string, unknown>> {
    const form = new FormData();
    const name = options.filename ?? (file instanceof File ? file.name : 'upload.bin');
    form.append('file', file, name);
    form.append('project_id', String(options.projectId));
    form.append('dna_user_id', String(options.dnaUserId));
    if (options.folder) {
      form.append('folder', options.folder);
    }
    if (options.category) {
      form.append('category', options.category);
    }
    const res = await this.client.post('/admin/storage/upload', form);
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async uploadFile(
    file: File | Blob,
    options?: { folder?: string; category?: string; filename?: string; projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const form = new FormData();
    const name = options?.filename ?? (file instanceof File ? file.name : 'upload.bin');
    form.append('file', file, name);
    if (options?.folder) {
      form.append('folder', options.folder);
    }
    if (options?.category) {
      form.append('category', options.category);
    }
    if (options?.projectId != null) {
      form.append('project_id', String(options.projectId));
    }
    if (options?.scope != null && options.scope !== 'user') {
      form.append('scope', options.scope);
    }
    const res = await this.client.post('/storage/upload', form);
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async uploadTemp(
    file: File | Blob,
    ttlHours?: number,
    filename?: string,
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const form = new FormData();
    const name = filename ?? (file instanceof File ? file.name : 'upload.bin');
    form.append('file', file, name);
    if (ttlHours != null) {
      form.append('ttl_hours', String(ttlHours));
    }
    if (opts?.projectId != null) {
      form.append('project_id', String(opts.projectId));
    }
    if (opts?.scope != null && opts.scope !== 'user') {
      form.append('scope', opts.scope);
    }
    const res = await this.client.post('/storage/upload-temp', form);
    return (res.data ?? {}) as Record<string, unknown>;
  }

  async deleteFile(
    fileId: string,
    folderKey: string,
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    return executeOrNotFoundFallback(
      async () => {
        const res = await this.client.delete(
          `/storage/files/${encodeURIComponent(fileId)}${storageQuery({
            ...opts,
            extra: { folder_key: folderKey },
          })}`
        );
        return (res.data ?? {}) as Record<string, unknown>;
      },
      { ok: true }
    );
  }

  async regenerateLink(
    fileId: string,
    folderKey: string,
    opts?: { projectId?: number; scope?: StorageScope }
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post(
      `/storage/files/${encodeURIComponent(fileId)}/regenerate-link${storageQuery({
        ...opts,
        extra: { folder_key: folderKey },
      })}`,
      {}
    );
    return (res.data ?? {}) as Record<string, unknown>;
  }
}
