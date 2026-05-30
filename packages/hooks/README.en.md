# @agentstack/hooks

**Languages:** **English** (npm readme) · [Русский extended reference](README.md)

Headless React Query hooks on `@agentstack/sdk` — AI-first, type-safe, copy-paste ready. Use with or without `@agentstack/react` UI.

---

## 🤖 AI-first design

- **3-second rule** — purpose clear from the hook name
- **Type-safe** — full TypeScript inference
- **Self-documenting** — JSDoc on each export
- **Predictable** — standard React Query pattern

---

## 📦 Install

```bash
npm install @agentstack/hooks @agentstack/sdk @tanstack/react-query
```

Wrap your tree with `QueryClientProvider` and an SDK instance (`SDKProvider` from `@agentstack/react` or custom context).

---

## 🚀 Quick start

```tsx
import { useSecurityData } from '@agentstack/hooks';
import { useSDK } from '@agentstack/react';

function SecurityPage() {
  const sdk = useSDK();
  const { data, isLoading, error } = useSecurityData(sdk);

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((event) => (
        <li key={event.id}>{event.type}</li>
      ))}
    </ul>
  );
}
```

---

## 📚 Domain hooks

### `useSecurityData()`

Security events with filters and auto-refresh.

```typescript
const { data } = useSecurityData(sdk, {
  filters: { severity: 'critical' },
  refreshInterval: 30000,
});
```

### `useAuditData()`

Audit logs for compliance.

```typescript
const { data } = useAuditData(sdk, {
  filters: { action: 'delete', resource_type: 'project' },
});
```

### `useAnalyticsData()`

Dashboard metrics (users, projects, API calls).

```typescript
const { data } = useAnalyticsData(sdk, { period: '7d' });
```

### `useWalletData()`

Multi-currency wallets.

```typescript
const { data } = useWalletData(sdk, { filters: { type: 'game', is_active: true } });
```

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

## 🎯 Hook pattern

```typescript
const {
  data,
  isLoading,
  error,
  refetch,
} = useHook({
  filters,
  refreshInterval,
  enabled,
  staleTime,
});
```

| Pattern | Hook / approach |
|---------|-----------------|
| List + pagination | `useSDKInfiniteQuery` |
| Write + cache bust | `useSDKMutation` + invalidation |
| Entity CRUD boilerplate | `useEntityData` |

Prefer `@agentstack/react` for `SDKProvider` and `useAuth` — [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md).

---

## Related

- `@agentstack/react` — `SDKProvider`, domain hooks
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)

**Russian extended README:** [README.md](README.md).
