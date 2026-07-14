/**
 * AgentNet Testnet Plane — ecosystem-admin orchestration (`/api/admin/agentnet/testnet/*`).
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import type {
  ChainProfile,
  FaucetMintBody,
  FaucetMintResult,
  RunScenarioBody,
  ScenarioRunResult,
  TestnetScenarioId,
} from './testnetTypes';

const ADMIN_TESTNET_PREFIX = '/admin/agentnet/testnet';
const ADMIN_TESTNET_OPS_KPIS = '/admin/agentnet/testnet/ops-kpis';
const FAUCET_MINT_PATH = '/admin/agentnet/faucet-mint';

export class TestnetClient {
  constructor(private readonly http: HTTPClient) {}

  async listProfiles(opts?: { signal?: AbortSignal }): Promise<ChainProfile[]> {
    const res = await this.http.get<{ profiles?: ChainProfile[] } | ChainProfile[]>(
      `${ADMIN_TESTNET_PREFIX}/profiles`,
      { skipBatching: true, signal: opts?.signal },
    );
    const data = res.data;
    if (Array.isArray(data)) return data;
    return data.profiles ?? [];
  }

  async runScenario(
    scenarioId: TestnetScenarioId | string,
    body: RunScenarioBody = {},
    opts?: { signal?: AbortSignal },
  ): Promise<{ run_id: string }> {
    const res = await this.http.post<{ run_id: string }>(
      `${ADMIN_TESTNET_PREFIX}/scenarios/${encodeURIComponent(scenarioId)}/run`,
      body,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getScenarioRun(
    runId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<ScenarioRunResult> {
    const res = await this.http.get<ScenarioRunResult>(
      `${ADMIN_TESTNET_PREFIX}/scenarios/${encodeURIComponent(runId)}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async faucetMint(
    body: FaucetMintBody,
    opts?: { signal?: AbortSignal },
  ): Promise<FaucetMintResult> {
    const res = await this.http.post<FaucetMintResult>(FAUCET_MINT_PATH, body, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getOpsKpis(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_TESTNET_OPS_KPIS}?project_id=${encodeURIComponent(String(projectId))}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data ?? {};
  }

  async listRecentRuns(
    projectId = 1,
    limit = 10,
    opts?: { signal?: AbortSignal },
  ): Promise<{ runs: Array<Record<string, unknown>>; count: number }> {
    const res = await this.http.get<{ runs?: Array<Record<string, unknown>>; count?: number }>(
      `${ADMIN_TESTNET_PREFIX}/runs/recent?project_id=${encodeURIComponent(String(projectId))}&limit=${limit}`,
      { skipBatching: true, signal: opts?.signal },
    );
    const runs = res.data?.runs ?? [];
    return { runs, count: res.data?.count ?? runs.length };
  }

  async listRecentTx(
    runId?: string,
    limit = 20,
    opts?: { signal?: AbortSignal },
  ): Promise<{ tx: Array<Record<string, unknown>>; count: number }> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (runId) qs.set('run_id', runId);
    const res = await this.http.get<{ tx?: Array<Record<string, unknown>>; count?: number }>(
      `${ADMIN_TESTNET_PREFIX}/tx/recent?${qs}`,
      { skipBatching: true, signal: opts?.signal },
    );
    const tx = res.data?.tx ?? [];
    return { tx, count: res.data?.count ?? tx.length };
  }
}
