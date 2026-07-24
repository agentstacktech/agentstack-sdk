# @agentstack/react — AI index

**Genetic code:** `sdk.react.query.gen1`  
**Also:** `sdk.react.invalidation.gen1`, `sdk.react.capability.gen1`, `sdk.react.entity.gen1`  
**Parent:** [agentstack-unified-sdk/AI_INDEX.md](../../AI_INDEX.md)

## Hot files

| Area | Path |
|------|------|
| SDK context | `src/context/SDKContext.tsx` |
| Invalidation registry + structural `QueryClient` | `src/lib/invalidationRegistry.ts`, `src/context/InvalidationRegistryContext.tsx` |
| Entity query defaults | `src/lib/entityQueryOptions.ts` (`createEntityQueryOptions`) |
| Capability / RBAC UI | `src/hooks/useCapability.ts`, `src/components/RequireCapability.tsx` |
| Entity list + invalidate | `src/hooks/useEntityData.ts` |
| Forms + Zod | `src/hooks/useEntityForm.ts` |
| Mutation + registry | `src/hooks/useSDKMutationWithInvalidation.ts` |
| Feature factory | `src/createFeatureModule.ts` |
| RQ wrappers | `src/hooks/useSDKQuery.ts`, `src/hooks/useSDKMutation.ts` |

## App wiring

- Frontend: `InvalidationRegistryProvider` + `appInvalidationRegistry` / `invalidationRegistry.ts` (see AgentStack frontend `AI_INDEX.md`).

## Docs

- [docs/SDK_FEATURE_QUICKSTART.md](../../../../docs/SDK_FEATURE_QUICKSTART.md)
