/**
 * Shared session bootstrap query options for SPA cold start.
 * Gene: `frontend.spa.server_state.gen1`, `sdk.react.query.gen1`.
 */
import type { QueryClient } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';

export type SessionBootstrapAccountCtx = {
  username?: string;
  email?: string;
};

export type SessionBootstrapQueryFactories = {
  userProfileQueryOptions: (
    queryClient: QueryClient,
    sdk: AgentStackSDK,
    uid: number,
  ) => unknown;
  userSettingsFullQueryOptions: (sdk: AgentStackSDK, uid: number) => unknown;
  projectsAccessibleOnlyQueryOptions: (
    sdk: Pick<AgentStackSDK, 'api'>,
    accountCtx?: SessionBootstrapAccountCtx,
    staleTime?: number,
  ) => unknown;
};

/**
 * Returns TanStack `prefetchQuery` options for profile + settings + accessible projects.
 * Host app supplies concrete query factories (keeps @agentstack/react free of app paths).
 */
export function createSessionBootstrapQueries(
  queryClient: QueryClient,
  sdk: AgentStackSDK,
  uid: number,
  factories: SessionBootstrapQueryFactories,
  accountCtx?: SessionBootstrapAccountCtx,
) {
  return [
    factories.userProfileQueryOptions(queryClient, sdk, uid),
    factories.userSettingsFullQueryOptions(sdk, uid),
    factories.projectsAccessibleOnlyQueryOptions(sdk, accountCtx, 60_000),
  ] as const;
}
