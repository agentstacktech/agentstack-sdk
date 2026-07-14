/**
 * Static bucket hosting SDK — genetic: ``sdk.hosting.gen2``.
 */

import { HTTPClient } from '../client/http-client';
import { blobChunkSource, runResumableUpload } from '../media/resumableUpload';
import { buildHostingZipOpId } from '../media/hostingZipUploadId';
import type { APIResponse } from '../types';

export interface QuickStartBody {
  project_id: number;
  html: string;
  /** Canonical path segment — preferred over deprecated `slug`. */
  bucket_name?: string;
  /** @deprecated Use `bucket_name` for URL path; keep for vanity-only if needed. */
  slug?: string;
  visibility?: string;
  publish?: boolean;
}

export interface QuickStartResult {
  bucket_id: string;
  site_id: string;
  url: string;
  skipped?: boolean;
  edge_ready?: boolean;
  manifest_hash?: string | null;
}

/** Known hosting API `detail` codes (see docs/api/HOSTING_ERROR_CODES.md). */
export type HostingApiErrorCode =
  | 'slug_exists'
  | 'bucket_exists'
  | 'bucket_name_exists'
  | 'sites_max_reached'
  | 'site_not_found'
  | 'bucket_root_missing'
  | 'hosting_quota_exceeded'
  | 'hosting_gate_failed'
  | 'hosting_snapshot_rate_limited'
  | 'hosting_promote_rate_limited';

export interface HostingApiErrorBody {
  detail?: string | { error?: string; issues?: string[] };
  request_id?: string;
}

export interface HostingSitesListResult {
  sites: unknown[];
  quota: Record<string, number>;
  primary_site_bucket_id?: string | null;
}

export interface ProjectHostingPlaneAction {
  id: string;
  label_key: string;
  href_kind: string;
  priority: number;
}

export interface ProjectHostingPlaneV1 {
  schema_version: 1;
  project_id: number;
  ladder: Record<string, boolean>;
  sites: {
    count: number;
    public_count: number;
    primary_public_url?: string | null;
    primary_bucket_id?: string | null;
    any_edge_ready: boolean;
    any_pending_edge: boolean;
  };
  quota: Record<string, unknown>;
  apps: Record<string, unknown>;
  next_actions: ProjectHostingPlaneAction[];
  computed_at: string;
}

export interface BucketCreateBody {
  project_id: number;
  bucket_name?: string;
  slug?: string;
  visibility?: string;
  routing_mode?: string;
}

export interface BucketPatchBody {
  project_id: number;
  bucket_name?: string | null;
  slug?: string | null;
  status?: string;
  visibility?: string;
  routing_mode?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_robots?: string | null;
  seo_banner_asset_id?: string | null;
}

export interface PromoteBuildBody {
  project_id: number;
  branch?: string;
}

export class AgentHosting {
  /** Use tus-lite resumable upload for ZIPs at or above this size (GA-16). */
  static readonly RESUMABLE_ZIP_THRESHOLD_BYTES = 4 * 1024 * 1024;

  constructor(private client: HTTPClient) {}

  quickStart(body: QuickStartBody) {
    return this.client.post<QuickStartResult>('/hosting/sites/quick-start', body);
  }

  getProjectPlane(projectId: number) {
    return this.client.get<{ success: boolean; data: ProjectHostingPlaneV1 }>(
      `/projects/${projectId}/hosting-plane`,
      { skipCache: true },
    );
  }

  listSites(
    projectId: number,
    options?: { skipBatching?: boolean; skipCache?: boolean },
  ) {
    return this.client.get<HostingSitesListResult>('/hosting/sites', {
      params: { project_id: projectId },
      skipBatching: options?.skipBatching ?? true,
      skipCache: options?.skipCache ?? true,
    });
  }

  setPrimarySite(projectId: number, bucketId: string) {
    return this.client.put<{ ok: boolean; primary_site_bucket_id?: string | null }>(
      '/hosting/primary-site',
      { project_id: projectId, bucket_id: bucketId },
    );
  }

  getQuota(projectId: number) {
    return this.client.get<Record<string, number>>('/hosting/quota', {
      params: { project_id: projectId },
    });
  }

  createBucket(body: BucketCreateBody) {
    return this.client.post<{ bucket_id: string; site: unknown }>('/hosting/buckets', body);
  }

  patchBucket(bucketId: string, body: BucketPatchBody) {
    return this.client.patch<{ site: unknown }>(`/hosting/buckets/${bucketId}`, body);
  }

  deleteBucket(bucketId: string, projectId: number, purge = false) {
    return this.client.delete<{ ok: boolean; purged: boolean }>(
      `/hosting/buckets/${bucketId}`,
      { params: { project_id: projectId, purge } },
    );
  }

  edgeHealth(projectId: number, bucketId: string) {
    return this.client.get<Record<string, unknown>>(
      `/hosting/buckets/${bucketId}/edge-health`,
      { params: { project_id: projectId }, skipCache: true },
    );
  }

  edgeHealthProject(projectId: number) {
    return this.client.get<{
      project_id: number;
      sites: Record<string, unknown>[];
      unhealthy_count: number;
      unhealthy: Record<string, unknown>[];
    }>(`/hosting/edge-health`, { params: { project_id: projectId }, skipCache: true });
  }

  publishBucket(bucketId: string, projectId: number) {
    return this.client.post<{
      url: string;
      skipped: boolean;
      manifest_hash?: string;
      edge_ready?: boolean;
      live_url_ready?: boolean;
      edge?: Record<string, unknown>;
    }>(`/hosting/buckets/${bucketId}/publish`, { project_id: projectId });
  }

  previewPublish(bucketId: string, projectId: number) {
    return this.client.post<{
      preview_url: string;
      preview_bucket_id: string;
      manifest_hash: string;
      edge_ready?: boolean;
      preview_url_ready?: boolean;
      edge?: Record<string, unknown>;
    }>(`/hosting/buckets/${bucketId}/preview-publish`, { project_id: projectId });
  }

  putFilesBatch(
    projectId: number,
    bucketId: string,
    files: { path: string; content?: string; content_base64?: string }[],
  ) {
    return this.client.post<{ paths: string[]; bytes: number; files_written: number }>(
      `/hosting/buckets/${bucketId}/files/batch`,
      { project_id: projectId, files },
    );
  }

  /**
   * Deploy static files then optionally publish (UI orchestrator parity).
   * Chunk to 50 files per `putFilesBatch` call when needed.
   */
  async deploySiteFiles(
    projectId: number,
    bucketId: string,
    files: { path: string; content?: string; content_base64?: string }[],
    options?: { publish?: boolean },
  ) {
    const batch = await this.putFilesBatch(projectId, bucketId, files);
    if (options?.publish === false) {
      return { upload: batch.data, publish: undefined };
    }
    const pub = await this.publishBucket(bucketId, projectId);
    return { upload: batch.data, publish: pub.data };
  }

  promoteBuild(bucketId: string, body: PromoteBuildBody) {
    return this.client.post<{
      bytes_copied: number;
      url: string;
      skipped: boolean;
      manifest_hash?: string;
    }>(`/hosting/buckets/${bucketId}/promote-build`, body);
  }

  nameAvailable(
    projectId: number,
    name: string,
    excludeBucketId?: string,
  ) {
    return this.client.get<{ available: boolean; reason?: string }>(
      '/hosting/name-available',
      {
        params: {
          project_id: projectId,
          name,
          ...(excludeBucketId ? { exclude_bucket_id: excludeBucketId } : {}),
        },
      },
    );
  }

  slugAvailable(
    projectId: number,
    slug: string,
    excludeBucketId?: string,
  ) {
    return this.nameAvailable(projectId, slug, excludeBucketId);
  }

  listFiles(
    projectId: number,
    bucketId: string,
    options?: { prefix?: string; limit?: number; cursor?: string },
  ) {
    return this.client.get<{
      files: { path: string; bytes: number }[];
      next_cursor?: string | null;
      total?: number;
    }>(`/hosting/buckets/${bucketId}/files`, {
      params: {
        project_id: projectId,
        ...(options?.prefix ? { prefix: options.prefix } : {}),
        ...(options?.limit != null ? { limit: options.limit } : {}),
        ...(options?.cursor ? { cursor: options.cursor } : {}),
      },
    });
  }

  getFile(projectId: number, bucketId: string, path: string) {
    return this.client.get<{
      path: string;
      bytes: number;
      encoding: string;
      content?: string;
      content_base64?: string;
    }>(`/hosting/buckets/${bucketId}/files/${path}`, {
      params: { project_id: projectId },
      skipCache: true,
    });
  }

  renameFile(
    projectId: number,
    bucketId: string,
    path: string,
    destPath: string,
  ) {
    return this.client.patch<{ from: string; to: string }>(
      `/hosting/buckets/${bucketId}/files/${path}`,
      { project_id: projectId, dest_path: destPath },
    );
  }

  mkdir(projectId: number, bucketId: string, path: string) {
    return this.client.post<{ path: string; marker: string }>(
      `/hosting/buckets/${bucketId}/files/mkdir`,
      { project_id: projectId, path },
    );
  }

  copyFile(
    projectId: number,
    bucketId: string,
    srcPath: string,
    destPath: string,
  ) {
    return this.client.post<{ from: string; to: string; bytes: number }>(
      `/hosting/buckets/${bucketId}/files/copy`,
      { project_id: projectId, src_path: srcPath, dest_path: destPath },
    );
  }

  bulkDeleteFiles(
    projectId: number,
    bucketId: string,
    body: { paths?: string[]; prefix?: string },
  ) {
    return this.client.post<{ deleted: string[]; count: number }>(
      `/hosting/buckets/${bucketId}/files/bulk-delete`,
      { project_id: projectId, ...body },
    );
  }

  putPage(projectId: number, bucketId: string, path: string, content: string) {
    return this.client.put<{ path: string; bytes: number }>(
      `/hosting/buckets/${bucketId}/files/${path}`,
      content,
      {
        params: { project_id: projectId },
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  deleteFile(projectId: number, bucketId: string, path: string) {
    return this.client.delete<{ ok?: boolean }>(
      `/hosting/buckets/${bucketId}/files/${path}`,
      { params: { project_id: projectId } },
    );
  }

  createSnapshot(
    bucketId: string,
    body: { project_id: number; label?: string; force?: boolean },
  ) {
    return this.client.post<{ release: Record<string, unknown> }>(
      `/hosting/buckets/${bucketId}/snapshots`,
      body,
    );
  }

  listReleases(
    bucketId: string,
    projectId: number,
    params?: { cursor?: number; limit?: number },
  ) {
    return this.client.get<{ releases: unknown[]; next_cursor?: number | null }>(
      `/hosting/buckets/${bucketId}/releases`,
      { params: { project_id: projectId, ...params } },
    );
  }

  getRelease(releaseUuid: string, projectId: number) {
    return this.client.get<{ release: Record<string, unknown> }>(
      `/hosting/releases/${releaseUuid}`,
      { params: { project_id: projectId } },
    );
  }

  patchRelease(
    releaseUuid: string,
    body: { project_id: number; label?: string; pinned?: boolean },
  ) {
    return this.client.patch<{ release: Record<string, unknown> }>(
      `/hosting/releases/${releaseUuid}`,
      body,
    );
  }

  deleteRelease(releaseUuid: string, projectId: number, purge = false) {
    return this.client.delete<{ ok: boolean; purged: boolean }>(
      `/hosting/releases/${releaseUuid}`,
      { params: { project_id: projectId, purge } },
    );
  }

  promoteRelease(releaseUuid: string, body: { project_id: number }) {
    return this.client.post<{
      url: string;
      skipped: boolean;
      manifest_hash?: string;
      edge_ready?: boolean;
      live_url_ready?: boolean;
      edge?: Record<string, unknown>;
    }>(`/hosting/releases/${releaseUuid}/promote`, body);
  }

  cloneSiteFromRelease(
    releaseUuid: string,
    body: { project_id: number; bucket_name?: string; visibility?: string },
  ) {
    return this.client.post<{ site: unknown; bucket_id: string; release: unknown }>(
      `/hosting/releases/${releaseUuid}/clone-site`,
      body,
    );
  }

  compareRelease(releaseUuid: string, projectId: number) {
    return this.client.get<{
      same_hash: boolean;
      live_hash: string;
      release_hash: string;
    }>(`/hosting/releases/${releaseUuid}/compare`, {
      params: { project_id: projectId },
    });
  }

  importStorageFolder(
    bucketId: string,
    body: { project_id: number; folder_id: string },
  ) {
    return this.client.post<{ ok: boolean; files_copied: number; bytes_copied: number }>(
      `/hosting/buckets/${bucketId}/import-storage`,
      body,
    );
  }

  /**
   * Multipart ZIP import into an existing bucket.
   * Uses FormData (not JSON) — documented exception to JSON-only hygiene.
   * Files ≥ {@link AgentHosting.RESUMABLE_ZIP_THRESHOLD_BYTES} use tus-lite resumable upload.
   */
  async importZip(
    projectId: number,
    bucketId: string,
    file: File,
    options?: { signal?: AbortSignal; onProgress?: (uploaded: number, total: number) => void },
  ): Promise<APIResponse<{ files_written: number; bytes?: number }>> {
    if (file.size >= AgentHosting.RESUMABLE_ZIP_THRESHOLD_BYTES) {
      return this.importZipResumable(projectId, bucketId, file, options);
    }
    const form = new FormData();
    form.append('file', file);
    return this.client.post<{ files_written: number; bytes?: number }>(
      `/hosting/buckets/${bucketId}/import-zip`,
      form,
      {
        params: { project_id: projectId },
        skipBatching: true,
        skipCache: true,
        signal: options?.signal,
      },
    );
  }

  private async importZipResumable(
    projectId: number,
    bucketId: string,
    file: File,
    options?: { signal?: AbortSignal; onProgress?: (uploaded: number, total: number) => void },
  ): Promise<APIResponse<{ files_written: number; bytes?: number }>> {
    const cfg = this.client.getConfig();
    const apiOrigin = (cfg.apiBase || cfg.baseUrl || '')
      .replace(/\/+$/, '')
      .replace(/\/api\/?$/, '');
    const headers = this.client.buildFetchHeaders({}, `/hosting/buckets/${bucketId}/import-zip`);
    const opId = buildHostingZipOpId(projectId, bucketId, file);
    const result = await runResumableUpload(
      {
        opId,
        mime: file.type || 'application/zip',
        name: file.name || 'site.zip',
        source: blobChunkSource(file),
        target: { target: 'hosting', projectId, bucketId },
      },
      {
        baseUrl: apiOrigin,
        authHeader: headers.Authorization,
        headers,
        signal: options?.signal,
        onProgress: options?.onProgress,
      },
    );
    const payload = result.response;
    return {
      data: {
        files_written: Number(payload.files_written ?? 0),
        bytes: payload.bytes != null ? Number(payload.bytes) : undefined,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'PATCH', url: `/api/files/resumable/${opId}` },
      duration: result.elapsedMs,
      timestamp: Date.now(),
    };
  }
}
