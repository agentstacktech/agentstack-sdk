# AgentStack React SDK (`@agentstack/react`)

**Languages:** **English** (npm readme) · [Русский extended reference](README.md)

Official React integration — `SDKProvider`, hooks, and TanStack Query helpers for AgentStack.

**Canonical:** `SDKProvider` + `useSDK()` — `AgentStackProvider` is an alias.

---

## 🚀 Quick start

```bash
npm install @agentstack/react @agentstack/sdk @tanstack/react-query
```

```tsx
import React from 'react';
import { SDKProvider, useAuth, useSDKQuery } from '@agentstack/react';

const config = {
  apiBase: 'https://agentstack.tech/api',
  apiKey: import.meta.env.VITE_AGENTSTACK_API_KEY,
  projectId: 1,
};

function App() {
  return (
    <SDKProvider config={config}>
      <Dashboard />
    </SDKProvider>
  );
}

function Dashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { data: projects } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });

  if (!isAuthenticated) {
    return (
      <button
        onClick={() =>
          login({ email: 'user@example.com', password: 'password', project_id: 1 })
        }
      >
        Sign in
      </button>
    );
  }

  return (
    <div>
      <h1>Hello, {user?.display_name ?? user?.email}</h1>
      <button onClick={logout}>Sign out</button>
      <ul>{(projects ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </div>
  );
}
```

---

## 🎣 Hooks overview

| Hook | Purpose |
|------|---------|
| `useAuth` | Login state, profile, 2FA helpers |
| `useProfile` | Profile CRUD, avatar, username |
| `useSettings` | Theme, notifications, privacy |
| `useProjects` | Project list / create |
| `usePayments` | Payments list / create |
| `useSDK` | `AgentStackSDK` instance |
| `useSDKQuery` | Server read (React Query) |
| `useSDKMutation` | Server write |
| `useSDKInfiniteQuery` | Pagination |
| `useEntityData` | CRUD list helper |

Full guide: [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md)

---

## useAuth

```tsx
import { useAuth } from '@agentstack/react';

function LoginForm() {
  const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await login({
      email: String(fd.get('email')),
      password: String(fd.get('password')),
      project_id: 1,
    });
  };

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user?.display_name}</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading…' : 'Login'}
      </button>
      {error && <p>{String(error)}</p>}
    </form>
  );
}
```

---

## useProfile

```tsx
import { useProfile } from '@agentstack/react';

function ProfileEditor() {
  const { profileData, isLoading, updateProfile, setDisplayName, setBio } = useProfile();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateProfile({ display_name: 'Alex', bio: 'Integrator' });
      }}
    >
      <input defaultValue={profileData?.display_name ?? ''} />
      <button type="submit" disabled={isLoading}>Save</button>
    </form>
  );
}
```

---

## useSettings

```tsx
import { useSettings } from '@agentstack/react';

function SettingsPanel() {
  const { settings, setTheme, setNotification } = useSettings();

  return (
    <div>
      <select value={settings?.theme ?? 'system'} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={settings?.notifications?.email ?? false}
          onChange={(e) => setNotification('email', e.target.checked)}
        />
        Email
      </label>
    </div>
  );
}
```

---

## usePayments

```tsx
import { usePayments } from '@agentstack/react';

function PayButton() {
  const { createPayment, getPayments, isLoading } = usePayments();

  const handlePay = async () => {
    await createPayment({ amount: 1000, currency: 'USD', description: 'Order', project_id: 1 });
    const { payments } = await getPayments({ project_id: 1 });
    console.log(payments);
  };

  return <button onClick={handlePay} disabled={isLoading}>Pay</button>;
}
```

---

## useSDKQuery & mutations

```tsx
import { useSDKQuery, useSDKMutation } from '@agentstack/react';

function Projects() {
  const { data, isLoading, refetch } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });

  const create = useSDKMutation({
    mutationFn: (sdk, name: string) =>
      sdk.platform.api.createProject({ name, description: '' }),
    onSuccess: () => refetch(),
  });

  return (
    <div>
      {isLoading ? '…' : data?.map((p) => <div key={p.id}>{p.name}</div>)}
      <button onClick={() => create.mutate('New project')}>Create</button>
    </div>
  );
}
```

---

## 🧩 Components

| Component | Purpose |
|-----------|---------|
| `SDKProvider` | SDK + React Query context (canonical) |
| `AgentStackProvider` | Legacy name — prefer `SDKProvider` |

---

## 🔄 Invalidation

After `sdk.platform.protocol.executeCommand`, invalidate React Query keys and snapshot prefixes — see monorepo `cacheInvalidation.ts`.

---

## 👑 Admin hooks (operator only)

`useAdminUsers`, `useAdminStats`, `useAdminDashboard` require `sdkAudience: 'platform_operator'` in the AgentStack monorepo — not for tenant npm apps.

Example: [examples/typescript/operator-admin-usage.ts](../../examples/typescript/operator-admin-usage.ts)

---

## ⚙️ Configuration

Pass the same fields as `AgentStackSDK` config into `SDKProvider`:

```tsx
<SDKProvider
  config={{
    apiBase: resolveAgentStackApiBase(),
    apiKey: process.env.AGENTSTACK_API_KEY,
    projectId: 1,
    timeout: 30000,
  }}
>
```

---

## 🎨 Styling & state

Use your design system — hooks return data and actions only. For global SDK state, keep a single `SDKProvider` at the app root; nest feature providers below it.

---

## 📱 SSR

Initialize `SDKProvider` only in client components (or after hydration). Pass `apiBase` from server env into config — do not embed secrets in client bundles.

---

## 🚨 Error handling

Wrap routes in error boundaries; surface `error` from hooks. See [docs/AI_ERROR_ACTION_MATRIX.md](../../docs/AI_ERROR_ACTION_MATRIX.md).

---

## 🧪 Testing

```bash
npm run test -w @agentstack/react
```

---

## 📚 Resources

- [docs/AI_REACT_SCAFFOLD.md](../../docs/AI_REACT_SCAFFOLD.md)
- [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md)
- [packages/core/README.en.md](../core/README.en.md)

**Russian extended README:** [README.md](README.md).
