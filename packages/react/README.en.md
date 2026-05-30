# AgentStack React SDK (`@agentstack/react`)

**Languages:** **English** (npm readme) · [Русский](README.md)

Official React integration — `SDKProvider`, hooks, TanStack Query helpers.

**Canonical provider:** `SDKProvider` + `useSDK()` — `AgentStackProvider` is an alias.

---

## Install

```bash
npm install @agentstack/react @agentstack/sdk @tanstack/react-query
```

---

## Quick start

```tsx
import { SDKProvider, useSDK, useAuth, useSDKQuery } from '@agentstack/react';
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
      <Dashboard />
    </SDKProvider>
  );
}

function Dashboard() {
  const { isAuthenticated, login, logout } = useAuth();
  const sdk = useSDK();

  const { data: projects } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (client) => client.platform.api.getProjects(),
  });

  if (!isAuthenticated) {
    return <button onClick={() => login('user@example.com', 'password')}>Login</button>;
  }
  return (
    <div>
      <button onClick={logout}>Logout</button>
      <ul>{(projects ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </div>
  );
}
```

---

## Hooks (integrator)

| Hook | Use |
|------|-----|
| `useSDK` | Access `AgentStackSDK` instance |
| `useAuth` | Login state |
| `useSDKQuery` | Server read (React Query) |
| `useSDKMutation` | Server write |
| `useSDKInfiniteQuery` | Pagination |
| `useEntityData` | CRUD list helper |
| `useProjects` / `usePayments` | Domain shortcuts |

**Admin hooks** (`useAdminUsers`, …): monorepo **`platform_operator` only** — [INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md).

---

## Docs

- [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md)
- [docs/AI_REACT_SCAFFOLD.md](../../docs/AI_REACT_SCAFFOLD.md)
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)

Russian extended guide: [README.md](README.md).
