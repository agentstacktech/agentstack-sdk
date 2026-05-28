import { economyPaidAgentRunRecipe } from '@agentstack/sdk';
import { useSDKMutation } from './useSDKMutation';
import { useSDKInstance } from '../context/SDKContext';

export interface UsePaidAgentRunVariables {
  agentId: string;
  buyerUserId: number;
  creditsAtomic: number;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
  traceId?: string;
  waitForCompletion?: boolean;
}

export function usePaidAgentRun(projectId: number | undefined) {
  const sdk = useSDKInstance();
  return useSDKMutation<Record<string, unknown>, UsePaidAgentRunVariables>(
    sdk,
    `economy.paid_run.${projectId ?? 0}`,
    async (vars) => {
      if (!projectId) {
        throw new Error('projectId required');
      }
      return economyPaidAgentRunRecipe(sdk, {
        projectId,
        agentId: vars.agentId,
        buyerUserId: vars.buyerUserId,
        creditsAtomic: vars.creditsAtomic,
        input: vars.input,
        idempotencyKey: vars.idempotencyKey,
        traceId: vars.traceId,
        waitForCompletion: vars.waitForCompletion,
      });
    },
  );
}
