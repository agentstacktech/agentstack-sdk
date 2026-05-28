/**
 * AgentNet L0 ledger HTTP client (`/api/agentnet/*`).
 *
 * Gene: `sdk.economy.gen1` / `core.economy.agentnet.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import { buildExplorerUrl as buildAgentNetExplorerUrl } from '../agentnetExplorer';
import { ECONOMY_READ, ECONOMY_WRITE } from '../http/economyHttpOpts';
import { readLedgerSeq } from '../http/ledgerSeq';
import type {
  AgentCoinBalancePayload,
  AgentCoinBatchProofPayload,
  AgentCoinPostBatchBody,
} from './ledgerTypes';

export type {
  AgentCoinLedgerLine,
  AgentCoinPostBatchBody,
  AgentCoinBalancePayload,
  AgentCoinProofStep,
  AgentCoinBatchProofEntry,
  AgentCoinBatchProofLeg,
  AgentCoinBatchProofPayload,
} from './ledgerTypes';

export class LedgerClient {
  constructor(protected readonly http: HTTPClient) {}

  /** @requiresCap agentnet | payments */
  async getBalance(
    projectId: number,
    params: { accountKey: string; assetCode?: string },
  ): Promise<AgentCoinBalancePayload> {
    const asset = params.assetCode ?? 'AGNT';
    const res = await this.http.get<{
      balance_atomic: number;
      asset_code: string;
      account_key: string;
      project_id: number;
    }>(`/agentnet/${projectId}/balance`, {
      params: { account_key: params.accountKey, asset_code: asset },
      ...ECONOMY_READ,
    });
    const seq = readLedgerSeq(res.headers);
    return { ...res.data, ...(seq != null ? { ledger_seq: seq } : {}) };
  }

  /** @requiresCap agentcoin_post | project_admin */
  async postBatch(projectId: number, body: AgentCoinPostBatchBody): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/batches`,
      body,
      ECONOMY_WRITE,
    );
    const seq = readLedgerSeq(res.headers);
    return { ...res.data, ...(seq != null ? { ledger_seq: seq } : {}) };
  }

  async listBatches(
    projectId: number,
    params?: { limit?: number; before_id?: number },
  ): Promise<{ project_id: number; batches: Record<string, unknown>[] }> {
    const res = await this.http.get<{ project_id: number; batches: Record<string, unknown>[] }>(
      `/agentnet/${projectId}/batches`,
      {
        params: { limit: params?.limit, before_id: params?.before_id },
        ...ECONOMY_READ,
      },
    );
    return res.data;
  }

  async listAccounts(
    projectId: number,
    params?: { limit?: number },
  ): Promise<{ project_id: number; accounts: Record<string, unknown>[] }> {
    const res = await this.http.get<{ project_id: number; accounts: Record<string, unknown>[] }>(
      `/agentnet/${projectId}/accounts`,
      { params: { limit: params?.limit }, ...ECONOMY_READ },
    );
    return res.data;
  }

  async getBatchProof(
    projectId: number,
    batchId: number,
    params?: { entrySortIndex?: number; includeCheckpoint?: boolean },
  ): Promise<AgentCoinBatchProofPayload> {
    const res = await this.http.get<AgentCoinBatchProofPayload>(
      `/agentnet/${projectId}/batches/${batchId}/proof`,
      {
        params:
          params?.entrySortIndex != null || params?.includeCheckpoint != null
            ? {
                entry_sort_index: params?.entrySortIndex,
                include_checkpoint: params?.includeCheckpoint ? true : undefined,
              }
            : undefined,
        ...ECONOMY_READ,
      },
    );
    return res.data;
  }

  async quoteComputeCredits(
    projectId: number,
    body: { buyer_user_id: number; credits_atomic: number; demo_intent_id?: string },
  ): Promise<{ project_id: number; quote: Record<string, unknown> }> {
    const res = await this.http.post<{ project_id: number; quote: Record<string, unknown> }>(
      `/agentnet/${projectId}/compute-credits/quote`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async purchaseComputeCredits(
    projectId: number,
    body: {
      buyer_user_id: number;
      credits_atomic: number;
      idempotency_key: string;
      quote_id: string;
      quote_hash?: string;
      max_agnt_atomic?: number;
      trace_id?: string;
      demo_intent_id?: string;
      include_proof?: boolean;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/compute-credits/purchase`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async listBridgeIntents(
    projectId: number,
    params?: { limit?: number },
  ): Promise<{ project_id: number; intents: Record<string, unknown>[] }> {
    const res = await this.http.get<{ project_id: number; intents: Record<string, unknown>[] }>(
      `/agentnet/${projectId}/bridge/intents`,
      { params: { limit: params?.limit }, ...ECONOMY_READ },
    );
    return res.data;
  }

  async listBridgeEvents(
    projectId: number,
    params?: { chain_id?: number; limit?: number },
  ): Promise<{ project_id: number; events: Record<string, unknown>[] }> {
    const res = await this.http.get<{ project_id: number; events: Record<string, unknown>[] }>(
      `/agentnet/${projectId}/bridge/events`,
      {
        params: { chain_id: params?.chain_id, limit: params?.limit },
        ...ECONOMY_READ,
      },
    );
    return res.data;
  }

  async getBridgeSupplySnapshot(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/agentnet/${projectId}/bridge/supply-snapshot`,
      ECONOMY_READ,
    );
    return res.data;
  }

  async getCheckpointCoveringBatch(
    projectId: number,
    batchId: number,
  ): Promise<{ project_id: number; checkpoint: Record<string, unknown> }> {
    const res = await this.http.get<{ project_id: number; checkpoint: Record<string, unknown> }>(
      `/agentnet/${projectId}/checkpoints/covering-batch/${batchId}`,
      ECONOMY_READ,
    );
    return res.data;
  }

  async listRecentCheckpoints(
    projectId: number,
    params?: { limit?: number },
  ): Promise<{ project_id: number; checkpoints: Record<string, unknown>[] }> {
    const res = await this.http.get<{ project_id: number; checkpoints: Record<string, unknown>[] }>(
      `/agentnet/${projectId}/checkpoints/recent`,
      { params: { limit: params?.limit }, ...ECONOMY_READ },
    );
    return res.data;
  }

  async getCheckpointByEpoch(
    projectId: number,
    epoch: number,
  ): Promise<{ project_id: number; checkpoint: Record<string, unknown> }> {
    const res = await this.http.get<{ project_id: number; checkpoint: Record<string, unknown> }>(
      `/agentnet/${projectId}/checkpoints/by-epoch/${epoch}`,
      ECONOMY_READ,
    );
    return res.data;
  }

  async verifyReceipt(
    projectId: number,
    body: {
      receipt: Record<string, unknown>;
      declared_hash?: string;
      anchor_claim?: Record<string, unknown>;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/receipts/verify`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async getEvidenceReceipt(
    projectId: number,
    batchId: number,
    params?: { traceId?: string },
  ): Promise<{ project_id: number; evidence: Record<string, unknown> }> {
    const res = await this.http.get<{ project_id: number; evidence: Record<string, unknown> }>(
      `/agentnet/${projectId}/batches/${batchId}/evidence-receipt`,
      {
        params: params?.traceId != null ? { trace_id: params.traceId } : undefined,
        ...ECONOMY_READ,
      },
    );
    return res.data;
  }

  /** @requiresCap agentcoin_post | project_admin */
  async publishPendingCheckpoints(
    projectId: number,
    body?: { prefer_evm?: boolean; limit?: number },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/checkpoints/publish-pending`,
      body ?? {},
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async getVaultNav(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/agentnet/${projectId}/vault/nav`,
      ECONOMY_READ,
    );
    return res.data;
  }

  async confirmVaultDeposit(
    projectId: number,
    body: {
      user_id: number;
      shares_atomic: number;
      underlying_usdt_atomic: number;
      idempotency_key: string;
      bridge_intent_id?: string;
      tx_hash?: string;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/vault/deposit-confirm`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async createBridgeIntent(
    projectId: number,
    body: {
      direction: 'in' | 'out';
      chain_id: number;
      amount_atomic: number;
      asset_code?: string;
      dest_address?: string;
      user_id?: number;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/bridge/intents`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async finalizeBridgeIn(
    projectId: number,
    body: { intent_id: number; user_id: number; tx_hash?: string },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/bridge/finalize-in`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async finalizeBridgeOut(
    projectId: number,
    body: { intent_id: number; user_id: number; merkle_root: string; epoch: number },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/bridge/finalize-out`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async getFundingOffer(projectId: number, paymentId: string): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/agentnet/${projectId}/funding/offer`,
      { payment_id: paymentId },
      ECONOMY_READ,
    );
    return res.data;
  }

  async startVaultDepositFromPayment(
    projectId: number,
    body: { payment_id: string; wallet_address: string },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/funding/start-vault-deposit`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  buildExplorerUrl(chainId: number, kind: 'address' | 'tx', value: string): string | null {
    return buildAgentNetExplorerUrl(chainId, kind, value);
  }

  async getFundingTransparency(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/agentnet/${projectId}/funding/transparency`,
      undefined,
      ECONOMY_READ,
    );
    return res.data;
  }

  /** @requiresCap agentnet_post | project_admin */
  async exportLedger(projectId: number, limit = 200): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/agentnet/${projectId}/exports/ledger`,
      { limit },
      ECONOMY_READ,
    );
    return res.data;
  }

  async proofToTask(
    projectId: number,
    body: {
      agent_uuid: string;
      run_uuid: string;
      receipt_hash: string;
      purchase_batch_id?: number;
      merkle_root?: string;
      checkpoint_hash?: string;
      submit_on_chain?: boolean;
      agent_on_chain_id?: number;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/proof-to-task`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }

  async registerWallet(
    projectId: number,
    body: { wallet_address: string; chain_id: number },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/agentnet/${projectId}/funding/register-wallet`,
      body,
      ECONOMY_WRITE,
    );
    return res.data;
  }
}
