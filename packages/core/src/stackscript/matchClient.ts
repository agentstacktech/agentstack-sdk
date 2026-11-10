import type { HTTPClient } from '../client/http-client';
import { unwrapFirstMcpBatchStepData } from '../mcp/batchStepData';
import { executeHostedMcpSteps } from '../commerce/hosted/executeHostedMcpSteps';
import { pollWithBackoff } from './pollBackoff';
import { matchRuntimePrefix } from './runtimePaths';
import type { createStackScriptClient } from './client';
import { createHostedStackScriptClient } from './client';

export type StackScriptClient = ReturnType<typeof createStackScriptClient>;

export type MatchPollState = {
  revision?: number;
  paths: Record<string, unknown>;
};

export function buildMatchTurnIdempotencyKey(
  matchId: string,
  revision: number,
  principalId: string,
  exportName: string,
): string {
  return `${matchId}:${revision}:${principalId}:${exportName}`;
}

export type MatchClientOptions = {
  /**
   * Operator REST bulk read (default) vs player MCP my-data (hosted).
   * Shared game journal leaves (`config.games.*`) → `@agentstack/sdk/commerce/hosted`
   * `readHostedProjectLeaf`, not match runtime poll.
   */
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
      const row = options?.hostedMcp
        ? await executeHostedMcpSteps(
            http,
            projectId,
            [
              {
                id: 'step_0',
                action: 'projects.get_my_data',
                params: { paths: dotted },
              },
            ],
            {
              pickStepId: 'step_0',
              hostedApiBase: options?.hostedApiBase,
              signal,
            },
          )
        : unwrapFirstMcpBatchStepData(
            await http.post(
              '/mcp',
              {
                action: 'projects.get_my_data',
                params: { paths: dotted, project_id: projectId },
                context: { project_id: projectId },
              },
              { skipCache: true, signal, skipAuthStateCheck: true },
            ),
          );
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
    input?: Record<string, unknown> | unknown[];
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
