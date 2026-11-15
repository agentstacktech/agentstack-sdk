/**
 * Optional ladder: balance peek → provider preflight → agents.run (no debit logic here).
 * Genetic tag: sdk.energy.gen1 · core.agents.fleet.gen1
 */

import type { AgentStackSDK } from '../sdk';
import { builderEnergyMeetsMinimum } from '../energy/energyPeek';
import type { EnergyBalance } from '../energy/types';

export class EnergyInsufficientError extends Error {
  readonly code = 'energy_denied' as const;

  constructor(
    readonly balance: { current?: number; daily_pool?: number },
    message = 'Insufficient builder_energy',
  ) {
    super(message);
    this.name = 'EnergyInsufficientError';
  }
}

export class ProviderPreflightBlockedError extends Error {
  readonly code = 'provider_preflight_blocked' as const;

  constructor(
    readonly detail: Record<string, unknown>,
    message = 'LLM provider preflight blocked enqueue',
  ) {
    super(message);
    this.name = 'ProviderPreflightBlockedError';
  }
}

export function preflightPayloadBlocksEnqueue(data: Record<string, unknown>): boolean {
  const usable = data.usable;
  const usableBool = data.usable_bool;
  if (usable === false || usableBool === false) return true;
  if (data.quota_status === 'exceeded') return true;
  const usableTrue = usable === true || usableBool === true;
  if (!usableTrue && data.preflight_required !== false) return true;
  return false;
}

export type RunWithEnergyPreflightOpts = {
  projectId: number;
  agentId: string;
  input?: Record<string, unknown>;
  /** Explicit floor from caller (e.g. peek reserve). */
  minEnergy?: number;
  /** AgentSpec ``energy.per_run_estimate`` — merged with minEnergy like backend ``preflight_energy_units``. */
  perRunEstimate?: number;
  preflight?: boolean;
  wait?: boolean;
  idempotencyKey?: string;
};

/** Mirrors ``shared.atoms.agent_energy_guard.preflight_energy_units`` without token heuristic. */
export function resolveEnergyPeekMinimum(opts: {
  minEnergy?: number;
  perRunEstimate?: number;
}): number {
  const min = Math.max(0, Number(opts.minEnergy ?? 0));
  const perRun = Math.max(0, Number(opts.perRunEstimate ?? 0));
  return perRun > 0 ? Math.max(perRun, min) : min;
}

export async function runWithEnergyPreflight(
  client: AgentStackSDK,
  opts: RunWithEnergyPreflightOpts,
): Promise<Record<string, unknown>> {
  const fleet = client.agentsFleet.forProject(opts.projectId);
  const min = resolveEnergyPeekMinimum(opts);
  if (min > 0 && client.energy) {
    const bal = (await client.energy.getBalance({
      projectId: opts.projectId,
    })) as EnergyBalance;
    if (!builderEnergyMeetsMinimum(bal, min)) {
      throw new EnergyInsufficientError({
        current: bal.current,
        daily_pool: bal.daily_pool,
      });
    }
  }
  if (opts.preflight && client.mcp) {
    const batch = await client.mcp.execute(
      [
        {
          id: 'preflight',
          action: 'agents.provider_preflight',
          params: { project_id: opts.projectId, agent_id: opts.agentId },
        },
      ],
      { projectId: opts.projectId, stopOnError: true },
    );
    if (!batch.ok) {
      throw new ProviderPreflightBlockedError(
        { batch_error: batch.error, error_code: batch.error_code },
        batch.error ?? 'agents.provider_preflight batch failed',
      );
    }
    const step = batch.results?.find(
      (r) => r.id === 'preflight' || (r as { action?: string }).action === 'agents.provider_preflight',
    );
    const payload =
      (step?.result && typeof step.result === 'object' ? step.result : step) as Record<string, unknown>;
    const data =
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : payload;
    if (preflightPayloadBlocksEnqueue(data)) {
      throw new ProviderPreflightBlockedError(data);
    }
  }
  return fleet.startRun(opts.agentId, {
    input: opts.input ?? {},
    wait: opts.wait,
    idempotencyKey: opts.idempotencyKey,
  }) as Promise<Record<string, unknown>>;
}
