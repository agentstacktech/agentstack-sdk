/**
 * Hosted POST /s/{pid}/mcp batch envelope — semantic anchor + context (G6b).
 * Gene: sdk.commerce.hosted.gen1 · core.games.quick_match.gen1
 */
import { mcpBatchStep } from './batchStepData';

export type HostedMcpStepInput = {
  id?: string;
  action: string;
  params: Record<string, unknown>;
};

export function hostedMcpBatchBody(
  projectId: number,
  steps: HostedMcpStepInput[],
): Record<string, unknown> {
  return {
    context: { project_id: projectId },
    options: { execution_intent: 'direct', stopOnError: true },
    steps: steps.map((s, i) =>
      mcpBatchStep(s.action, s.params, projectId, s.id ?? `s${i}`),
    ),
  };
}
