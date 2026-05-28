import { PlaybookSchema, type Playbook } from './types/playbookTypes';

export type ValidateDefinitionResult =
  | { ok: true; playbook: Playbook }
  | { ok: false; errors: string[] };

/** Zod-only gate before publish (`sdk.guidance.gen1` P3.5). */
export function validateGuidanceDefinition(raw: unknown): ValidateDefinitionResult {
  const parsed = PlaybookSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  return { ok: true, playbook: parsed.data };
}
