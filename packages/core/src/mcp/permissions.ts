/**
 * PAT / session permission simulation — wraps preflight.simulate (W8-02) with
 * permissions.effective fallback.
 * Genetic tag: frontend.fabric.capability_ui.gen1
 */

import type { McpExecuteOptions, McpExecuteResult, McpStep } from './execute';
import { mcpExecute, summarizeMcpBatchOutcome } from './execute';

export type PatSimulationL1 = {
  allowed: boolean;
  missing: string[];
  presets: string[];
};

export type PatSimulationL2 = {
  allowed: boolean;
  deny?: string | null;
  error_code?: string | null;
};

export type PatActionSimulation = {
  action: string;
  l1: PatSimulationL1;
  l2?: PatSimulationL2;
  role?: string;
  denied_reasons?: string[];
};

export type SimulatePatActionOpts = {
  projectId: number;
  action: string;
  actionParams?: Record<string, unknown>;
  pathPrefixes?: string[];
  resource?: string;
};

export type McpExecuteClient = {
  execute(
    steps: McpStep[],
    overrides?: Partial<McpExecuteOptions>,
  ): Promise<McpExecuteResult>;
};

function unwrapData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
  return data;
}

function parseSimulationPayload(raw: unknown, action: string): PatActionSimulation {
  const data = unwrapData(raw);
  const l1Raw = data.l1;
  const l2Raw = data.l2;
  const l1 =
    l1Raw && typeof l1Raw === 'object'
      ? {
          allowed: Boolean((l1Raw as Record<string, unknown>).allowed),
          missing: Array.isArray((l1Raw as Record<string, unknown>).missing)
            ? ((l1Raw as Record<string, unknown>).missing as string[])
            : [],
          presets: Array.isArray((l1Raw as Record<string, unknown>).presets)
            ? ((l1Raw as Record<string, unknown>).presets as string[])
            : [],
        }
      : { allowed: true, missing: [], presets: [] };
  const l2 =
    l2Raw && typeof l2Raw === 'object'
      ? {
          allowed: Boolean((l2Raw as Record<string, unknown>).allowed),
          deny:
            typeof (l2Raw as Record<string, unknown>).deny === 'string'
              ? ((l2Raw as Record<string, unknown>).deny as string)
              : null,
          error_code:
            typeof (l2Raw as Record<string, unknown>).error_code === 'string'
              ? ((l2Raw as Record<string, unknown>).error_code as string)
              : null,
        }
      : undefined;
  return {
    action,
    l1,
    l2,
    role: typeof data.role === 'string' ? data.role : undefined,
    denied_reasons: Array.isArray(data.denied_reasons)
      ? (data.denied_reasons as string[])
      : undefined,
  };
}

async function executeSimulateStep(
  client: McpExecuteClient,
  actionName: string,
  params: Record<string, unknown>,
  projectId: number,
): Promise<PatActionSimulation> {
  const result = await client.execute(
    [{ action: actionName, params }],
    { projectId, stopOnError: true },
  );
  const outcome = summarizeMcpBatchOutcome(result);
  if (!outcome.ok) {
    throw new Error(outcome.errorMessage || `${actionName} failed`);
  }
  const step = result.results[0];
  const payload = step?.result ?? step;
  return parseSimulationPayload(payload, String(params.action || ''));
}

/**
 * Dry-run MCP action permissions for the current session (L1 caps + L2 RBAC/FAP).
 * Offline L1 for a specific PAT row stays in frontend `effectivePatCaps.ts`.
 */
export async function simulatePatAction(
  client: McpExecuteClient,
  opts: SimulatePatActionOpts,
): Promise<PatActionSimulation> {
  const params: Record<string, unknown> = {
    project_id: opts.projectId,
    action: opts.action,
    ...(opts.actionParams ? { action_params: opts.actionParams } : {}),
    ...(opts.pathPrefixes ? { path_prefixes: opts.pathPrefixes } : {}),
    ...(opts.resource ? { resource: opts.resource } : {}),
  };

  try {
    return await executeSimulateStep(client, 'preflight.simulate', params, opts.projectId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes('unknown') && !message.includes('not found')) {
      throw err;
    }
    return await executeSimulateStep(client, 'permissions.effective', params, opts.projectId);
  }
}

/** Convenience for token/url clients without a full McpClient wrapper. */
export async function simulatePatActionWithToken(
  opts: SimulatePatActionOpts & Pick<McpExecuteOptions, 'token' | 'mcpUrl'>,
): Promise<PatActionSimulation> {
  const client: McpExecuteClient = {
    execute: (steps, overrides) =>
      mcpExecute(steps, {
        token: opts.token,
        mcpUrl: opts.mcpUrl,
        projectId: opts.projectId,
        ...overrides,
      }),
  };
  return simulatePatAction(client, opts);
}
