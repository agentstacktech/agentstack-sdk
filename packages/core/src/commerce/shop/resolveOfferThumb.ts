/**
 * Resolve listing/offer thumbnail URL from storefront index card or asset visual.
 * Hosted demo legacy remap stays in hosted-storefront `resolveListingThumb`.
 */

export type OfferThumbSource = {
  thumbnail_url?: string | null;
  image_url?: string | null;
  icon_url?: string | null;
  images?: unknown;
  gallery?: unknown;
  visual?: {
    thumbnail_url?: string | null;
    image_url?: string | null;
    icon_url?: string | null;
    images?: unknown;
    gallery?: unknown;
  } | null;
};

function pickUrl(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstImage(value: unknown): string | undefined {
  if (typeof value === 'string') return pickUrl(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImage(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return (
      pickUrl(row.url) ??
      pickUrl(row.src) ??
      pickUrl(row.image_url) ??
      pickUrl(row.thumbnail_url) ??
      pickUrl(row.href)
    );
  }
  return undefined;
}

/** Prefer thumbnail_url, then image_url, nested visual, then gallery lists. */
export function resolveOfferThumb(
  card: OfferThumbSource | Record<string, unknown> | null | undefined,
): string | undefined {
  if (!card || typeof card !== 'object') return undefined;

  const source = card as OfferThumbSource;
  const visual =
    source.visual && typeof source.visual === 'object' ? source.visual : undefined;

  return (
    pickUrl(source.thumbnail_url) ??
    pickUrl(source.image_url) ??
    pickUrl(source.icon_url) ??
    pickUrl(visual?.thumbnail_url) ??
    pickUrl(visual?.image_url) ??
    pickUrl(visual?.icon_url) ??
    firstImage(source.images) ??
    firstImage(visual?.images) ??
    firstImage(source.gallery) ??
    firstImage(visual?.gallery)
  );
}
