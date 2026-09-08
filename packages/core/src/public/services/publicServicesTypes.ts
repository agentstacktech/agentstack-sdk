/** Public services offers catalog types. Gene: `frontend.public.services_offers.gen1` */

export type OfferStatus = 'listed' | 'coming_soon' | 'hidden';

export type OfferPhase = {
  id: string;
  label: string;
  amount_usd_min: number;
  amount_usd_max: number;
  amount_rub_min: number;
  amount_rub_max: number;
  cadence: 'one_time' | 'monthly';
  duration_days_min?: number;
  duration_days_max?: number;
  list_on_card?: boolean;
  includes?: string[];
};

export type OfferSku = {
  id: string;
  status: OfferStatus;
  gene: string;
  promo_i18n_key?: string;
  related_showcase_slug?: string | null;
  anti_claim_ids: string[];
  in_scope: string[];
  project_types: string[];
  out_of_scope: string[];
  work_orders: string[];
  reliability: string[];
  rate_lines: string[];
  phases: OfferPhase[];
};

export type PublicServicesCatalog = {
  source?: string;
  genetic_tag?: string;
  version: number;
  disclaimer: string;
  work_examples: string[];
  project_types: string[];
  reliability: string[];
  rate_card: unknown[];
  skus: OfferSku[];
};

export type KickoffPreflight = {
  ok: boolean;
  sku?: string;
  contact_id?: string;
  inquiry_id?: string | null;
  can_pay?: boolean;
  already_paid?: boolean;
  kickoff_pay_href?: string | null;
  reason?: string;
};

export type ServicesInquiryBody = {
  sku: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  website?: string;
  locale?: string;
  channel?: 'telegram' | 'web' | 'other';
  has_content?: 'yes' | 'no' | 'later';
  success?: string;
};
