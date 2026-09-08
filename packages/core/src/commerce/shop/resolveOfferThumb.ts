/**
 * Resolve listing/offer thumbnail URL from storefront index card or asset visual.
 * Hosted demo legacy remap stays in hosted-storefront `resolveListingThumb`.
 */

export type OfferThumbSource = {
  thumbnail_url?: string | null;
  image_url?: string | null;
  visual?: {
    thumbnail_url?: string | null;
    image_url?: string | null;
  } | null;
};

function pickUrl(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Prefer thumbnail_url, then image_url, then nested visual fields. */
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
    pickUrl(visual?.thumbnail_url) ??
    pickUrl(visual?.image_url)
  );
}
