# @agentstack/hooks

**Languages:** **English** (npm readme) · [Русский extended reference](README.md)

Headless React Query hooks on `@agentstack/sdk` — use with or without `@agentstack/react` UI.

---

## Install

```bash
npm install @agentstack/hooks @agentstack/sdk @tanstack/react-query
```

Wrap your tree with `QueryClientProvider` and an SDK instance (via `@agentstack/react` `SDKProvider` or custom context).

---

## useSDKQuery

```tsx
import { useSDKQuery } from '@agentstack/hooks';
import { useSDK } from '@agentstack/react';

function List() {
  const sdk = useSDK();
  return useSDKQuery({
    queryKey: ['projects'],
    queryFn: () => sdk.platform.api.getProjects(),
  });
}
```

---

## useSDKMutation

```tsx
import { useSDKMutation } from '@agentstack/hooks';

const mutation = useSDKMutation({
  mutationFn: (sdk, payload: { name: string }) =>
    sdk.platform.api.createProject({ name: payload.name }),
});
```

---

## Patterns

| Pattern | Hook |
|---------|------|
| List + pagination | `useSDKInfiniteQuery` |
| Write + cache bust | `useSDKMutationWithInvalidation` |
| Entity CRUD boilerplate | `useEntityData` |

Prefer `@agentstack/react` for `SDKProvider` and `useAuth` — [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md).

---

## Related

- `@agentstack/react` — `SDKProvider`, domain hooks
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)

**Russian extended README:** [README.md](README.md).
