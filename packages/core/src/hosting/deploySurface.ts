/**
 * Deploy surface router client — sdk.hosting.gen2
 */

import type { HTTPClient } from '../client/http-client';

export const DEPLOY_RECIPES = {
  siteGrowth: 'mcp_site_growth_v1',
  workspaceBuild: 'mcp_hosting_workspace_build_v1',
  surfaceRoute: 'mcp_deploy_surface_route_v1',
  appStudioCreate: 'mcp_app_studio_create_v1',
  storefront: 'mcp_storefront_plan',
  fullStack: 'mcp_deploy_full_stack_v1',
  siteWithBackend: 'mcp_site_with_backend_v1',
} as const;

export type DeploySurfaceResolveResult = {
  surface?: string;
  recipe_id?: string;
  rationale?: string;
  has_app_studio_tree?: boolean;
};

export async function routeDeploySurface(
  client: HTTPClient,
  params: { project_id: number; intent?: string; wants_commerce?: boolean },
): Promise<DeploySurfaceResolveResult> {
  const res = await client.post<DeploySurfaceResolveResult>('/mcp/execute', {
    action: 'hosting.surface.resolve',
    params,
  });
  return res.data ?? {};
}
