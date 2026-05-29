# AgentStack React SDK (`@agentstack/react`)

**Languages:** **English** (this file) · [Русский](README.md)

Official React integration — hooks, `SDKProvider`, TanStack Query helpers.

## Install

```bash
npm install @agentstack/react @agentstack/sdk @tanstack/react-query
```

## Quick start

```tsx
import { SDKProvider, useSDK, useAuth } from '@agentstack/react';

const config = {
  apiBase: 'https://agentstack.tech/api',
  apiKey: process.env.AGENTSTACK_API_KEY,
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
  const { isAuthenticated, login } = useAuth();
  const sdk = useSDK();
  // sdk.platform.api, useSDKQuery — see docs/REACT_QUERY_INTEGRATION.md
}
```

## Docs

- [REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md)
- [INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md) — admin hooks = `platform_operator` only

Full Russian guide: [README.md](README.md).
