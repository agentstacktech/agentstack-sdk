# AI React scaffold

**Genetic tags:** `sdk.react.entity.gen1` · `sdk.react.invalidation.gen1`  
**EN:** [AI_REACT_SCAFFOLD.md](./AI_REACT_SCAFFOLD.md)

```tsx
import {
  SDKProvider,
  useEntityData,
  useSDKMutationWithInvalidation,
  InvalidationRegistryProvider,
} from '@agentstack/react';
import { resolveAgentStackApiBase } from '@agentstack/sdk';

export function App() {
  return (
    <SDKProvider config={{ apiBase: resolveAgentStackApiBase() }}>
      <InvalidationRegistryProvider registry={yourRegistry}>
        <WalletsList projectId={1} />
      </InvalidationRegistryProvider>
    </SDKProvider>
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

Пример registry в monorepo: `agentstack-frontend/src/lib/appInvalidationRegistry.ts`  
Подробнее: [REACT_QUERY_INTEGRATION_ru.md](./REACT_QUERY_INTEGRATION_ru.md) · [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).
