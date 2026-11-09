import type { HTTPClient } from '../client/http-client';
import { mcpBatchStep, unwrapFirstMcpBatchStepData } from '../mcp/batchStepData';
import { mintHostedAppSession } from '../commerce/hosted/hostedAppSession';
import { resolveHostedMcpUrl } from '../mcp/urls';
import { pollWithBackoff } from './pollBackoff';
import { matchRuntimePrefix } from './runtimePaths';
import type { createStackScriptClient } from './client';
import { createHostedStackScriptClient } from './client';

export type StackScriptClient = ReturnType<typeof createStackScriptClient>;

export type MatchPollState = {
  revision?: number;
  paths: Record<string, unknown>;
};

export type MatchClientOptions = {
  /** Operator REST bulk read (default) vs player MCP my-data (hosted). */
  readMode?: 'operator' | 'player';
  /** POST /s/{pid}/mcp instead of /mcp when readMode=player. */
  hostedMcp?: boolean;
  hostedApiBase?: string;
};

export function createStackScriptMatchClient(
  client: StackScriptClient,
  http: HTTPClient,
  projectId: number,
  options?: MatchClientOptions,
) {
  const readMode = options?.readMode ?? 'operator';

  const readMatchLeaves = async (matchId: string, leaves: string[], signal?: AbortSignal) => {
    const dotted = leaves.map((leaf) => matchRuntimePrefix(matchId, leaf));
    if (readMode === 'player') {
      const mcpPath = options?.hostedMcp
        ? resolveHostedMcpUrl(projectId, options?.hostedApiBase)
        : '/mcp';
      const hostedOpts = options?.hostedMcp
        ? { skipCache: true, signal, skipAuthStateCheck: true, cookieSessionMcp: true }
        : { skipCache: true, signal, skipAuthStateCheck: true };
      if (options?.hostedMcp && 'getAuthToken' in http) {
        const bearer = (
          http as { getAuthToken?: () => string | null }
        ).getAuthToken?.();
        if (bearer) {
          await mintHostedAppSession(projectId, bearer, {
            apiBase: options?.hostedApiBase,
          });
        }
      }
      const res = await http.post(
        mcpPath,
        options?.hostedMcp
          ? { steps: [mcpBatchStep('projects.get_my_data', { paths: dotted }, projectId)] }
          : {
              action: 'projects.get_my_data',
              params: { paths: dotted, project_id: projectId },
              context: { project_id: projectId },
            },
        hostedOpts,
      );
      const row = unwrapFirstMcpBatchStepData(res);
      const value =
        (row.value as Record<string, unknown>) ??
        (row.data as Record<string, unknown>)?.value;
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }
    const res = await http.get(
      `/api/projects/${projectId}/data`,
      { paths: dotted.join(',') },
      { skipCache: true, signal },
    );
    const body = (res as { data?: { value?: Record<string, unknown> } })?.data;
    const value = body?.value;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  const submitTurn = async (args: {
    scriptId: string;
    export: string;
    input: unknown;
    idempotencyKey: string;
    version?: string;
  }) => {
    return client.run({
      script_id: args.scriptId,
      export: args.export,
      input: args.input,
      idempotency_key: args.idempotencyKey,
      version: args.version ?? 'live',
    });
  };

  const pollMatchState = async (opts: {
    matchId: string;
    leaves: string[];
    targetRevision?: number;
    onRevision?: (rev: number) => void;
    signal?: AbortSignal;
    maxAttempts?: number;
  }): Promise<MatchPollState | null> => {
    return pollWithBackoff({
      maxAttempts: opts.maxAttempts,
      signal: opts.signal,
      attempt: async () => {
        const paths = await readMatchLeaves(opts.matchId, opts.leaves, opts.signal);
        const revKey = matchRuntimePrefix(opts.matchId, 'revision');
        const raw = paths[revKey];
        const rev = Number(raw);
        if (Number.isFinite(rev)) opts.onRevision?.(rev);
        return { revision: Number.isFinite(rev) ? rev : undefined, paths } as MatchPollState;
      },
      shouldStop: (state) => {
        const rev = state.revision;
        if (rev == null || !Number.isFinite(rev)) return false;
        if (opts.targetRevision != null) return rev >= opts.targetRevision;
        return true;
      },
    });
  };

  return { readMatchLeaves, submitTurn, pollMatchState };
}

/** Games MP — cookie MCP + player reads (GAP-07). */
export function createHostedStackScriptMatchClient(
  http: HTTPClient,
  projectId: number,
  apiBase?: string,
) {
  const client = createHostedStackScriptClient(http, projectId, { hostedApiBase: apiBase });
  return createStackScriptMatchClient(client, http, projectId, {
    readMode: 'player',
    hostedMcp: true,
    hostedApiBase: apiBase,
  });
}
