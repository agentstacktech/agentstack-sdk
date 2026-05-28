import type { HTTPClient } from '../../client/http-client';

export type ProjectCommercePolicy = {
  allowed_rails: string[];
  storefront_public: boolean;
};

const DEFAULT_POLICY: ProjectCommercePolicy = {
  allowed_rails: ['wallet_internal', 'payments_fiat'],
  storefront_public: true,
};

/** Read `data.marketplace.settings` slice from project 8DNA via REST project get. */
export async function getProjectCommercePolicy(
  client: HTTPClient,
  projectId: number,
): Promise<ProjectCommercePolicy> {
  try {
    const response = await client.get(`/projects/${projectId}`);
    const data = response.data?.project?.data ?? response.data?.data ?? {};
    const marketplace = data.marketplace ?? {};
    const settings = marketplace.settings ?? {};
    return {
      allowed_rails: Array.isArray(settings.allowed_rails)
        ? settings.allowed_rails
        : DEFAULT_POLICY.allowed_rails,
      storefront_public:
        settings.storefront_public ?? DEFAULT_POLICY.storefront_public,
    };
  } catch {
    return DEFAULT_POLICY;
  }
}
