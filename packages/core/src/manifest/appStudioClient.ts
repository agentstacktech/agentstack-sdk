/** Thin client for the App Studio REST verbs. Same paths as MCP. */

import type { AppStudioBuildStatus, AppStudioSourceFile } from './appStudio';

export interface AppStudioHttp {
  get: (url: string, query?: Record<string, string>) => Promise<{ data?: unknown }>;
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

function base(projectId: number): string {
  return `/api/ai-builder/projects/${projectId}/app-studio`;
}

function data<T>(res: { data?: unknown }): T {
  return (res.data ?? {}) as T;
}

export function createAppStudioClient(http: AppStudioHttp) {
  return {
    listSource(projectId: number) {
      return http.get(`${base(projectId)}/source`).then((res) => data<{ files?: string[] }>(res));
    },
    getSource(
      projectId: number,
      path: string,
      opts?: { view?: 'text' | 'skeleton' | 'symbol'; symbol?: string },
    ) {
      const query: Record<string, string> = { path };
      if (opts?.view) query.view = opts.view;
      if (opts?.symbol) query.symbol = opts.symbol;
      return http.get(`${base(projectId)}/source`, query).then((res) => data<AppStudioSourceFile>(res));
    },
    patchSource(
      projectId: number,
      body: {
        path: string;
        content?: string;
        replacements?: Array<{ find: string; replace: string }>;
        symbols?: Array<{ name: string; replace: string; line?: number }>;
        expected_sha256?: string;
        dry_run?: boolean;
      },
    ) {
      return http.post(`${base(projectId)}/source`, body).then((res) => data<AppStudioSourceFile>(res));
    },
    composeApply(projectId: number, blueprintId: string) {
      return http.post(`${base(projectId)}/compose`, { blueprint_id: blueprintId });
    },
    enqueueBuild(projectId: number) {
      return http.post(`${base(projectId)}/build`, {}).then((res) => data<AppStudioBuildStatus>(res));
    },
    buildStatus(projectId: number, buildUuid: string) {
      return http
        .get(`${base(projectId)}/builds/${buildUuid}`)
        .then((res) => data<AppStudioBuildStatus>(res));
    },
    buildStatusLatest(projectId: number) {
      return http
        .get(`${base(projectId)}/builds/latest`)
        .then((res) => data<AppStudioBuildStatus>(res));
    },
    publish(projectId: number, bucketId: string) {
      return http
        .post(`${base(projectId)}/publish`, { bucket_id: bucketId, branch: 'dev' })
        .then((res) => data<{ url?: string }>(res));
    },
  };
}
