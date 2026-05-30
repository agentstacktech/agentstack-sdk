# @agentstack/hooks

**Languages:** **English** (npm readme) · [Русский](README.md)

Headless React Query hooks built on `@agentstack/sdk` — use with or without `@agentstack/react` UI helpers.

## Install

```bash
npm install @agentstack/hooks @agentstack/sdk @tanstack/react-query
```

Requires a configured SDK instance (via parent `SDKProvider` or manual client).

## Use

```tsx
import { useSDKQuery } from '@agentstack/hooks';
import { useSDK } from '@agentstack/react';

function List() {
  return useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });
}
```

Prefer `@agentstack/react` for `SDKProvider` + auth hooks — [docs/REACT_QUERY_INTEGRATION.md](../../docs/REACT_QUERY_INTEGRATION.md).

## Docs

- [DOC_HUB.md](../../docs/DOC_HUB.md)
- [INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md)

## Related packages

- `@agentstack/react` — `SDKProvider` and UI hooks
- `@agentstack/sdk` — core client

Russian guide: [README.md](README.md).
