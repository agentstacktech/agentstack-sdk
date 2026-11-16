/**
 * Unified agent byte deliver — sdk.hosting.gen2 (W6-AF-02).
 */

import type { AgentHosting, HostingImportArchiveResponse } from '../modules/AgentHosting';
import type { AgentStorage } from '../modules/AgentStorage';

export type AgentFileDeliverIntent =
  | { kind: 'site_zip_blob'; file: Blob | File }
  | { kind: 'site_zip_url'; url: string }
  | { kind: 'site_zip_base64'; content_base64: string }
  | { kind: 'storage_blob'; folder: string; filename: string; file: Blob | File };

export type AgentFileDeliverOptions = {
  project_id: number;
  bucket_id?: string;
  bucket_name?: string;
  publish?: boolean;
  mode?: 'merge' | 'replace';
  confirm_site_replace?: boolean;
  confirm_prune?: boolean;
  strip?: 'auto' | 'off';
  dry_run?: boolean;
  async?: boolean;
};

export type AgentDeliverReceipt = HostingImportArchiveResponse & {
  delivery: 'grant' | 'import_archive' | 'storage_upload';
};

async function parseGrantResponse(res: Response): Promise<HostingImportArchiveResponse> {
  const text = await res.text();
  if (!text.trim()) {
    return { success: res.ok };
  }
  try {
    return JSON.parse(text) as HostingImportArchiveResponse;
  } catch {
    return { success: res.ok, message: text.slice(0, 200) };
  }
}

/**
 * Route agent file intents to existing hosting/storage SDK surfaces (no third upload API).
 */
export async function agentFileDeliver(
  hosting: AgentHosting,
  storage: AgentStorage,
  intent: AgentFileDeliverIntent,
  opts: AgentFileDeliverOptions,
): Promise<AgentDeliverReceipt> {
  const projectId = opts.project_id;
  const bucketId = String(opts.bucket_id ?? '').trim();
  if (intent.kind === 'storage_blob') {
    const up = await storage.uploadFile(intent.file, {
      folder: intent.folder,
      filename: intent.filename,
      projectId,
    });
    return {
      delivery: 'storage_upload',
      success: true,
      ...up,
    };
  }
  if (!bucketId) {
    throw new Error('agentFileDeliver requires bucket_id for site ZIP intents');
  }
  type ImportArchiveBody = Parameters<AgentHosting['importArchive']>[2];
  const archiveBody: ImportArchiveBody = {
    project_id: projectId,
    mode: opts.mode,
    strip: opts.strip,
    publish: opts.publish,
    confirm_site_replace: opts.confirm_site_replace,
    confirm_prune: opts.confirm_prune,
    dry_run: opts.dry_run,
  };
  if (intent.kind === 'site_zip_blob') {
    const res = await hosting.deliverSiteZip(projectId, bucketId, intent.file, {
      bucket_name: opts.bucket_name,
      mode: opts.mode,
      strip: opts.strip,
      publish: opts.publish,
      confirm_site_replace: opts.confirm_site_replace,
      confirm_prune: opts.confirm_prune,
    });
    const data = await parseGrantResponse(res);
    return { delivery: 'grant', ...data };
  }
  if (intent.kind === 'site_zip_url') {
    const body: ImportArchiveBody = { ...archiveBody, source_url: intent.url };
    const res = await hosting.importArchive(projectId, bucketId, body);
    return { delivery: 'import_archive', ...(res.data ?? {}) };
  }
  const body: ImportArchiveBody = {
    ...archiveBody,
    content_base64: intent.content_base64,
  };
  const res = await hosting.importArchive(projectId, bucketId, body);
  return { delivery: 'import_archive', ...(res.data ?? {}) };
}