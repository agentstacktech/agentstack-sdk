# AI React scaffold

**Genetic tags:** `sdk.react.entity.gen1` · `sdk.react.invalidation.gen1`

```tsx
import {
  AgentStackProvider,
  useEntityData,
  useSDKMutationWithInvalidation,
  InvalidationRegistryProvider,
} from '@agentstack/react';
import { resolveAgentStackApiBase } from '@agentstack/sdk';

export function App() {
  return (
    <AgentStackProvider config={{ apiBase: resolveAgentStackApiBase() }}>
      <InvalidationRegistryProvider registry={yourRegistry}>
        <WalletsList projectId={1} />
      </InvalidationRegistryProvider>
    </AgentStackProvider>
  );
}

function WalletsList({ projectId }: { projectId: number }) {
  const { data, isLoading } = useEntityData('wallets', {
    projectId,
    fetchList: (sdk, signal) => sdk.wallets.list({ projectId }, { signal }),
  });
  const create = useSDKMutationWithInvalidation({
    invalidateEntity: 'wallets',
    mutationFn: (sdk, body) => sdk.wallets.create(body),
  });
  if (isLoading) return null;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

Monorepo registry example: `agentstack-frontend/src/lib/appInvalidationRegistry.ts`  
Feature quickstart: [../../docs/SDK_FEATURE_QUICKSTART.md](../../docs/SDK_FEATURE_QUICKSTART.md)
