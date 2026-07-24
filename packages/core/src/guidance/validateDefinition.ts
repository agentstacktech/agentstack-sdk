import { PlaybookSchema, type Playbook, type PlaybookId } from './types/playbookTypes';

export type ValidateDefinitionResult =
  | { ok: true; playbook: Playbook }
  | { ok: false; errors: string[] };

const TENANT_ID_SLUG = /^[a-z][a-z0-9_-]{0,63}$/i;

/**
 * Structural stand-in so tenant free-form `id` slugs can reuse PlaybookSchema
 * (platform PlaybookId enum) without widening the registry type.
 */
const STRUCTURAL_PLAYBOOK_ID: PlaybookId = 'micropath-synthetic';

/** Zod-only gate before publish (`sdk.guidance.gen1` P3.5). Accepts platform or tenant graphs. */
export function validateGuidanceDefinition(raw: unknown): ValidateDefinitionResult {
  const platform = PlaybookSchema.safeParse(raw);
  if (platform.success) {
    return { ok: true, playbook: platform.data };
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: platform.error.issues.map((i) => i.message) };
  }

  const candidate = raw as Record<string, unknown>;
  const slug = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (!TENANT_ID_SLUG.test(slug)) {
    return {
      ok: false,
      errors: [
        'definition id must be a slug (e.g. my-onboarding)',
        ...platform.error.issues.map((i) => i.message),
      ],
    };
  }

  const structural = PlaybookSchema.safeParse({
    ...candidate,
    id: STRUCTURAL_PLAYBOOK_ID,
  });
  if (!structural.success) {
    return { ok: false, errors: structural.error.issues.map((i) => i.message) };
  }

  return {
    ok: true,
    playbook: { ...structural.data, id: slug as PlaybookId },
  };
}

/**
 * Strict Zod gate for LLM / tenant playbook graphs (W9.4).
 * Throws on invalid graphs — use in builders / import pipelines.
 */
export function assertPlaybookGraph(raw: unknown): Playbook {
  const result = validateGuidanceDefinition(raw);
  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }
  return result.playbook;
}
