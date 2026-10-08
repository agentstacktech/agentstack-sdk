/**
 * Direct production write roles — mirrors shared/generation/direct_prod.py.
 * Genetic tags: sdk.sandbox.generation.gen1 · core.generation_flow.gen1
 */

import type { GenerationSettingsLike } from './generationReview';

const DEFAULT_DIRECT_PROD_ROLES = ['owner'];

/** Role is in direct_prod_roles (default owner only). */
export function roleMayWriteProduction(
  role: string,
  settings?: GenerationSettingsLike | null,
): boolean {
  const raw = settings?.direct_prod_roles;
  let allowed: Set<string>;
  if (raw === undefined || raw === null) {
    allowed = new Set(DEFAULT_DIRECT_PROD_ROLES);
  } else if (Array.isArray(raw)) {
    allowed = new Set(
      raw.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean),
    );
  } else {
    allowed = new Set();
  }
  return allowed.has(String(role || '').trim().toLowerCase());
}
