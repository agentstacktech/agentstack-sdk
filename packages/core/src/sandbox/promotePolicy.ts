/**
 * Promote gate policy — mirrors `shared/generation/promote_params.resolve_require_gates_passed`.
 * Genetic tags: sdk.sandbox.generation.gen1 · core.tenant.8dna_generation_supply.gen1
 */

import type { GenerationSettingsLike } from './generationReview';

export type { GenerationSettingsLike };

export type PromoteBodyLike = {
  require_gates_passed?: boolean;
};

/** Server SoT parity: explicit false is ops escape; undefined inherits project policy. */
export function resolveRequireGatesPassed(
  explicit: boolean | undefined | null,
  settings: GenerationSettingsLike | null | undefined,
): boolean {
  if (explicit !== undefined && explicit !== null) {
    return Boolean(explicit);
  }
  const modeOn = Boolean(settings?.auto_generation_mode);
  if (!modeOn) {
    return false;
  }
  if (settings?.require_gates_passed_on_promote === false) {
    return false;
  }
  return true;
}

/** Apply policy when caller omitted require_gates_passed (REST/MCP body). */
export function applyPromoteGatesPolicy<T extends PromoteBodyLike>(
  body: T,
  settings: GenerationSettingsLike | null | undefined,
): T {
  if (body.require_gates_passed !== undefined) {
    return body;
  }
  const modeOn = Boolean(settings?.auto_generation_mode);
  if (!modeOn) {
    return body;
  }
  return {
    ...body,
    require_gates_passed: resolveRequireGatesPassed(undefined, settings),
  };
}
