/**
 * Canonical plan aliases — mirrors `shared/subscription/plan_ids.py` (subset for clients).
 * Gene: sdk.economy.gen1 · repo.platform.unit_economics.gen1
 */

const LAUNCH_OR_ABOVE = new Set([
  'starter',
  'launch',
  'basic',
  'business',
  'pro',
  'professional',
  'scale',
  'enterprise',
  'unlimited',
]);

const SCALE_OR_ABOVE = new Set([
  'pro',
  'professional',
  'scale',
  'enterprise',
  'unlimited',
]);

/** Stored tier string → limits enum key (not display name). */
export function limitsTierForPlan(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key) return 'free';
  const map: Record<string, string> = {
    sandbox: 'free',
    free: 'free',
    anonymous: 'anonymous',
    launch: 'starter',
    starter: 'starter',
    basic: 'basic',
    business: 'enterprise', // LEGACY_BUSINESS_MEANS_ENTERPRISE
    scale: 'pro',
    pro: 'pro',
    professional: 'pro',
    premium: 'premium',
    corporate: 'premium',
    vip: 'vip',
    enterprise: 'enterprise',
    unlimited: 'enterprise',
  };
  return map[key] ?? 'free';
}

export function isLaunchOrAbovePlan(tier: string | null | undefined): boolean {
  return LAUNCH_OR_ABOVE.has(String(tier ?? '').trim().toLowerCase());
}

export function isScaleOrAbovePlan(tier: string | null | undefined): boolean {
  return SCALE_OR_ABOVE.has(String(tier ?? '').trim().toLowerCase());
}

export function accountTierFromPayload(
  sub: Record<string, unknown> | null | undefined,
): string {
  if (!sub || typeof sub !== 'object') return 'free';
  return String(sub.plan_type ?? sub.subscription_tier ?? sub.tier ?? 'free')
    .trim()
    .toLowerCase();
}
