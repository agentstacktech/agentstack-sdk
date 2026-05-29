# AgentStack SDK — modular architecture

**Genetic tag:** `repo.platform.sdk.unified.gen1`  
**RU:** [MODULAR_ARCHITECTURE_ru.md](./MODULAR_ARCHITECTURE_ru.md)

Overview of top-level SDK modules (`Agent*` prefix). For AI discovery use `sdk.getModuleCatalog()` — see [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md).

**Integrator entry:** prefer `sdk.platform.*` ([INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md)).

---

## Module map

| Module | Integrator use | Notes |
|--------|----------------|-------|
| `sdk.platform.auth` | Login, tokens, profile | Post-login syncs `projectId` |
| `sdk.platform.api` | Projects, users (tenant) | Not ecosystem admin |
| `sdk.platform.dna` | 8DNA tables | `data_*_8dna` |
| `sdk.platform.protocol` | Commands + snapshots | Prefer over raw `/commands` |
| `sdk.payments` | Payments | Check capability matrix |
| `sdk.neural` | Client cache / events | Optional |
| `sdk.commerce` | Shop, assets | `@agentstack/sdk/commerce/*` |
| `sdk.support` | Support inbox | `sdk.support.gen2` |
| `sdk.integrations` | Integration hub | Webhooks, recipes |
| `sdk.admin` | **Blocked** for integrators | `platform_operator` only |

---

## AgentAuth (authentication)

```typescript
await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});
const profile = await sdk.platform.auth.getProfile();
```

---

## AgentAdmin (platform operator only)

Not in npm tenant catalog. Use `sdk.platform.api` / `sdk.platform.rbac` for project-scoped users. See [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md).

---

## AgentNeural (client-side)

```typescript
await sdk.neural.cache.set('user:123:profile', data, 300);
const cached = await sdk.neural.cache.get('user:123:profile');
```

---

## AgentPayments

```typescript
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'RUB',
  description: 'Order',
});
```

---

## Configuration

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  neural: { cache: { enabled: true, ttl: 300 } },
});
```

---

## Benefits

1. **Separation of concerns** — one module per domain  
2. **Tree-shakeable imports** — subpaths where exported  
3. **Typed surfaces** — full TypeScript  
4. **Extensibility** — new modules without breaking facades  

---

## Resources

- [examples/typescript/](../examples/typescript/)
- [quick-start.md](./quick-start.md)
- [AI_INTEGRATOR_GUIDE.md](./AI_INTEGRATOR_GUIDE.md)
- [OpenAPI](https://agentstack.tech/swagger)

Full Russian reference: [MODULAR_ARCHITECTURE_ru.md](./MODULAR_ARCHITECTURE_ru.md).
