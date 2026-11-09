/**
 * Chunked hosting.deploy_files + hosting.sync.commit — sdk.hosting.gen2
 */

import type { HTTPClient } from '../client/http-client';
import { commitHostingSync } from './deploySyncPlan';

const DEPLOY_FILES_ACTION = 'hosting.deploy_files';
const BATCH_LIMIT = 50;

export type DeployHostingFileRow = {
  path: string;
  content?: string;
  content_base64?: string;
};

async function mcpExecute<T>(
  client: HTTPClient,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await client.post<Record<string, unknown>>('/mcp/execute', { action, params });
  return res.data as T;
}

/** Upload files in ≤50-file chunks, then finalize staging via sync.commit. */
export async function deployHostingFilesSession(
  client: HTTPClient,
  params: {
    project_id: number;
    bucket_id?: string;
    bucket_name?: string;
    files: readonly DeployHostingFileRow[];
    publish?: boolean;
  },
) {
  const { files, project_id, bucket_id, bucket_name, publish = true } = params;
  if (!files.length) {
    throw new Error('deployHostingFilesSession: files list is empty');
  }
  let uploadSessionId: string | undefined;
  for (let offset = 0; offset < files.length; offset += BATCH_LIMIT) {
    const chunk = files.slice(offset, offset + BATCH_LIMIT);
    const raw = await mcpExecute<Record<string, unknown>>(client, DEPLOY_FILES_ACTION, {
      project_id,
      bucket_id,
      bucket_name,
      files: chunk,
      publish: false,
      upload_session_id: uploadSessionId,
      finalize: false,
    });
    const next = String(raw.upload_session_id || '').trim();
    if (next) uploadSessionId = next;
  }
  if (!uploadSessionId) {
    throw new Error('deployHostingFilesSession: missing upload_session_id from deploy_files');
  }
  return commitHostingSync(client, {
    project_id,
    bucket_id,
    upload_session_id: uploadSessionId,
    publish,
  });
}
