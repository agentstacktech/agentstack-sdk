import type { HTTPClient } from '../../client/http-client';
import type { ProjectCommercePolicy } from '../marketplace/getProjectCommercePolicy';

export type UpdateMerchantPolicyInput = ProjectCommercePolicy & {
  projectId: number;
};

export async function updateMerchantPolicy(
  client: HTTPClient,
  input: UpdateMerchantPolicyInput,
): Promise<ProjectCommercePolicy> {
  const response = await client.put(
    `/commerce/merchant/policy?project_id=${input.projectId}`,
    {
      storefront_public: input.storefront_public,
      allowed_rails: input.allowed_rails,
      shop_slug: input.shop_slug ?? null,
    },
  );
  const policy = response.data?.policy ?? response.data;
  return {
    storefront_public: Boolean(policy?.storefront_public ?? true),
    allowed_rails: Array.isArray(policy?.allowed_rails)
      ? policy.allowed_rails
      : input.allowed_rails,
    shop_slug: policy?.shop_slug ?? input.shop_slug ?? null,
  };
}
