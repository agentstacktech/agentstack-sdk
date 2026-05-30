# React Query integration

**Genetic tag:** `sdk.react.query.gen1`  
**RU:** [REACT_QUERY_INTEGRATION_ru.md](./REACT_QUERY_INTEGRATION_ru.md)

Use `@agentstack/react` hooks — not `useState` + `useEffect` for server data.

---

## Provider (canonical)

**Integrator docs:** wrap the app with **`SDKProvider`** and read the client via **`useSDK()`**.

`AgentStackProvider` is an **alias** of `SDKProvider` (same implementation); prefer `SDKProvider` in new code.

```tsx
import { SDKProvider, useSDK } from '@agentstack/react';
import { resolveAgentStackApiBase } from '@agentstack/sdk';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: resolveAgentStackApiBase(),
        apiKey: import.meta.env.VITE_AGENTSTACK_API_KEY,
        projectId: Number(import.meta.env.VITE_AGENTSTACK_PROJECT_ID),
      }}
    >
      <YourRoutes />
    </SDKProvider>
  );
}

function ProjectsList() {
  const sdk = useSDK();
  // useSDKQuery(sdk, …) below
}
```

---

## Hooks

| Hook | Use |
|------|-----|
| `useSDKQuery` | Read with SDK client |
| `useSDKMutation` | Write |
| `useSDKInfiniteQuery` | Paginated lists |
| `useSDKMutationWithInvalidation` | Write + entity registry |
| `useEntityData` | CRUD list boilerplate |

---

## Example query

```tsx
import { useSDKQuery } from '@agentstack/react';

function ProjectList() {
  const { data, isLoading, error } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });
  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Error</div>;
  return (
    <ul>
      {(data ?? []).map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## Invalidation

After command-bus writes, invalidate snapshots **and** React Query keys:

```typescript
await sdk.platform.protocol.executeCommand({ /* … */ });
await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
// In mutations: queryClient.invalidateQueries({ queryKey: ['projects'] })
```

Monorepo helper: `agentstack-frontend/src/lib/cacheInvalidation.ts`.

---

## Admin hooks

`useAdminUsers` and related hooks require **`sdkAudience: 'platform_operator'`** (AgentStack monorepo only). See [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md).

---

## Related

- [AI_REACT_SCAFFOLD.md](./AI_REACT_SCAFFOLD.md) — agent scaffold  
- [packages/react/README.en.md](../packages/react/README.en.md)
