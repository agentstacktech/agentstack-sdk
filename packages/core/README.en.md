# AgentStack Core SDK (`@agentstack/sdk`)

**Languages:** **English** (npm readme) · [Русский extended reference](README.md)

TypeScript client for AgentStack — modular API, AgentProtocol, DNA, commerce, i18n, and AI discovery.

**Install:** [docs/SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) · **Hub:** [docs/DOC_HUB.md](../../docs/DOC_HUB.md) · **Style gap:** [docs/DOC_STYLE_GAP.md](../../docs/DOC_STYLE_GAP.md)

---

## 🚀 Quick start

```bash
npm install @agentstack/sdk
```

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  timeout: 10000,
  retryAttempts: 3,
});

const tokens = await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});

const user = await sdk.platform.auth.getProfile();
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Test payment',
  project_id: 1,
});

await sdk.analytics.trackEvent({
  event_type: 'user_action',
  properties: { action: 'button_click' },
  project_id: 1,
});

// i18n (zero config)
console.log(sdk.i18n.t('user_management'));
sdk.i18n.changeLanguage('ru');
```

---

## Entity snapshot repository

For **synchronous** reads of the last JSON snapshot (project data, policies), use the in-memory layer on the SDK instance:

- `sdk.entitySnapshotRepository` — `setSnapshot`, `getSnapshot`, `invalidatePrefix`, `subscribe`
- Prefer **`sdk.platform.protocol`** for commands: `executeCommand`, `readThroughSnapshot`, `invalidateSnapshotPrefix`
- Spec: monorepo [AGENT_PROTOCOL_QUICKSTART.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md)

```typescript
import { snapshotKeyProjectData } from '@agentstack/sdk';

sdk.protocol.setSnapshot(snapshotKeyProjectData(projectId), data, {
  fetchedAt: Date.now(),
  revision: etag,
});
const label = sdk.protocol.readPath(snapshotKeyProjectData(projectId), 'name');
```

---

## 🌍 AgentI18n (zero config)

```typescript
sdk.i18n.t('user_management');
sdk.i18n.t('common:save');
sdk.i18n.changeLanguage('ru');
sdk.i18n.registerNamespace('game', {
  en: { level: 'Level {{n}}' },
  ru: { level: 'Уровень {{n}}' },
});
sdk.i18n.t('game:level', { n: 10 });
sdk.i18n.getAvailableKeys('modules');
```

---

## 🏗️ Architecture

```
AgentStackSDK
├── platform.auth      # Login, tokens, profile
├── platform.api       # Projects, users
├── platform.dna       # 8DNA
├── platform.protocol  # Commands + snapshots
├── payments           # Payments
├── analytics          # Metrics
├── webhooks           # Webhooks
├── wallets            # Wallets
├── notifications      # Notifications
├── scheduler          # Cron tasks
├── i18n               # Translations
└── neural             # Client neural layer
```

Deep dive: [docs/MODULAR_ARCHITECTURE.md](../../docs/MODULAR_ARCHITECTURE.md)

---

## 🔐 Authentication (`sdk.platform.auth`)

### Login & registration

```typescript
const tokens = await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});

await sdk.platform.auth.logout();
const refreshed = await sdk.platform.auth.refresh(tokens.refresh_token);
```

### Profile

```typescript
const profile = await sdk.platform.auth.getProfile();
const profileData = await sdk.platform.auth.getProfileData();

await sdk.platform.auth.updateProfileData({
  display_name: 'Alex Developer',
  bio: 'Integrator',
  social_links: { github: 'https://github.com/example' },
});
```

### Settings

```typescript
const settings = await sdk.platform.auth.getSettings();
await sdk.platform.auth.updateSettings({
  theme: 'dark',
  language: 'en',
  notifications: { email: true, push: false },
});
await sdk.platform.auth.setTheme('dark');
```

### Security

```typescript
await sdk.platform.auth.changePassword({
  currentPassword: 'old',
  newPassword: 'new',
});
const sessions = await sdk.platform.auth.getSessions();
```

### OAuth

```typescript
const providers = await sdk.platform.auth.getOAuthProviders();
await sdk.platform.auth.connectOAuthProvider({ provider: 'google', code: 'oauth_code' });
await sdk.platform.auth.disconnectOAuthProvider('google');
```

---

## 💳 Payments (`sdk.payments`)

```typescript
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Order',
  project_id: 1,
});

const status = await sdk.payments.getPaymentStatus(payment.id);
const stats = await sdk.payments.getPaymentStats();
```

---

## 📊 Analytics (`sdk.analytics`)

```typescript
await sdk.analytics.trackEvent({
  event_type: 'purchase',
  properties: { amount: 99 },
  project_id: 1,
});

const metrics = await sdk.analytics.getDashboardMetrics();
```

---

## 🔑 API keys & projects (`sdk.platform.api`)

```typescript
const projects = await sdk.platform.api.getProjects();
const project = await sdk.platform.api.getProject(1);
const health = await sdk.healthCheck();
```

---

## 🔔 Webhooks (`sdk.webhooks`)

```typescript
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://example.com/hook',
  events: ['user.created'],
  secret: 'secret',
});
await sdk.webhooks.testWebhook(webhook.id);
```

---

## 💰 Wallets (`sdk.wallets`)

```typescript
const balance = await sdk.wallets.getBalance({ project_id: 1 });
```

See capability matrix before calling optional domains.

---

## 🔔 Notifications (`sdk.notifications`)

```typescript
await sdk.notifications.send({
  channel: 'email',
  to: 'user@example.com',
  template: 'welcome',
  project_id: 1,
});
```

---

## ⏰ Scheduler (`sdk.scheduler`)

```typescript
const task = await sdk.scheduler.createTask({
  name: 'Daily sync',
  task_type: 'http_request',
  schedule: '0 2 * * *',
  payload: { url: 'https://api.example.com/sync' },
});
await sdk.scheduler.executeTask(task.id);
```

---

## 🧠 Neural architecture (`sdk.neural`)

```typescript
await sdk.neural.cache.set('user:1', profile, 300);
const cached = await sdk.neural.cache.get('user:1');

await sdk.neural.emitEvent('page_view', { page: '/home' });
```

---

## 👑 Platform operator (not for npm integrators)

`AgentAdmin`, `sdk.admin`, `/api/admin/*` — monorepo only. See [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md).

---

## ⚙️ Configuration

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  timeout: 30000,
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  cache: { enabled: true, ttl: 300 },
  logging: { level: 'info', enabled: true },
});
```

---

## 🔄 Error handling

- SDK throws typed errors with HTTP status
- Use `retry` config for transient failures
- Map errors via [docs/AI_ERROR_ACTION_MATRIX.md](../../docs/AI_ERROR_ACTION_MATRIX.md)

---

## 📊 Metrics & monitoring

```typescript
const metrics = await sdk.getMetrics?.();
const neuralMetrics = await sdk.neural.getMetrics?.();
```

---

## 🧪 Testing

```bash
npm run test -w @agentstack/sdk
```

---

## 🤖 AI discovery

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

[AGENTS.md](../../AGENTS.md) · [docs/SDK_MODULE_CATALOG.md](../../docs/SDK_MODULE_CATALOG.md)

---

## 📚 Resources

- [docs/PROTEIN_SYSTEM_GUIDE.md](../../docs/PROTEIN_SYSTEM_GUIDE.md)
- [docs/PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md)
- [OpenAPI](https://agentstack.tech/swagger)

**Russian extended package README:** [README.md](README.md) (full module-by-module reference).
