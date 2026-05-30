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

### Legacy `sdk.auth` vs `sdk.platform.auth`

Both point at the same **AgentAuth** module. New integrations should call **`sdk.platform.auth`** (stable integrator facade). Examples in this file use `sdk.platform.*` unless noted.

```typescript
// Equivalent for login:
await sdk.platform.auth.login({ email, password, project_id: 1 });
// await sdk.auth.login({ email, password, project_id: 1 });
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

**Integrators** start with `sdk.platform.*` and `sdk.getModuleCatalog()`. Optional domains (`commerce`, `support`, `integrations`) appear only when enabled for your project — always check **`sdk.getCapabilityMatrix()`** before calling a module in production.

Deep dive: [docs/MODULAR_ARCHITECTURE.md](../../docs/MODULAR_ARCHITECTURE.md) · [docs/SDK_MODULE_CATALOG.md](../../docs/SDK_MODULE_CATALOG.md)

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

### Profile media & username

```typescript
await sdk.platform.auth.setAvatar('data:image/jpeg;base64,...');
await sdk.platform.auth.setUsername('alex_dev');
```

### Two-factor authentication & alerts

```typescript
const { enabled } = await sdk.platform.auth.get2FAStatus();
await sdk.platform.auth.toggle2FA(true);

const { alerts } = await sdk.platform.auth.getSecurityAlerts();
```

### Sessions

```typescript
const { sessions_by_project } = await sdk.platform.auth.getSessions();
const first = Object.values(sessions_by_project)[0]?.[0];
if (first) {
  await sdk.platform.auth.terminateSession(first.session_uuid, 'Signed out remotely');
}
await sdk.platform.auth.terminateAllSessions('Security reset');
```

### Notification preferences (auth module)

```typescript
await sdk.platform.auth.setNotification('email', true);
await sdk.platform.auth.setNotification('push', false);
```

---

## 💳 Payments (`sdk.payments`)

### Create and manage payments

```typescript
const payment = await sdk.payments.createPayment({
  amount: 2500,
  currency: 'USD',
  description: 'Premium subscription',
  project_id: 1,
});

const details = await sdk.payments.getPayment(payment.id);
await sdk.payments.cancelPayment(payment.id, 'User request');

const list = await sdk.payments.getPayments({
  project_id: 1,
  status: 'completed',
  limit: 20,
  offset: 0,
});
```

### Payment methods & providers

```typescript
const methods = await sdk.payments.getPaymentMethods();
await sdk.payments.configureProvider({
  provider_name: 'stripe',
  merchant_id: 1,
  api_key: process.env.STRIPE_KEY!,
  webhook_secret: process.env.STRIPE_WH_SECRET!,
});
const providers = await sdk.payments.getProviders();
```

### Refunds & transactions

```typescript
await sdk.payments.refundPayment(payment.id, {
  amount: 1000,
  reason: 'Customer request',
});

const transactions = await sdk.payments.getTransactions({ limit: 50 });
const stats = await sdk.payments.getPaymentStats({ project_id: 1 });
```

### Payment webhooks

```typescript
const wh = await sdk.payments.createPaymentWebhook({
  url: 'https://example.com/payments/hook',
  events: ['payment.completed'],
});
const logs = await sdk.payments.getWebhookLogs(wh.id, { limit: 20 });
```

---

## 📊 Analytics (`sdk.analytics`)

### Event tracking

```typescript
await sdk.analytics.trackEvent({
  event_type: 'user_signup',
  properties: { source: 'google', plan: 'premium' },
  project_id: 1,
});
```

### Dashboard & usage

```typescript
const metrics = await sdk.analytics.getDashboardMetrics({
  project_id: 1,
  period: 'month',
});

const usage = await sdk.analytics.getUsageStats({
  start_date: '2025-01-01',
  end_date: '2025-01-31',
});

const realtime = await sdk.analytics.getRealTimeMetrics(1);
```

### Custom reports & metrics

```typescript
const report = await sdk.analytics.createCustomReport({
  name: 'Conversion by channel',
  description: 'Signup → purchase funnel',
  query: 'SELECT event_type, COUNT(*) FROM events GROUP BY event_type',
});

const result = await sdk.analytics.runCustomReport(report.report_id);
const reports = await sdk.analytics.getCustomReports();
await sdk.analytics.deleteCustomReport(report.report_id);

const metric = await sdk.analytics.createMetric(1, {
  name: 'user_engagement',
  description: 'Engagement gauge',
  type: 'gauge',
});
const metrics = await sdk.analytics.getMetrics(1);
await sdk.analytics.updateMetric(metric.metric_id, { description: 'Updated' });
await sdk.analytics.deleteMetric(metric.metric_id);
```

### Funnels, alerts, export

```typescript
const funnel = await sdk.analytics.getConversionFunnel({
  project_id: 1,
  steps: ['visit', 'signup', 'purchase'],
});

const alerts = await sdk.analytics.getAlerts({ status: 'active', severity: 'high' });
await sdk.analytics.createAlert({
  type: 'error_rate',
  condition: 'greater_than',
  threshold: 0.05,
  severity: 'high',
  notification_channels: ['email'],
});

const exportJob = await sdk.analytics.exportAnalytics({
  format: 'csv',
  type: 'dashboard',
  period: 'month',
});
const exportStatus = await sdk.analytics.getExportStatus(exportJob.export_id);
```

### Revenue & agents (when enabled)

```typescript
const revenue = await sdk.analytics.getRevenueChart({ project_id: 1, period: 'month' });
const agents = await sdk.analytics.getAgentsList({ project_id: 1, limit: 50 });
```

---

## 🔑 Projects (`sdk.platform.api`)

### Project CRUD

```typescript
const projects = await sdk.platform.api.getProjects();
const project = await sdk.platform.api.createProject({
  name: 'New app',
  description: 'Integrator project',
});
await sdk.platform.api.updateProject(project.id, { name: 'Renamed', description: 'Updated' });
await sdk.platform.api.deleteProject(project.id);
const health = await sdk.healthCheck();
```

### Project members & settings

```typescript
const { users } = await sdk.platform.api.getProjectUsers(project.id, { limit: 50 });
await sdk.platform.api.addUserToProject(project.id, {
  user_email: 'member@example.com',
  role: 'member',
});
await sdk.platform.api.removeUserFromProject(project.id, 456);

const stats = await sdk.platform.api.getProjectStats(project.id);
const data = await sdk.platform.api.getProjectData(project.id);
```

Check `sdk.getCapabilityMatrix()` before optional domains.

---

## 🛡️ RBAC (`sdk.platform.rbac`)

Project-scoped roles and permission checks (when RBAC is enabled for your project).

```typescript
const { roles } = await sdk.platform.rbac.getRoles(1);

const role = await sdk.platform.rbac.createRole(1, {
  id: 'editor',
  name: 'Editor',
  description: 'Can edit content',
  permissions: { pages: ['read', 'write'] },
});

await sdk.platform.rbac.assignRole(1, 123, role.id);

const check = await sdk.platform.rbac.checkPermission(1, 'pages.write', 123);
if (!check.has_permission) {
  throw new Error('Forbidden');
}

const { permissions } = await sdk.platform.rbac.getAvailablePermissions();
```

---

## 🔔 Webhooks (`sdk.webhooks`)

### CRUD & delivery

```typescript
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://your-app.com/webhook',
  events: ['payment.completed', 'user.created'],
  secret: 'webhook_secret',
  is_active: true,
});

const webhooks = await sdk.webhooks.getWebhooks({ project_id: 1 });
await sdk.webhooks.updateWebhook(webhook.id, { events: ['payment.failed'] });
await sdk.webhooks.deleteWebhook(webhook.id);
await sdk.webhooks.activateWebhook(webhook.id);
await sdk.webhooks.deactivateWebhook(webhook.id);
await sdk.webhooks.testWebhook(webhook.id, { payload: { test: true } });
await sdk.webhooks.rotateWebhookSecret(webhook.id);
```

### Logs & templates

```typescript
const events = await sdk.webhooks.getWebhookEvents(webhook.id, { limit: 20 });
await sdk.webhooks.retryWebhookEvent(events.events[0].id);
const stats = await sdk.webhooks.getWebhookStats({ project_id: 1 });
const types = await sdk.webhooks.getAvailableEventTypes();
await sdk.webhooks.validateWebhookUrl('https://your-app.com/webhook');
```

---

## 💰 Wallets (`sdk.wallets`)

### Wallet management

```typescript
const { wallet } = await sdk.wallets.createWallet({
  name: 'Main wallet',
  type: 'business',
  initial_currency: 'USD',
});

const { wallets } = await sdk.wallets.getWallets();
await sdk.wallets.updateWallet(wallet.id, { name: 'Renamed wallet' });
await sdk.wallets.deleteWallet(wallet.id);
```

### Balance operations

```typescript
await sdk.wallets.deposit(wallet.id, 'USD', '50.00', 'Top-up');
await sdk.wallets.withdraw(wallet.id, 'USD', '25.00', 'Payout');

await sdk.wallets.transferBetweenWallets({
  from_wallet_id: wallet.id,
  to_wallet_id: 'other-wallet-id',
  amount: 10,
  currency: 'USD',
});

const balance = await sdk.wallets.getWalletBalance(wallet.id);

await sdk.wallets.freezeWalletBalance(wallet.id, {
  amount: 100,
  reason: 'Offer hold',
});
await sdk.wallets.unfreezeWalletBalance(wallet.id, {
  amount: 100,
  reason: 'Release hold',
});
```

### Wallet history & stats

```typescript
const txs = await sdk.wallets.getWalletTransactions(wallet.id, { limit: 50 });
const { transactions } = await sdk.wallets.getTransactions({ walletId: wallet.id, limit: 50 });
const projectTxs = await sdk.wallets.getProjectTransactions(1, { limit: 20 });
const stats = await sdk.wallets.getWalletStats(1, { currency: 'USD' });
const rates = await sdk.wallets.getExchangeRates();
```

---

## 🔔 Notifications (`sdk.notifications`)

### Send & inbox

```typescript
const notification = await sdk.notifications.createNotification({
  project_id: 1,
  user_id: 123,
  title: 'Welcome',
  message: 'Thanks for signing up',
  channel: 'in_app',
});

await sdk.notifications.markAsRead(notification.id);
await sdk.notifications.markAllAsRead(1, 123);
const inbox = await sdk.notifications.getNotifications(1, { limit: 20 });
```

### Templates & bulk

```typescript
const template = await sdk.notifications.createNotificationTemplate(1, {
  name: 'Welcome Email',
  type: 'transactional',
  channel: 'email',
  subject: 'Hello',
  title: 'Welcome',
  message: 'Thanks for joining!',
  variables: ['user.name'],
});

await sdk.notifications.sendNotificationFromTemplate(template.id, {
  project_id: 1,
  user_id: 123,
  variables: { 'user.name': 'Alex' },
});

await sdk.notifications.bulkSendNotifications({
  project_id: 1,
  user_ids: [123, 124],
  type: 'info',
  title: 'Announcement',
  message: 'New feature shipped',
  channel: 'in_app',
});
```

### Settings & stats

```typescript
const settings = await sdk.notifications.getNotificationSettings(123);
await sdk.notifications.updateNotificationSettings(123, {
  channels: { email: true, push: false },
});
const stats = await sdk.notifications.getNotificationStats(1, { period: '30d' });
```

---

## ⏰ Scheduler (`sdk.scheduler`)

### Task lifecycle

```typescript
const task = await sdk.scheduler.createTask({
  name: 'Weekly report',
  description: 'Generate report every Monday',
  task_type: 'http_request',
  schedule: '0 0 * * 1',
  payload: {
    url: 'https://api.example.com/report',
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
  },
  project_id: 1,
  is_active: true,
});

const tasks = await sdk.scheduler.getTasks({ is_active: true });
await sdk.scheduler.updateTask(task.id, { schedule: '0 0 * * 0' });
await sdk.scheduler.deleteTask(task.id);
```

### Execution

```typescript
await sdk.scheduler.executeTask(task.id);
await sdk.scheduler.activateTask(task.id);
await sdk.scheduler.deactivateTask(task.id);

const executions = await sdk.scheduler.getTaskExecutions(task.id, { limit: 10 });
const list = await sdk.scheduler.getTaskExecutions(task.id, { limit: 1 });
const executionId = list.executions[0]?.id;
if (executionId) {
  const execution = await sdk.scheduler.getTaskExecution(executionId);
}
await sdk.scheduler.cancelTaskExecution(execution.id);

const stats = await sdk.scheduler.getTaskStats({ project_id: 1 });
await sdk.scheduler.validateCronExpression('0 2 * * *');
const status = await sdk.scheduler.getSchedulerStatus();
```

---

## 📚 AgentDocs (`sdk.docs`)

```typescript
const help = await sdk.docs.getHelp('auth');
const sections = await sdk.docs.getDocumentationSections();
const results = await sdk.docs.search('webhook');
const examples = await sdk.docs.getCodeExamples({ language: 'typescript' });
const qs = await sdk.docs.getQuickStart('typescript');
```

---

## 🧬 AgentProtocol (`sdk.platform.protocol`)

Preferred command bus for reads/writes with snapshot cache:

```typescript
await sdk.platform.protocol.executeCommand({
  command: 'get_page_data',
  project_id: 1,
  payload: { user_id: 123 },
});

const snap = await sdk.platform.protocol.readThroughSnapshot({
  prefix: 'projects',
  projectId: 1,
});

await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
```

See [docs/PROTEIN_SYSTEM_GUIDE.md](../../docs/PROTEIN_SYSTEM_GUIDE.md) and monorepo [AGENT_PROTOCOL_QUICKSTART](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md).

---

## 🛒 Commerce & DNA

```typescript
import { snapshotKeyProjectData } from '@agentstack/sdk';

const rows = await sdk.platform.dna.list('data_projects_8dna', { project_id: 1 });

// Subpath exports when enabled in capability matrix:
// import { createCart } from '@agentstack/sdk/commerce/shop';
```

---

## 🧠 Neural architecture (`sdk.neural`)

### Status, cache, events

```typescript
const status = await sdk.neural.getStatus();

await sdk.neural.cache.set('user:1', profile, 300, ['users']);
const cached = await sdk.neural.cache.get('user:1');
await sdk.neural.cache.setWithTags('project:1', data, ['projects'], 600);
await sdk.neural.cache.invalidateByTag('users');
await sdk.neural.cache.invalidateByPattern('user:*');

const cacheStats = await sdk.neural.cache.getStats();

await sdk.neural.emitEvent('page_view', { page: '/home' });
const { events } = await sdk.neural.getEvents({ limit: 20, type: 'page_view' });
```

### Pattern analysis

```typescript
const patterns = await sdk.neural.patterns.analyze('user_behavior', {
  user_id: 123,
  project_id: 1,
  period: '30d',
});

const prediction = await sdk.neural.patterns.predict('payment_success', {
  user_id: 123,
  project_id: 1,
  input_data: { amount: 1000, currency: 'USD' },
});

const recs = await sdk.neural.patterns.getRecommendations('checkout', {
  user_id: 123,
  limit: 5,
});
```

### SDK event bus

```typescript
sdk.on('request:success', (data) => console.log('OK', data.url));
sdk.on('request:error', (err) => console.error('HTTP', err));
sdk.on('auth:login', (data) => console.log('Logged in', data));
sdk.on('project:changed', ({ projectId }) => console.log('Project', projectId));
```

---

## 👑 Platform operator (not for npm integrators)

`AgentAdmin`, `sdk.admin`, `/api/admin/*` — monorepo only. See [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md).

---

## ⚙️ Configuration

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  timeout: 30000,
  retryAttempts: 3,
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  cache: { enabled: true, ttl: 300 },
  logging: { level: 'info', enabled: true },
  neural: {
    cache: { enabled: true, ttl: 300, maxSize: 1000 },
    events: { enabled: true, bufferSize: 10000 },
  },
});
```

| Field | Purpose |
|-------|---------|
| `apiBase` | REST root (`https://agentstack.tech/api` prod) |
| `projectId` | Default `X-Project-ID` |
| `sdkAudience` | `integrator` (default) or `platform_operator` (monorepo only) |
| `neural.cache` | Client neural cache TTL/size |
| `retry` | Transient HTTP backoff |

See [docs/PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md) for env vars.

### Advanced configuration

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  timeout: 15000,
  retryAttempts: 5,
  enableCaching: true,
  enableMetrics: true,
  defaultHeaders: { 'User-Agent': 'MyApp/1.0' },
  neural: {
    cache: { enabled: true, ttl: 600000, maxSize: 5000 },
    events: { enabled: true, bufferSize: 200 },
  },
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  logging: { level: 'debug', enabled: true },
});
```

### HTTP interceptors

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  requestInterceptor: async (config) => {
    config.headers = { ...config.headers, 'X-Request-Time': String(Date.now()) };
    return config;
  },
  responseInterceptor: async (response) => {
    console.log('duration ms', response.metadata?.duration);
    return response;
  },
  errorInterceptor: async (error) => {
    console.error('API error', error.message);
    return error;
  },
});
```

---

## 🔄 Error handling

```typescript
import {
  AgentStackSDK,
  UnauthorizedError,
  ServerError,
  resolveAgentStackApiBase,
} from '@agentstack/sdk';

try {
  await sdk.platform.auth.login({ email, password, project_id: 1 });
} catch (error) {
  if (error instanceof UnauthorizedError) {
    console.error('Re-login required:', error.message);
  } else if (error instanceof ServerError) {
    console.error('API error:', error.message, error.status);
  } else {
    console.error(error);
  }
  throw error;
}
```

- Use `retry: { attempts: 3, delay: 1000, backoff: 'exponential' }` for transient network failures
- Map HTTP codes to UX via [docs/AI_ERROR_ACTION_MATRIX.md](../../docs/AI_ERROR_ACTION_MATRIX.md)
- After `executeCommand`, invalidate snapshots **and** React Query keys in SPAs

### Automatic retry configuration

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  retryAttempts: 3,
  retryDelay: 1000,
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
});
```

### Manual retry

```typescript
import { ServerError } from '@agentstack/sdk';

try {
  await sdk.platform.auth.getProfile();
} catch (error) {
  if (error instanceof ServerError && (error.status ?? 0) >= 500) {
    await new Promise((r) => setTimeout(r, 2000));
    await sdk.platform.auth.getProfile();
  }
}
```

Map HTTP failures to UX with [docs/AI_ERROR_ACTION_MATRIX.md](../../docs/AI_ERROR_ACTION_MATRIX.md) (401 → re-login, 429 → backoff, 5xx → retry).

---

## 📊 Metrics & monitoring

```typescript
const health = await sdk.healthCheck();
const ping = await sdk.ping();
console.log('API status', ping.status);

const metrics = await sdk.getMetrics();
console.log('requests', metrics.requests);
console.log('cacheHitRate', metrics.cacheHitRate);
console.log('averageLatency', metrics.averageLatency);

const neuralCacheStats = await sdk.neural.cache.getStats();
```

### SDK event bus (diagnostics)

```typescript
sdk.on('request:success', (data) => {
  console.log('OK', data.url, data.duration);
});

sdk.on('request:error', (err) => {
  console.error('HTTP error', err.message);
});

sdk.on('auth:login', (data) => {
  console.log('Logged in', data);
});

sdk.on('neural:cache:hit', (key) => {
  console.debug('Neural cache hit', key);
});

sdk.on('protein:request:success', (data) => {
  console.debug('Protein', data);
});
```

Use events for logging and dashboards — not as the source of truth for business state.

---

## 🧪 Testing

```bash
npm run test -w @agentstack/sdk
npm run check:docs-i18n:all
```

### Unit tests

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

describe('AgentStack SDK', () => {
  const sdk = new AgentStackSDK({
    apiBase: resolveAgentStackApiBase(),
    apiKey: 'test-key',
    projectId: 1,
  });

  it('exposes platform modules', () => {
    expect(sdk.platform.auth).toBeDefined();
    expect(sdk.payments).toBeDefined();
    expect(sdk.getModuleCatalog).toBeDefined();
  });

  it('integrator catalog excludes admin', () => {
    const ids = sdk.getModuleCatalog().modules.map((m) => m.id);
    expect(ids).not.toContain('admin');
  });

  it('lists projects via platform.api', async () => {
    const projects = await sdk.platform.api.getProjects();
    expect(Array.isArray(projects)).toBe(true);
  });
});
```

### Integration flow sketch

```typescript
await sdk.platform.auth.login({ email, password, project_id: 1 });
await sdk.platform.auth.updateProfileData({ display_name: 'Test User' });
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Test',
  project_id: 1,
});
expect(payment.id).toBeDefined();
```

### Mocking HTTP in tests

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: 'test-key',
  projectId: 1,
  // Point apiBase at a local mock server or use your test harness
});

// Prefer testing pure helpers and catalog shape without live network:
expect(sdk.getModuleCatalog().modules.length).toBeGreaterThan(0);
```

### E2E checklist (integrator)

1. Login via `sdk.platform.auth.login` and persist tokens securely  
2. List projects with `sdk.platform.api.getProjects`  
3. Run one command via `sdk.platform.protocol.executeCommand`  
4. Invalidate snapshot prefix after a write mutation  
5. Confirm React Query keys refresh in SPA (see monorepo `cacheInvalidation.ts`)

---

## 🤖 AI discovery

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

[AGENTS.md](../../AGENTS.md) · [docs/SDK_MODULE_CATALOG.md](../../docs/SDK_MODULE_CATALOG.md)

---

## 📦 Subpath exports

When enabled in `getCapabilityMatrix()`:

```typescript
// import { … } from '@agentstack/sdk/commerce/shop';
// import { … } from '@agentstack/sdk/commerce/assets';
// import { … } from '@agentstack/sdk/economy';
```

See [docs/DOC_HUB.md](../../docs/DOC_HUB.md) and monorepo `docs/sdk/` cookbooks.

---

## 🧬 Entity snapshots (advanced)

```typescript
import { snapshotKeyProjectData } from '@agentstack/sdk';

const key = snapshotKeyProjectData(projectId);
sdk.entitySnapshotRepository.setSnapshot(key, payload, {
  fetchedAt: Date.now(),
  revision: etag,
});

sdk.entitySnapshotRepository.subscribe(key, (next) => {
  console.log('snapshot updated', next);
});

sdk.entitySnapshotRepository.invalidatePrefix('projects:');
```

Prefer `sdk.platform.protocol.readThroughSnapshot` for network-backed reads.

---

## 🌍 AgentI18n (extended)

```typescript
sdk.i18n.getCurrentLanguage();
sdk.i18n.getSupportedLanguages();
sdk.i18n.t('modules:agents.title', { count: 3 });
sdk.i18n.registerNamespace('commerce', {
  en: { checkout: 'Checkout' },
  ru: { checkout: 'Оплата' },
});
```

---

## 🔗 Integrations & support (when enabled)

```typescript
// Capability-gated — check getCapabilityMatrix() before calling:
// sdk.integrations — recipes, webhook intake, delivery logs
// sdk.support — support inbox / staff APIs (tenant apps with support module)
```

| Module | Typical calls |
|--------|----------------|
| Integrations | list recipes, register webhook endpoints, replay deliveries |
| Support | open thread, post message, bind AI agent (staff surfaces) |

Monorepo MCP tools mirror many of these flows — see [docs/SDK_AI_SURFACE.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_AI_SURFACE.md).

---

## 🧭 Choosing an API style

| Need | Use |
|------|-----|
| CRUD on REST resources | Domain module (`sdk.payments`, `sdk.webhooks`, …) |
| Page/game state with cache | `sdk.platform.protocol.executeCommand` + snapshots |
| Read-heavy dashboard | `readThroughSnapshot` then subscribe/invalidate |
| Admin across all tenants | **Not in npm** — platform operator monorepo only |

---

## 📄 License

MIT — see [LICENSE](../../LICENSE) in the repository root.

---

## 📚 Additional resources

- [packages/react/README.en.md](../react/README.en.md)
- [docs/api/](../../docs/api/)
- [examples/](../../examples/)
- [CHANGELOG.md](../../CHANGELOG.md)

## 🤝 Support

1. [docs/FAQ_DETAILED.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/FAQ_DETAILED.md)
2. [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
3. https://agentstack.tech

## 📚 Resources

- [docs/PROTEIN_SYSTEM_GUIDE.md](../../docs/PROTEIN_SYSTEM_GUIDE.md)
- [docs/PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md)
- [docs/MODULAR_ARCHITECTURE.md](../../docs/MODULAR_ARCHITECTURE.md)
- [OpenAPI](https://agentstack.tech/swagger)

**Russian extended package README:** [README.md](README.md) (full module-by-module reference).
