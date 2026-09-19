import { mcpExecute } from '../mcp/execute';
import { resolveMcpUrl } from '../mcp/urls';
import type { HTTPClient } from '../client/http-client';

async function runAction(
  http: HTTPClient,
  projectId: number,
  action: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = http.getAuthToken?.() ?? undefined;
  if (!token) throw new Error('MCP: missing auth token');
  const apiBase = http.getConfig().apiBase ?? '';
  const res = await mcpExecute([{ action, params: { project_id: projectId, ...params } }], {
    token,
    projectId,
    mcpUrl: resolveMcpUrl(apiBase),
  });
  if (!res.ok) throw new Error(res.error ?? action);
  const step = res.results?.[0];
  const raw = (step?.result ?? step?.data) as Record<string, unknown> | undefined;
  if (raw?.data && typeof raw.data === 'object') return raw.data as Record<string, unknown>;
  return (raw ?? {}) as Record<string, unknown>;
}

export class AgentChecklist {
  constructor(private readonly http: HTTPClient) {}

  get(projectId: number, entityType: string, entityId: string) {
    return runAction(this.http, projectId, 'checklist.get', {
      entity_type: entityType,
      entity_id: entityId,
    });
  }
}

export class AgentTime {
  constructor(private readonly http: HTTPClient) {}

  log(projectId: number, payload: Record<string, unknown>) {
    return runAction(this.http, projectId, 'time.log', payload);
  }

  list(projectId: number, entityId?: string) {
    return runAction(this.http, projectId, 'time.list', { entity_id: entityId });
  }
}

export class AgentGoals {
  constructor(private readonly http: HTTPClient) {}

  progress(projectId: number, month?: string) {
    return runAction(this.http, projectId, 'goals.progress', { month });
  }
}

export class AgentCalendar {
  constructor(private readonly http: HTTPClient) {}

  events(projectId: number, month?: string) {
    return runAction(this.http, projectId, 'calendar.events', { month });
  }
}
