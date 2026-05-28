import type { AgentStackSDK } from '../../sdk';
import { buildUserAgntKey } from '../../atoms/agentcoinAccountKey';
import { EconomyError } from '../errors/EconomyError';
import { economyIdempotencyKey } from '../utils/idempotency';
import { ReceiptVerifier } from '../sessions/ReceiptVerifier';
import { watchRunUntilTerminal, extractRunReceipt } from '../sessions/RunBillingWatcher';

export interface PaidAgentRunRecipeParams {
  projectId: number;
  agentId: string;
  buyerUserId: number;
  creditsAtomic: number;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
  traceId?: string;
  waitForCompletion?: boolean;
}

/** One-call paid agent run (quote + server-orchestrated purchase + run). */
export async function economyPaidAgentRunRecipe(
  sdk: AgentStackSDK,
  params: PaidAgentRunRecipeParams,
): Promise<Record<string, unknown>> {
  const flow = sdk.economy.forProject(params.projectId).paidRun(params.buyerUserId);
  const out = await flow.start({
    agentId: params.agentId,
    creditsAtomic: params.creditsAtomic,
    input: params.input,
    idempotencyKey: params.idempotencyKey,
    traceId: params.traceId,
  });
  if (params.waitForCompletion && out.run_uuid) {
    const terminal = await watchRunUntilTerminal(
      sdk.agentsFleet,
      params.projectId,
      params.agentId,
      String(out.run_uuid),
    );
    return { ...out, terminal };
  }
  return out;
}

export async function economyPurchaseCreditsRecipe(
  sdk: AgentStackSDK,
  params: {
    projectId: number;
    buyerUserId: number;
    creditsAtomic: number;
    idempotencyKey?: string;
    includeProof?: boolean;
  },
): Promise<Record<string, unknown>> {
  const session = sdk.economy.forProject(params.projectId).billing(params.buyerUserId);
  const baseKey =
    params.idempotencyKey ?? economyIdempotencyKey('credits', String(params.buyerUserId));
  await session.ensureFreshQuote(params.creditsAtomic);
  try {
    return await session.purchase(baseKey, { includeProof: params.includeProof });
  } catch (err) {
    if (!(err instanceof EconomyError) || err.code !== 'QUOTE_EXPIRED') {
      throw err;
    }
    await session.quoteCredits(params.creditsAtomic);
    return session.purchase(`${baseKey}-retry`, { includeProof: params.includeProof });
  }
}

export async function economyEnsureAgntBalanceRecipe(
  sdk: AgentStackSDK,
  params: { projectId: number; userId: number; minAtomic: bigint },
): Promise<void> {
  const key = buildUserAgntKey(params.projectId, params.userId);
  await sdk.economy.forProject(params.projectId).ledger.ensureBalance(key, params.minAtomic);
}

export async function economyVerifyRunReceiptRecipe(
  sdk: AgentStackSDK,
  params: {
    projectId: number;
    output: Record<string, unknown>;
    anchorClaim?: Record<string, unknown>;
  },
): Promise<ReturnType<ReceiptVerifier['verifyRunOutput']>> {
  const verifier = new ReceiptVerifier(sdk.economy.proofs);
  return verifier.verifyRunOutput(params.projectId, params.output, {
    anchorClaim: params.anchorClaim,
  });
}

export { extractRunReceipt, watchRunUntilTerminal };
