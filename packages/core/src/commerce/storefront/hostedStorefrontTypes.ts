/** Hosted vitrine REST types (`sdk.commerce.storefront.hosted`). */

export type HostedStorefrontCatalogConfig = {
  scope: 'project' | 'global';
  project_id: number;
  page_size: number;
  default_sort: string;
};

export type HostedStorefrontMerchandising = {
  featured_collection?: string;
  featured_listing_uuids?: string[];
  show_global_shop_link?: boolean;
  global_shop_path?: string;
};

export type HostedStorefrontManifest = {
  project_id: number;
  bucket_name: string;
  catalog: HostedStorefrontCatalogConfig;
  merchandising: HostedStorefrontMerchandising;
  checkout_bridge?: Record<string, unknown>;
  sdk_cdn?: { module_path: string };
  version?: string;
  hosted_dirty?: boolean;
  published_at?: string | null;
};

export type HostedManifestResponse = {
  success: boolean;
  manifest: HostedStorefrontManifest;
};

export type HostedPublishResponse = {
  success: boolean;
  project_id: number;
  bucket_name: string;
  public_url: string;
  artifact_published: boolean;
  artifact_warning?: string;
  manifest: HostedStorefrontManifest;
};
