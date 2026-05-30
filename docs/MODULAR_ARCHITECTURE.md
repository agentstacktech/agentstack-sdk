# AgentStack SDK — modular architecture

**Genetic tag:** `repo.platform.sdk.unified.gen1`  
**RU:** [MODULAR_ARCHITECTURE_ru.md](./MODULAR_ARCHITECTURE_ru.md)

AgentStack SDK uses modular design: each `Agent*` module owns one domain. **Integrators:** start with `sdk.platform.*` and `sdk.getModuleCatalog()` — see [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md) and [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md).

| Audience | Access |
|----------|--------|
| **Integrator** (default npm) | `sdk.platform.*`, domain modules where enabled in capability matrix |
| **Platform operator** | `sdk.admin`, `/api/admin/*` — monorepo only, `sdkAudience: 'platform_operator'` |

---

## 🎯 Overview

Each `Agent*` module owns one domain. Integrators start with **`sdk.platform.*`** and **`sdk.getModuleCatalog()`** — not raw protein calls when protocol covers the flow.

---

## 📦 Module map

| Module | Integrator | Notes |
|--------|------------|-------|
| `sdk.platform.auth` | Yes | Login, tokens, profile |
| `sdk.platform.api` | Yes | Projects, tenant users |
| `sdk.platform.dna` | Yes | `data_*_8dna` tables |
| `sdk.platform.protocol` | Yes | Commands + snapshots (preferred) |
| `sdk.payments` | If enabled | Payments domain |
| `sdk.neural` | Optional | Client cache / events |
| `sdk.commerce` | If enabled | `@agentstack/sdk/commerce/*` |
| `sdk.support` | If enabled | Support inbox |
| `sdk.integrations` | If enabled | Webhooks, recipes |
| `sdk.admin` | **No** | Operator only |

---

## Module reference

### 🔐 AgentAuth — authentication

- Login / logout, access & refresh tokens
- Sessions and API keys
- User profile

```typescript
const tokens = await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});
const profile = await sdk.platform.auth.getProfile();
const sessions = await sdk.platform.auth.getSessions();
```

---

### 👑 AgentAdmin — platform operator only

Not in the npm tenant catalog. Tenant apps use `sdk.platform.api` / `sdk.platform.rbac` for project-scoped users.

**Operator example:** `examples/typescript/operator-admin-usage.ts` · [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md)

---

### 🧠 AgentNeural — client-side neural layer

```typescript
await sdk.neural.cache.set('user:123:profile', userProfile, 300);
const profile = await sdk.neural.cache.get('user:123:profile');

await sdk.neural.emitEvent('user_login', {
  user_id: 123,
  timestamp: new Date().toISOString(),
});

const patterns = await sdk.neural.patterns.analyze('user_behavior', {
  user_id: 123,
  period: '30d',
});
```

---

### 📚 AgentDocs — in-SDK help

```typescript
const help = await sdk.docs.getHelp('auth');
const results = await sdk.docs.search('payment integration');
const examples = await sdk.docs.getCodeExamples({
  language: 'typescript',
  category: 'payments',
});
```

---

### 💳 AgentPayments — payments

```typescript
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'RUB',
  description: 'Test payment',
});
const status = await sdk.payments.getPaymentStatus(payment.id);
```

---

### 📊 AgentAnalytics — metrics

```typescript
await sdk.analytics.trackEvent({
  event_type: 'user_login',
  user_id: 123,
  metadata: { source: 'web' },
});
const metrics = await sdk.analytics.getDashboardMetrics();
```

---

### 🔗 AgentWebhooks — webhooks

```typescript
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.updated'],
  secret: 'webhook_secret',
});
await sdk.webhooks.testWebhook(webhook.id);
```

---

### ⏰ AgentScheduler — scheduled tasks

```typescript
const task = await sdk.scheduler.createTask({
  name: 'Daily Sync',
  task_type: 'http_request',
  schedule: '0 2 * * *',
  payload: { url: 'https://api.example.com/sync' },
});
await sdk.scheduler.executeTask(task.id);
```

---

### 🔧 AgentAPI — projects and health

Prefer `sdk.platform.api` for integrators.

```typescript
const projects = await sdk.platform.api.getProjects();
const health = await sdk.healthCheck();
```

---

## ⚙️ Configuration

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  neural: {
    cache: { enabled: true, ttl: 300, maxSize: 1000 },
    events: { enabled: true, bufferSize: 10000 },
  },
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  cache: { enabled: true, ttl: 300 },
  logging: { level: 'info', enabled: true },
});
```

---

## 🎨 Benefits of modular architecture

1. **Separation of concerns** — one module per domain  
2. **Ease of use** — `sdk.platform.*` facade for integrators  
3. **Predictability** — `Agent*` prefix on root SDK modules  
4. **Extensibility** — new modules without breaking `sdk.platform`  
5. **TypeScript** — typed facades and DNA tables  
6. **Tree-shakeable subpaths** — `@agentstack/sdk/commerce/*`, etc.

---

## 🚀 Quick start

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
});

await sdk.platform.auth.login({ email, password, project_id: 1 });
const projects = await sdk.platform.api.getProjects();
const catalog = sdk.getModuleCatalog();
```

---

## 📚 Resources

- [examples/typescript/](../examples/typescript/)
- [quick-start.md](./quick-start.md)
- [AI_INTEGRATOR_GUIDE.md](./AI_INTEGRATOR_GUIDE.md)
- [PROTEIN_SYSTEM_GUIDE.md](./PROTEIN_SYSTEM_GUIDE.md)
- [OpenAPI](https://agentstack.tech/swagger)

**Doc version:** 2.0 · **SDK:** modular architecture
