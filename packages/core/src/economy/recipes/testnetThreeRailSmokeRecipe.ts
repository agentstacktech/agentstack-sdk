/**
 * Ops smoke across Base / BNB / Arbitrum testnet profiles (admin testnet plane).
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */

import type { AgentStackSDK } from '../../sdk';
import type { ChainProfile, ScenarioRunResult } from '../clients/testnetTypes';

export interface TestnetThreeRailSmokeRecipeParams {
  projectId?: number;
  /** Poll scenario run until terminal (default true). */
  waitForCompletion?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  signal?: AbortSignal;
}

export interface TestnetThreeRailSmokeRecipeResult {
  profiles: ChainProfile[];
  chainSurface: Awaited<ReturnType<AgentStackSDK['admin']['chainSurface']['getAdminChainSurface']>>;
  scenarioRun?: ScenarioRunResult;
}

async function pollScenarioRun(
  sdk: AgentStackSDK,
  runId: string,
  opts: { intervalMs: number; maxAttempts: number; signal?: AbortSignal },
): Promise<ScenarioRunResult> {
  let last: ScenarioRunResult = { run_id: runId, status: 'running' };
  for (let i = 0; i < opts.maxAttempts; i += 1) {
    last = await sdk.admin.testnet.getScenarioRun(runId, { signal: opts.signal });
    const status = String(last.status ?? '').toLowerCase();
    if (status !== 'running' && status !== 'pending') {
      return last;
    }
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }
  return last;
}

/**
 * Lists enabled testnet profiles, reads admin chain surface, optionally runs `grant_demo_full`.
 */
export async function testnetThreeRailSmokeRecipe(
  sdk: AgentStackSDK,
  params: TestnetThreeRailSmokeRecipeParams = {},
): Promise<TestnetThreeRailSmokeRecipeResult> {
  const profiles = await sdk.admin.testnet.listProfiles({ signal: params.signal });
  const chainSurface = await sdk.admin.chainSurface.getAdminChainSurface({
    signal: params.signal,
  });

  const enabledRails = profiles.filter((p) => p.enabled);
  if (enabledRails.length < 1) {
    return { profiles, chainSurface };
  }

  const { run_id: runId } = await sdk.admin.testnet.runScenario(
    'grant_demo_full',
    { project_id: params.projectId ?? 1 },
    { signal: params.signal },
  );

  if (params.waitForCompletion === false) {
    return { profiles, chainSurface, scenarioRun: { run_id: runId, status: 'running' } };
  }

  const scenarioRun = await pollScenarioRun(sdk, runId, {
    intervalMs: params.pollIntervalMs ?? 2000,
    maxAttempts: params.maxPollAttempts ?? 60,
    signal: params.signal,
  });

  return { profiles, chainSurface, scenarioRun };
}
