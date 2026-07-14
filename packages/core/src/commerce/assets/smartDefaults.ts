/** Deterministic smart defaults (`shared.commerce.smart_defaults.gen1`). */

export function autoSku(name: string, seq: number, prefix = 'SKU'): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${prefix}-${slug || 'item'}-${String(seq).padStart(3, '0')}`;
}

export function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function autoTags(name: string, category?: string): string[] {
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);
  return category ? [category, ...words] : words;
}

export function defaultPrice(
  presetDefault: string | undefined,
  suggested?: string | null,
): string {
  if (suggested && suggested !== '0') return suggested;
  return presetDefault ?? '9.99';
}

/** Fallback product image when none uploaded (`shared.commerce.smart_defaults.gen1`). */
export function defaultImagePlaceholder(
  presetId: string,
  assetType?: string,
): string {
  const kind = (assetType ?? presetId).toLowerCase();
  if (kind.includes('physical') || kind.includes('inventory')) {
    return '/placeholders/product-default.svg?variant=physical';
  }
  return '/placeholders/product-default.svg';
}
