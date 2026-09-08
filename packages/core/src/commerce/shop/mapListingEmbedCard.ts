import { resolveOfferRowFields, type OfferRowInput } from './offerRow';

/** Minimal listing card for hosted vitrine + CDN embeds (no React / UI kit). */
export type ListingEmbedCard = {
  uuid: string;
  title: string;
  priceUsdt: string;
  imageUrl?: string;
};

/** Map browse row / listOffers item to embed-safe card fields. */
export function mapListingEmbedCard(row: Record<string, unknown>): ListingEmbedCard {
  const fields = resolveOfferRowFields(row as OfferRowInput);
  return {
    uuid: fields.uuid,
    title: fields.title,
    priceUsdt: fields.priceUsdt,
    imageUrl: fields.imageUrl,
  };
}
