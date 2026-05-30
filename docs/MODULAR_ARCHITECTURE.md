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

**Integrator:** yes · **Operator:** N/A (use monorepo admin for ecosystem users)

- Login / logout, access & refresh tokens
- Profile, settings, theme, notifications
- Sessions, password change, OAuth providers
- Prefer `sdk.platform.auth` over legacy `sdk.auth`

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

Payments, refunds, provider configuration, and payment webhooks.

**Capabilities:** create/cancel payments, list transactions, configure providers, payment webhook logs.

```typescript
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Test payment',
  project_id: 1,
});
const status = await sdk.payments.getPaymentStatus(payment.id);
const stats = await sdk.payments.getPaymentStats({ project_id: 1 });
```

---

### 📊 AgentAnalytics — metrics

Analytics events, dashboards, custom reports, alerts, and export.

**Capabilities:** `trackEvent`, dashboard/usage stats, funnels, custom reports, metrics CRUD.

```typescript
await sdk.analytics.trackEvent({
  event_type: 'user_login',
  project_id: 1,
  metadata: { source: 'web' },
});
const metrics = await sdk.analytics.getDashboardMetrics();
```

---

### 🔗 AgentWebhooks — webhooks

Register outbound webhooks, rotate secrets, inspect delivery logs.

```typescript
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.updated'],
  secret: 'webhook_secret',
});
await sdk.webhooks.testWebhook(webhook.id);
await sdk.webhooks.getWebhookEvents(webhook.id, { limit: 20 });
```

---

### ⏰ AgentScheduler — scheduled tasks

Cron-style tasks and manual execution for integrator automation.

```typescript
const task = await sdk.scheduler.createTask({
  name: 'Weekly report',
  task_type: 'http_request',
  schedule: '0 0 * * 1',
  payload: { url: 'https://api.example.com/report' },
  project_id: 1,
});
await sdk.scheduler.executeTask(task.id);
await sdk.scheduler.getTaskExecutions(task.id);
```

---

### 🔧 AgentAPI — projects and health

Prefer `sdk.platform.api` for integrators.

```typescript
const projects = await sdk.platform.api.getProjects();
const project = await sdk.platform.api.createProject({
  name: 'My Project',
  description: 'Integrator app',
});
await sdk.platform.api.addUserToProject(project.id, {
  user_email: 'member@example.com',
  role: 'member',
});
const health = await sdk.healthCheck();
```

---

### 💰 AgentWallets — balances & transfers

Project-scoped wallets for holds, deposits, and transfers (when enabled in the capability matrix).

```typescript
const { wallet } = await sdk.wallets.createWallet({
  name: 'Main',
  type: 'business',
  initial_currency: 'USD',
});
await sdk.wallets.deposit(wallet.id, 'USD', '100.00', 'Top-up');
const balance = await sdk.wallets.getWalletBalance(wallet.id);
```

---

### 🔔 AgentNotifications — inbox & templates

Transactional and bulk notifications across channels.

```typescript
await sdk.notifications.createNotification({
  project_id: 1,
  user_id: 123,
  title: 'Welcome',
  message: 'Thanks for joining',
  channel: 'in_app',
});
const template = await sdk.notifications.createNotificationTemplate(1, {
  name: 'Welcome Email',
  type: 'transactional',
  channel: 'email',
  subject: 'Hello',
  title: 'Welcome',
  message: 'Thanks!',
  variables: ['user.name'],
});
```

---

## 🎨 Benefits of modular architecture

1. **Separation of concerns** — each `Agent*` module owns one domain  
2. **Selective adoption** — enable only modules your app needs via the capability matrix  
3. **Predictable naming** — `Agent*` prefix on SDK modules; `sdk.platform.*` for integrators  
4. **Extensibility** — add domains without breaking existing `sdk.platform` facades  
5. **TypeScript-first** — typed requests/responses and DNA table helpers  
6. **Tree-shakeable subpaths** — `@agentstack/sdk/commerce/*`, economy, assets when published  

### Design principles (from platform genes)

- **Integrator-safe defaults** — no ecosystem `/api/admin/*` on npm; see [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md)  
- **Protocol-first writes** — prefer `executeCommand` + snapshot invalidation over ad-hoc REST when the command exists  
- **Capability matrix** — call `getCapabilityMatrix()` before optional modules (`commerce`, `support`, `integrations`)  
- **AI discovery** — `getModuleCatalog()` returns module ids, hints, and doc links for agents  

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

**Maintainers:** when adding a new `Agent*` module, update this file, [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md), and `packages/core/src/module-catalog.ts` in the same PR.
