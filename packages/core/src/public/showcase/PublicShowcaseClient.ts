/**
 * Public showcase catalog BFF (`frontend.public.showcase_gallery.gen1`).
 */

import type { HTTPClient } from '../../client/http-client';

export type PublicShowcaseEntryKind = 'independent_tenant' | 'platform_proof';

export type PublicShowcaseCatalogEntry = {
  id: string;
  title: string;
  tagline: string;
  capabilities: string[];
  live_url_key: string;
  hosting_bucket?: string | null;
  project_slug: string;
  project_id?: number | null;
  build_docs: string;
  gene: string;
  wave: string;
  public_mode: string;
  status: 'active' | 'backlog';
  icon_path?: string | null;
  entry_kind?: PublicShowcaseEntryKind;
  seo_title_override?: string | null;
  prerender_bullets_override?: string[] | null;
  health?: {
    status?: string;
    live_url?: string | null;
    latency_ms?: number | null;
    probed_at?: string | null;
  };
};

export type PublicShowcaseCatalogResponse = {
  source?: string;
  genetic_tag?: string;
  version: number;
  catalog_revision?: string;
  settings?: {
    featured_entry_id?: string;
    public_cache_max_age_s?: number;
    hire_sku_map?: Record<string, string>;
  };
  entries: PublicShowcaseCatalogEntry[];
};

export class PublicShowcaseClient {
  constructor(private readonly http: HTTPClient) {}

  async getCatalog(): Promise<PublicShowcaseCatalogResponse> {
    const res = await this.http.get<PublicShowcaseCatalogResponse>(
      '/api/public/showcase/catalog',
    );
    const data = (res as { data?: PublicShowcaseCatalogResponse }).data ?? res;
    return data as PublicShowcaseCatalogResponse;
  }
}

/** Thin helper for integrators (aligns with SPA `publicShowcasePort`). */
export async function getPublicShowcaseCatalog(
  http: HTTPClient,
): Promise<PublicShowcaseCatalogResponse> {
  return new PublicShowcaseClient(http).getCatalog();
}
