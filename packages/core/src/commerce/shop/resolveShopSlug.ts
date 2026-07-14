import type { HTTPClient } from '../../client/http-client';

export type ResolvedShopSlug = {
  project_id: number;
  shop_slug?: string;
  display_name?: string;
  storefront_public?: boolean;
};

export async function resolveShopSlug(
  client: HTTPClient,
  slug: string,
): Promise<ResolvedShopSlug | null> {
  try {
    const response = await client.get(
      `/commerce/shop/resolve-slug/${encodeURIComponent(slug)}`,
    );
    const data = response.data ?? response;
    const projectId = Number(data.project_id ?? 0);
    if (!projectId) return null;
    return {
      project_id: projectId,
      shop_slug: data.shop_slug,
      display_name: data.display_name,
      storefront_public: data.storefront_public,
    };
  } catch {
    return null;
  }
}
