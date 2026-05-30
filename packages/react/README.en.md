# AgentStack React SDK (`@agentstack/react`)

**Languages:** **English** (npm readme) · [Русский extended reference](README.md)

Official React integration — `SDKProvider`, hooks, and TanStack Query helpers for AgentStack.

**Canonical:** `SDKProvider` + `useSDK()` — `AgentStackProvider` is an alias.

---

## 🚀 Quick start

### Install

```bash
npm install @agentstack/react @agentstack/sdk @tanstack/react-query
```

### Basic usage

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

Authentication state, login/logout, profile helpers, 2FA toggle, and token refresh.

```tsx
import { useAuth } from '@agentstack/react';

function LoginForm() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    updateProfile,
    changePassword,
    toggle2FA,
    refresh,
  } = useAuth();

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
  const {
    profileData,
    isLoading,
    error,
    updateProfile,
    setUsername,
    setDisplayName,
    setBio,
    setAvatar,
    refresh,
  } = useProfile();

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      display_name: String(fd.get('display_name') ?? ''),
      bio: String(fd.get('bio') ?? ''),
      social_links: {
        github: String(fd.get('github') ?? ''),
      },
    });
  };

  return (
    <form onSubmit={onSave}>
      <input name="display_name" defaultValue={profileData?.display_name ?? ''} />
      <textarea name="bio" defaultValue={profileData?.bio ?? ''} />
      <input name="github" placeholder="GitHub URL" />
      <button type="button" onClick={() => void refresh()} disabled={isLoading}>
        Reload profile
      </button>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving…' : 'Save'}
      </button>
      {error && <p className="agentstack-error">{String(error)}</p>}
    </form>
  );
}
```

`setUsername`, `setDisplayName`, `setBio`, and `setAvatar` are also exposed when you need granular updates without a full form submit.

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

## useAnalytics

```tsx
import { useAnalytics } from '@agentstack/react';

function AnalyticsDashboard() {
  const { isLoading, error, trackEvent, getDashboardMetrics } = useAnalytics();

  const onSignup = async () => {
    await trackEvent({
      event_type: 'user_signup',
      properties: { source: 'landing' },
      project_id: 1,
    });
    const metrics = await getDashboardMetrics({ period: '30d' });
    console.log(metrics);
  };

  return (
    <button onClick={onSignup} disabled={isLoading}>
      Track signup
    </button>
  );
}
```

---

## useProjects

```tsx
import React from 'react';
import { useProjects } from '@agentstack/react';

function ProjectManager() {
  const { isLoading, error, getProjects, createProject } = useProjects();
  const [projects, setProjects] = React.useState<{ id: number; name: string }[]>([]);

  React.useEffect(() => {
    getProjects().then((r) => setProjects(r.projects));
  }, [getProjects]);

  return (
    <div>
      {isLoading ? <p>Loading…</p> : null}
      <ul>{projects.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      <button
        onClick={() => createProject({ name: 'New app', description: 'From React hook' })}
      >
        Create project
      </button>
      {error && <p>{String(error)}</p>}
    </div>
  );
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

### SDKProvider

```tsx
import { SDKProvider } from '@agentstack/react';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: 'https://agentstack.tech/api',
        apiKey: import.meta.env.VITE_AGENTSTACK_API_KEY,
        projectId: 1,
        timeout: 10000,
      }}
    >
      <YourApp />
    </SDKProvider>
  );
}
```

| Export | Purpose |
|--------|---------|
| `SDKProvider` | SDK + React Query context (**canonical**) |
| `AgentStackProvider` | Legacy alias — prefer `SDKProvider` |

Wrap with `QueryClientProvider` from TanStack Query if you use hooks outside the provider tree.

### ProfileComponent

Ready-made profile editor (example UI):

```tsx
import { ProfileComponent } from '@agentstack/react';

export function ProfilePage() {
  return (
    <div>
      <h1>Profile</h1>
      <ProfileComponent />
    </div>
  );
}
```

### ProjectsComponent

```tsx
import { ProjectsComponent } from '@agentstack/react';

export function ProjectsPage() {
  return (
    <div>
      <h1>Projects</h1>
      <ProjectsComponent />
    </div>
  );
}
```

---

## 🔄 Invalidation

After `sdk.platform.protocol.executeCommand`, invalidate React Query keys and snapshot prefixes — see monorepo `cacheInvalidation.ts`.

---

## 👑 Admin hooks (operator only)

`useAdminUsers`, `useAdminStats`, `useAdminDashboard` require `sdkAudience: 'platform_operator'` in the AgentStack monorepo — not for tenant npm apps.

Example: [examples/typescript/operator-admin-usage.ts](../../examples/typescript/operator-admin-usage.ts)

---

## ⚙️ Configuration

### SDKConfig shape

```tsx
interface SDKConfig {
  apiBase: string;
  apiKey?: string;
  projectId?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCaching?: boolean;
  enableMetrics?: boolean;
  defaultHeaders?: Record<string, string>;
  neural?: {
    cache?: { enabled?: boolean; ttl?: number; maxSize?: number };
    events?: { enabled?: boolean; bufferSize?: number };
  };
}
```

### SDKConfig (via `SDKProvider`)

| Field | Purpose |
|-------|---------|
| `apiBase` | API root URL |
| `apiKey` | API key |
| `projectId` | Default project |
| `timeout` | Request timeout (ms) |
| `retryAttempts` | HTTP retries |
| `neural.cache` | Client cache TTL/size |

```tsx
<SDKProvider
  config={{
    apiBase: 'https://agentstack.tech/api',
    apiKey: process.env.AGENTSTACK_API_KEY,
    projectId: 1,
    timeout: 15000,
    retryAttempts: 3,
    neural: {
      cache: { enabled: true, ttl: 300000, maxSize: 1000 },
      events: { enabled: true, bufferSize: 100 },
    },
  }}
>
  <YourApp />
</SDKProvider>
```

### Custom provider config

```tsx
<SDKProvider
  config={{
    apiBase: 'https://agentstack.tech/api',
    apiKey: process.env.AGENTSTACK_API_KEY,
    projectId: 1,
    timeout: 15000,
    retryAttempts: 5,
    retryDelay: 2000,
    enableCaching: true,
    enableMetrics: true,
    defaultHeaders: { 'X-Custom-Header': 'my-app' },
    neural: {
      cache: { enabled: true, ttl: 300000, maxSize: 1000 },
      events: { enabled: true, bufferSize: 100 },
    },
  }}
>
  <YourApp />
</SDKProvider>
```

---

## 🎨 Styling

Example components use CSS class hooks you can override:

```css
.agentstack-profile { }
.agentstack-settings { }
.agentstack-payments { }
.agentstack-analytics { }
.agentstack-projects { }
.agentstack-loading { }
.agentstack-error { }
.agentstack-success { }
.agentstack-input { }
.agentstack-button { }
.agentstack-select { }
.agentstack-textarea { }
```

Prefer your design system — hooks return data/actions; components are optional starters.

Override classes in your global CSS or CSS modules; example components ship unstyled hooks you can wrap.

---

## 🔄 State management

React SDK pairs with TanStack Query. Invalidate after mutations:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@agentstack/react';

function Editor() {
  const queryClient = useQueryClient();
  const { updateProfile } = useProfile();

  const save = useMutation({
    mutationFn: () => updateProfile({ display_name: 'Alex' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  return <button onClick={() => save.mutate()}>Save</button>;
}
```

---

## 📱 SSR

```tsx
import { SSRProvider, useSSRAuth } from '@agentstack/react';

function App() {
  return (
    <SSRProvider config={{ apiBase: 'https://agentstack.tech/api', projectId: 1 }}>
      <Page />
    </SSRProvider>
  );
}

function Page() {
  const { user, isAuthenticated, isHydrated } = useSSRAuth();
  if (!isHydrated) return <div>Loading…</div>;
  return <div>{isAuthenticated ? `Hi ${user?.display_name}` : 'Sign in'}</div>;
}
```

Also: `SSRProfileComponent`, `useSSRProfile`, `useSSRSettings` from `@agentstack/react` (SSR entry).

---

## 🚨 Error handling

```tsx
function LoginForm() {
  const { login, error, isLoading } = useAuth();

  return (
    <div>
      {error && <div className="agentstack-error">{String(error)}</div>}
      <button
        disabled={isLoading}
        onClick={() =>
          login({ email: 'user@example.com', password: 'password', project_id: 1 })
        }
      >
        Sign in
      </button>
    </div>
  );
}
```

See [docs/AI_ERROR_ACTION_MATRIX.md](../../docs/AI_ERROR_ACTION_MATRIX.md).

---

## 🧪 Testing

```bash
npm run test -w @agentstack/react
```

```tsx
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SDKProvider, useAuth } from '@agentstack/react';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <SDKProvider config={{ apiBase: 'http://localhost:8000/api', projectId: 1 }}>{children}</SDKProvider>
  </QueryClientProvider>
);

test('useAuth starts logged out', () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.isAuthenticated).toBe(false);
});
```

### Mocking SDK calls

```tsx
import { vi } from 'vitest';

vi.mock('@agentstack/react', async () => {
  const actual = await vi.importActual<typeof import('@agentstack/react')>('@agentstack/react');
  return {
    ...actual,
    useAuth: () => ({
      user: { display_name: 'Test' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});
```

---

## 📚 Resources

- [packages/core/README.en.md](../core/README.en.md)
- [docs/AI_REACT_SCAFFOLD.md](../../docs/AI_REACT_SCAFFOLD.md)
- [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md)
- [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md)
- [examples/](../../examples/)

## 🤝 Support

1. [docs/FAQ_DETAILED.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/FAQ_DETAILED.md)
2. [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
3. Platform: https://agentstack.tech

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

Peer package: [@agentstack/hooks](../hooks/README.en.md) for headless data hooks.

## 📄 License

MIT

**Russian extended README:** [README.md](README.md).
