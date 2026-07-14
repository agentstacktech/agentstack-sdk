/**
 * Platform SEO REST (`/api/seo/*`).
 * Genetic tag: sdk.seo.gen1
 */
import { HTTPClient } from '../client/http-client';

export interface SeoMetaTags {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  'og:title'?: string;
  'og:description'?: string;
  'og:image'?: string;
  'og:url'?: string;
  'og:type'?: string;
  'og:locale'?: string;
  'twitter:card'?: string;
  'twitter:title'?: string;
  'twitter:description'?: string;
  'twitter:image'?: string;
  structured_data?: Record<string, unknown>;
  hreflang?: Array<{ hreflang: string; href: string }>;
}

export interface SeoMetaOptions {
  locale?: string;
  signal?: AbortSignal;
}

export interface SeoCacheClearResult {
  success: boolean;
  static_invalidated?: number;
  meta_invalidated?: number;
  registry_version?: string;
  indexnow?: Record<string, unknown>;
}

export interface SeoHealthCheck {
  registry_version: string;
  indexable_path_count: number;
  funnel_paths: string[];
}

/** Hosting funnel paths served by platform marketing SEO cluster. */
export const HOSTING_FUNNEL_PATHS = ['/', '/host-site', '/demo', '/for-developers'] as const;

export type HostingFunnelPath = (typeof HOSTING_FUNNEL_PATHS)[number];

export class AgentSeo {
  constructor(private client: HTTPClient) {}

  /** GET /api/seo/meta?path=&locale= */
  async getMeta(path: string, options: SeoMetaOptions = {}): Promise<SeoMetaTags> {
    const params: Record<string, string> = { path };
    if (options.locale) params.locale = options.locale;
    const res = await this.client.get<SeoMetaTags>('/seo/meta', params, {
      signal: options.signal,
      skipAuthStateCheck: true,
    });
    return res.data;
  }

  /** Batch meta fetch for multiple paths (parallel). */
  async getMetaBatch(
    paths: readonly string[],
    options: SeoMetaOptions = {},
  ): Promise<Record<string, SeoMetaTags>> {
    const out: Record<string, SeoMetaTags> = {};
    await Promise.all(
      paths.map(async (p) => {
        out[p] = await this.getMeta(p, options);
      }),
    );
    return out;
  }

  /** GET /api/seo/robots.txt */
  async getRobotsTxt(signal?: AbortSignal): Promise<string> {
    const res = await this.client.get<string>('/seo/robots.txt', undefined, {
      signal,
      skipAuthStateCheck: true,
    });
    return String(res.data ?? '');
  }

  /** GET /api/seo/sitemap.xml */
  async getSitemapXml(signal?: AbortSignal): Promise<string> {
    const res = await this.client.get<string>('/seo/sitemap.xml', undefined, {
      signal,
      skipAuthStateCheck: true,
    });
    return String(res.data ?? '');
  }

  /** POST /api/seo/cache/clear */
  async clearCache(signal?: AbortSignal): Promise<SeoCacheClearResult> {
    const res = await this.client.post<SeoCacheClearResult>(
      '/seo/cache/clear',
      {},
      { signal },
    );
    return res.data;
  }

  /** Read registry version from a meta response header (lightweight probe). */
  async getRegistryVersion(signal?: AbortSignal): Promise<string | null> {
    const res = await this.client.get<SeoMetaTags>(
      '/seo/meta',
      { path: '/' },
      { signal, skipAuthStateCheck: true },
    );
    const raw = res.headers?.['x-seo-registry-version'];
    return typeof raw === 'string' ? raw : null;
  }

  /** Lightweight health snapshot for ops dashboards. */
  async healthCheck(signal?: AbortSignal): Promise<SeoHealthCheck> {
    const registry_version = (await this.getRegistryVersion(signal)) ?? 'unknown';
    const funnel = await this.getMetaBatch(HOSTING_FUNNEL_PATHS, { signal });
    return {
      registry_version,
      indexable_path_count: Object.keys(funnel).length,
      funnel_paths: HOSTING_FUNNEL_PATHS.slice(),
    };
  }

  /** Convenience: fetch meta for each hosting funnel path. */
  async getHostingFunnelCopy(locale?: string): Promise<Partial<Record<HostingFunnelPath, SeoMetaTags>>> {
    return this.getMetaBatch(HOSTING_FUNNEL_PATHS, { locale }) as Promise<
      Partial<Record<HostingFunnelPath, SeoMetaTags>>
    >;
  }
}
