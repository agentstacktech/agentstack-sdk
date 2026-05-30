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

## 🔧 Options

### Common (all hooks)

```typescript
{
  refreshInterval?: number; // default 60000
  enabled?: boolean;        // default true
  staleTime?: number;       // default 300000
}
```

### `useSecurityData`

```typescript
useSecurityData(sdk, {
  filters: {
    severity: 'critical',
    type: 'failed_login',
    from_date: '2025-01-01',
  },
});
```

### `useAuditData`

```typescript
useAuditData(sdk, {
  filters: { action: 'delete', resource_type: 'project' },
});
```

### `useAnalyticsData` / `useWalletData`

```typescript
useAnalyticsData(sdk, { period: '7d', project_id: 1 });
useWalletData(sdk, { filters: { type: 'game', is_active: true } });
```

---

## 🎨 Example: ops dashboard

```tsx
import { useSDK } from '@agentstack/react';
import { useSecurityData, useAuditData, useAnalyticsData } from '@agentstack/hooks';

function OpsDashboard() {
  const sdk = useSDK();
  const security = useSecurityData(sdk, { filters: { severity: 'critical' } });
  const audit = useAuditData(sdk, { filters: { action: 'delete' } });
  const analytics = useAnalyticsData(sdk, { period: '7d' });

  if (security.isLoading || audit.isLoading) return <div>Loading…</div>;

  return (
    <div>
      <section>Critical events: {security.data.length}</section>
      <section>Audit rows: {audit.data.length}</section>
      <section>Analytics: {JSON.stringify(analytics.data)}</section>
    </div>
  );
}
```

---

## 📖 Type definitions

```typescript
import type {
  SecurityEvent,
  AuditLog,
  AnalyticsMetrics,
  Wallet,
} from '@agentstack/hooks';
```

Hover in the IDE for full JSDoc on each type.

---

## 🚀 Advanced: custom UI

```tsx
function CustomSecurityDashboard() {
  const sdk = useSDK();
  const { data, isLoading, refetch } = useSecurityData(sdk);

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <div className="grid">
        {data.map((event) => (
          <article key={event.id}>
            <strong>{event.severity}</strong> {event.type}
          </article>
        ))}
      </div>
    </div>
  );
}
```

---

## 🤖 AI usage guide

1. `import { useSecurityData } from '@agentstack/hooks'`
2. `const sdk = useSDK()` from `@agentstack/react`
3. `const { data, isLoading, error } = useSecurityData(sdk)`
4. Render `data` (always an array when loaded)

---

## 📊 React Query integration

Hooks use React Query internally:

- Automatic caching and deduplication
- Background refetch (`refreshInterval`)
- Stale-while-revalidate (`staleTime`)
- Error retry (configure via `QueryClient`)

---

## Related

- `@agentstack/react` — `SDKProvider`, domain hooks
- [packages/core/README.en.md](../core/README.en.md) — REST modules behind these hooks
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)
- [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md)
- [React Query docs](https://tanstack.com/query)

**Russian extended README:** [README.md](README.md).

## 📄 License

MIT
