/**
 * Hosting workspace MCP helpers — sdk.hosting.gen2
 */

import type { HTTPClient } from '../client/http-client';

export type WorkspaceInitParams = {
  project_id: number;
  bucket_id?: string;
  bucket_name?: string;
  profile?: 'static' | 'node_vite' | string;
  seed_from_live?: boolean;
};

export type WorkspaceFilePutParams = {
  project_id: number;
  bucket_id?: string;
  bucket_name?: string;
  path: string;
  content?: string;
  content_base64?: string;
};

async function mcpExecute<T>(
  client: HTTPClient,
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await client.post<{ ok?: boolean; result?: T; data?: T } & T>(
    '/mcp/execute',
    { action, params },
  );
  const body = res.data as Record<string, unknown>;
  return (body?.result ?? body?.data ?? body) as T;
}

export async function initWorkspace(client: HTTPClient, params: WorkspaceInitParams) {
  return mcpExecute<Record<string, unknown>>(client, 'hosting.workspace.init', params);
}

export async function getWorkspaceMeta(
  client: HTTPClient,
  params: { project_id: number; bucket_id?: string; bucket_name?: string },
) {
  return mcpExecute<{
    workspace_initialized?: boolean;
    sources_sha?: string;
    sources_sha_truncated?: boolean;
  }>(client, 'hosting.workspace.meta', params);
}

export async function listWorkspaceFiles(
  client: HTTPClient,
  params: { project_id: number; bucket_id?: string; prefix?: string; limit?: number },
) {
  return mcpExecute<{ paths?: string[]; files?: { path: string; bytes: number }[] }>(
    client,
    'hosting.workspace.files.list',
    params,
  );
}

export async function getWorkspaceFile(
  client: HTTPClient,
  params: { project_id: number; bucket_id?: string; path: string },
) {
  return mcpExecute<{
    content?: string;
    content_base64?: string;
    encoding?: string;
    bytes?: number;
  }>(client, 'hosting.workspace.file.get', params);
}

export async function putWorkspaceFile(client: HTTPClient, params: WorkspaceFilePutParams) {
  return mcpExecute<Record<string, unknown>>(client, 'hosting.workspace.file.put', params);
}

export async function deleteWorkspaceFile(
  client: HTTPClient,
  params: { project_id: number; bucket_id?: string; bucket_name?: string; path: string },
) {
  return mcpExecute<Record<string, unknown>>(client, 'hosting.workspace.file.delete', params);
}
