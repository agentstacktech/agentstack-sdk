/**
 * Review gate for generation banners — mirrors shared/generation/review_policy.py.
 * Genetic tags: sdk.sandbox.generation.gen1 · core.generation_flow.gen1
 */

export type GenerationSettingsLike = {
  auto_generation_mode?: boolean;
  require_gates_passed_on_promote?: boolean;
  auto_generation_require_approval?: boolean;
  auto_generation_approval_mode?: string;
  auto_generation_approval_min_count?: number;
  auto_generation_approval_min_percent?: number;
  auto_promote_on_all_pass?: boolean;
  direct_prod_roles?: string[] | null;
  approver_user_ids?: number[];
};

const REVIEW_ON = new Set([
  'at_least_one',
  'min_count',
  'min_percent',
  'manual_only',
]);

const APPROVAL_MODES = new Set([
  'off',
  'at_least_one',
  'min_count',
  'min_percent',
  'manual_only',
]);

/** Explicit mode wins. Legacy bool maps to at_least_one. */
export function resolveApprovalMode(
  settings?: GenerationSettingsLike | null,
): string {
  const raw = String(settings?.auto_generation_approval_mode || '')
    .trim()
    .toLowerCase();
  if (APPROVAL_MODES.has(raw)) return raw;
  if (settings?.auto_generation_require_approval) return 'at_least_one';
  return 'off';
}

/** True when UI should show review / approve affordances. */
export function generationReviewRequired(
  settings?: GenerationSettingsLike | null,
): boolean {
  return resolveApprovalMode(settings) !== 'off';
}

export function approvalGateRequired(
  settings?: GenerationSettingsLike | null,
): boolean {
  return generationReviewRequired(settings);
}

/** manual_only never auto-promotes, even if the bool is true. */
export function allowsAutoPromote(
  settings?: GenerationSettingsLike | null,
): boolean {
  if (resolveApprovalMode(settings) === 'manual_only') return false;
  return Boolean(settings?.auto_promote_on_all_pass);
}

export function approverIds(settings?: GenerationSettingsLike | null): number[] {
  const raw = settings?.approver_user_ids;
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const item of raw) {
    const uid = Number(item);
    if (uid > 0 && !out.includes(uid)) out.push(uid);
  }
  return out;
}

export function quorumNeeded(
  settings?: GenerationSettingsLike | null,
  eligibleOperators = 1,
): number {
  const mode = resolveApprovalMode(settings);
  const eligible = Math.max(1, Number(eligibleOperators) || 1);
  if (mode === 'off') return 0;
  if (mode === 'min_count') {
    return Math.max(1, Number(settings?.auto_generation_approval_min_count) || 1);
  }
  if (mode === 'min_percent') {
    const pct = Math.min(
      100,
      Math.max(1, Number(settings?.auto_generation_approval_min_percent) || 50),
    );
    return Math.max(1, Math.ceil(eligible * pct / 100));
  }
  return 1;
}

export function quorumMet(
  settings?: GenerationSettingsLike | null,
  eligibleOperators = 1,
): boolean {
  if (!approvalGateRequired(settings)) return true;
  return approverIds(settings).length >= quorumNeeded(settings, eligibleOperators);
}

/** Fork / env_snapshot catalog coherence (core.generation_flow.gen1). */
export type ForkCatalogProjection = {
  apply_ready?: boolean;
  catalog_projection_state?: string;
  recovery_code?: string;
  committed_without_list_hit?: boolean;
};

export function forkCatalogProjection(
  forkData?: Record<string, unknown> | null,
): ForkCatalogProjection {
  if (!forkData || typeof forkData !== 'object') return {};
  const coherence = forkData.catalog_coherence;
  const cc =
    coherence && typeof coherence === 'object'
      ? (coherence as Record<string, unknown>)
      : {};
  const gate = forkData.sandbox_gate;
  const sg =
    gate && typeof gate === 'object' ? (gate as Record<string, unknown>) : {};
  return {
    apply_ready: Boolean(
      cc.apply_ready ?? sg.apply_ready ?? forkData.apply_ready,
    ),
    catalog_projection_state: String(
      cc.catalog_projection_state ??
        forkData.catalog_projection_state ??
        '',
    ).trim() || undefined,
    recovery_code: String(cc.recovery_code ?? forkData.recovery_code ?? '').trim() || undefined,
    committed_without_list_hit: Boolean(cc.committed_without_list_hit),
  };
}

/** diff_vs_prod success does not imply Gate A — check catalog_bypass. */
export function diffImpliesApplyReady(diff?: Record<string, unknown> | null): boolean {
  if (!diff || typeof diff !== 'object') return false;
  if (diff.catalog_bypass === true) return false;
  return Boolean(diff.sandbox_head_uuid);
}
