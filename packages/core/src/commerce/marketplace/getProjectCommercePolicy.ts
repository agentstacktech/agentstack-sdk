import type { HTTPClient } from '../../client/http-client';

export type ProjectCommercePolicy = {
  allowed_rails: string[];
  storefront_public: boolean;
  shop_slug?: string | null;
};

const DEFAULT_POLICY: ProjectCommercePolicy = {
  allowed_rails: ['wallet_internal', 'payments_fiat'],
  storefront_public: true,
  shop_slug: null,
};

/** Read project commerce policy via merchant REST BFF. */
export async function getProjectCommercePolicy(
  client: HTTPClient,
  projectId: number,
): Promise<ProjectCommercePolicy> {
  try {
    const response = await client.get('/commerce/merchant/policy', {
      project_id: projectId,
    });
    const policy = response.data?.policy ?? response.data ?? {};
    return {
      allowed_rails: Array.isArray(policy.allowed_rails)
        ? policy.allowed_rails
        : DEFAULT_POLICY.allowed_rails,
      storefront_public: Boolean(
        policy.storefront_public ?? DEFAULT_POLICY.storefront_public,
      ),
      shop_slug: policy.shop_slug ?? null,
    };
  } catch {
    return DEFAULT_POLICY;
  }
}
