# Интеграция React Query

**Genetic tag:** `sdk.react.query.gen1`  
**EN:** [REACT_QUERY_INTEGRATION.md](./REACT_QUERY_INTEGRATION.md)

Используйте хуки `@agentstack/react` — не `useState` + `useEffect` для server state.

| Hook | Назначение |
|------|------------|
| `useSDKQuery` | Чтение через SDK |
| `useSDKMutation` | Запись |
| `useSDKInfiniteQuery` | Пагинация |
| `useSDKMutationWithInvalidation` | Запись + registry |
| `useEntityData` | CRUD list |

Provider: `SDKProvider` с `apiBase: resolveAgentStackApiBase()`.

После command bus: `sdk.protocol.invalidateSnapshotPrefix` + invalidation queries — см. monorepo `cacheInvalidation.ts`.

Integrator scope: [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).
