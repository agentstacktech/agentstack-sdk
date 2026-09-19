import { z } from 'zod';

/** Portable project orchestrator pack (`project_orchestrator_pack_v2`). */
export const projectOrchestratorPackSchema = z
  .object({
    pack_version: z.number().int().min(1).default(2),
    orchestrator: z.record(z.unknown()).default({}),
    agents: z.array(z.record(z.unknown())).default([]),
    style_prompt: z.string().optional(),
  })
  .passthrough();

export type ProjectOrchestratorPack = z.infer<typeof projectOrchestratorPackSchema>;

export function composeOrchestratorPackFromProject(input: {
  orchestrator: Record<string, unknown>;
  agents?: Record<string, unknown>[];
  stylePrompt?: string;
}): ProjectOrchestratorPack {
  return projectOrchestratorPackSchema.parse({
    pack_version: 2,
    orchestrator: input.orchestrator,
    agents: input.agents ?? [],
    style_prompt: input.stylePrompt ?? '',
  });
}
