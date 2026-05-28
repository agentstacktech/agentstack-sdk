import type { BaseAsset } from '../../types';

export type PricingRule =
  | { kind: 'fixed_usdt'; value: string }
  | { kind: 'percent_of_catalog'; percent: number }
  | { kind: 'chip_preset'; value: string };

export function applyPricingRule(asset: BaseAsset, rule: PricingRule): string {
  if (rule.kind === 'fixed_usdt') return rule.value;
  if (rule.kind === 'chip_preset') return rule.value;
  const base = parseFloat(String(asset.price_usdt ?? '0')) || 0;
  if (rule.kind === 'percent_of_catalog') {
    return (base * (rule.percent / 100)).toFixed(2);
  }
  return String(asset.price_usdt ?? '0');
}
