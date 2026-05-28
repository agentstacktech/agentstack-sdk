# React Query integration

**Genetic tag:** `sdk.react.query.gen1`

Use `@agentstack/react` hooks — not `useState` + `useEffect` for server data.

| Hook | Use |
|------|-----|
| `useSDKQuery` | Read with SDK client |
| `useSDKMutation` | Write |
| `useSDKInfiniteQuery` | Paginated lists |
| `useSDKMutationWithInvalidation` | Write + entity registry |
| `useEntityData` | CRUD list boilerplate |

Provider: `AgentStackProvider` with `apiBase: resolveAgentStackApiBase()`.

Invalidate snapshots after command bus writes: `sdk.protocol.invalidateSnapshotPrefix` + query invalidation — see monorepo `cacheInvalidation.ts`.
