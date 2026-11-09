/**
 * Param-sensitive batch anchor policy (SoT: shared/fixtures/generated/batch_param_anchor_rules_v1.json).
 * DRY with plugin batchParamAnchorEval.mjs — regen via npm run sync:batch-param-anchor.
 */

import auditBatchActions from './generated/auditBatchActions.json';
import rules from './generated/batchParamAnchorRules.json';

const MUTATES_WHEN = (rules as { mutates_when_by_action?: Record<string, Record<string, unknown>> })
  .mutates_when_by_action ?? {};
const PLAIN_READ_ACTIONS = new Set(
  ((rules as { plain_read_actions?: string[] }).plain_read_actions ?? []) as string[],
);
const ANCHOR_EXEMPT_MUTATE = new Set(
  ((rules as { anchor_exempt_mutate_actions?: string[] }).anchor_exempt_mutate_actions ??
    []) as string[],
);
const FALLBACK =
  (rules as { plugin_fallback?: { audit_whitelist_no_anchor?: boolean; non_whitelist_needs_anchor?: boolean } })
    .plugin_fallback ?? {};
const TRUTHINESS = (rules as { truthiness?: { true_values?: unknown[]; false_values?: unknown[] } })
  .truthiness ?? {};

export const AUDIT_BATCH_ACTIONS = new Set(
  ((auditBatchActions as { actions?: string[] }).actions ?? []) as string[],
);

function isTrueish(val: unknown): boolean {
  return (TRUTHINESS.true_values ?? []).some((t) => t === val);
}

function isFalseish(val: unknown): boolean {
  return (TRUTHINESS.false_values ?? []).some((t) => t === val);
}

export function batchStepEffectiveMutates(
  action: string,
  params: Record<string, unknown>,
): boolean {
  const act = String(action || '').trim();
  const p = params ?? {};

  if (act === 'agents.plan_process_backlog') {
    const policy = String(p.auto_apply_policy ?? '').trim().toLowerCase();
    if (policy === 'safe' || policy === 'force') return true;
  }
  if (act === 'hosting.sync.commit') {
    if (!isFalseish(p.publish)) return true;
  }
  if (act === 'hosting.gc.ix') {
    if (!isTrueish(p.dry_run)) return true;
  }
  if (act === 'diagnostics.consistency.scan') {
    if (isTrueish(p.sync_plan)) return true;
  }
  if (act === 'script.put') {
    const pub = String(p.publish ?? 'none').trim().toLowerCase();
    if (pub && pub !== 'none' && pub !== 'false' && pub !== '0') return true;
  }

  const mutatesWhen = MUTATES_WHEN[act];
  if (!mutatesWhen || typeof mutatesWhen !== 'object') return false;

  for (const [key, expected] of Object.entries(mutatesWhen)) {
    const val = p[key];
    if (expected === true) {
      if (isTrueish(val)) return true;
    } else if (val === expected) {
      return true;
    }
  }
  return false;
}

export function stepAllowedWithoutSemanticAnchor(
  action: string,
  params: Record<string, unknown>,
  auditActions: Set<string> = AUDIT_BATCH_ACTIONS,
): boolean {
  const act = String(action || '').trim();
  if (!act) return true;
  if (ANCHOR_EXEMPT_MUTATE.has(act)) return true;
  if (batchStepEffectiveMutates(act, params)) return false;
  const mutatesWhen = MUTATES_WHEN[act];
  if (mutatesWhen && typeof mutatesWhen === 'object') return true;
  if (auditActions.has(act) && FALLBACK.audit_whitelist_no_anchor !== false) return true;
  if (PLAIN_READ_ACTIONS.has(act)) return true;
  if (FALLBACK.non_whitelist_needs_anchor) return false;
  return true;
}

export function stepNeedsSemanticAnchor(
  action: string,
  params: Record<string, unknown>,
  auditActions: Set<string> = AUDIT_BATCH_ACTIONS,
): boolean {
  return !stepAllowedWithoutSemanticAnchor(action, params, auditActions);
}
