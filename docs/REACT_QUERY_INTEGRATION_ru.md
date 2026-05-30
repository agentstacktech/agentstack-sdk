# Интеграция React Query

**Genetic tag:** `sdk.react.query.gen1`  
**EN:** [REACT_QUERY_INTEGRATION.md](./REACT_QUERY_INTEGRATION.md)

Используйте хуки `@agentstack/react`, а не `useState` + `useEffect` для серверных данных.

---

## Provider (канон)

**Интеграторы:** оборачивайте приложение в **`SDKProvider`** и читайте клиент через **`useSDK()`**.

`AgentStackProvider` — **алиас** `SDKProvider`; в новом коде предпочитайте `SDKProvider`.

```tsx
import { SDKProvider, useSDK } from '@agentstack/react';
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
      <YourRoutes />
    </SDKProvider>
  );
}

function ProjectsList() {
  const sdk = useSDK();
  // useSDKQuery ниже
}
```

---

## Хуки

| Хук | Назначение |
|-----|------------|
| `useSDKQuery` | Чтение через SDK |
| `useSDKMutation` | Запись |
| `useSDKInfiniteQuery` | Пагинация |
| `useSDKMutationWithInvalidation` | Запись + registry |
| `useEntityData` | CRUD списки |

---

## Пример query

```tsx
import { useSDKQuery } from '@agentstack/react';

function ProjectList() {
  const { data, isLoading, error } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });
  if (isLoading) return <div>Загрузка…</div>;
  if (error) return <div>Ошибка</div>;
  return (
    <ul>
      {(data ?? []).map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## Инвалидация

После command-bus инвалидируйте снапшоты **и** ключи React Query:

```typescript
await sdk.platform.protocol.executeCommand({ /* … */ });
await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
// queryClient.invalidateQueries({ queryKey: ['projects'] })
```

Хелпер monorepo: `agentstack-frontend/src/lib/cacheInvalidation.ts`.

---

## Admin hooks

`useAdminUsers` и родственные — только **`sdkAudience: 'platform_operator'`** (monorepo AgentStack). См. [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).

---

## Связанные документы

- [AI_REACT_SCAFFOLD_ru.md](./AI_REACT_SCAFFOLD_ru.md)
- [packages/react/README.en.md](../packages/react/README.en.md)
