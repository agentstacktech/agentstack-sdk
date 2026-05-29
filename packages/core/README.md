# AgentStack Core SDK

Универсальный API клиент для AgentStack с модульной архитектурой, Neural интеграцией и AI-First i18n. Поддерживает TypeScript, автоматическое управление состоянием и обработку ошибок.

**NEW!** 🌍 **AgentI18n** - Zero Config translations for AI agents!

## 🚀 Быстрый старт

### Установка

```bash
npm install @agentstack/sdk
```

### Базовое использование

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: 'your-api-key',
  projectId: 1,
  timeout: 10000,
  retryAttempts: 3,
});

// Аутентификация
const tokens = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});

// Получение данных пользователя
const user = await sdk.auth.getCurrentUser();
console.log('Пользователь:', user.display_name);

// Обновление профиля
await sdk.auth.updateProfileData({
  display_name: 'Новое имя',
  bio: 'Обновленная биография',
});

// Работа с платежами
const payment = await sdk.payments.createPayment({
  amount: 1000, // $10.00
  currency: 'USD',
  description: 'Тестовый платеж',
  project_id: 1,
});

// Отслеживание событий
await sdk.analytics.trackEvent({
  event_type: 'user_action',
  properties: {
    action: 'button_click',
    page: '/dashboard',
  },
  project_id: 1,
});

// 🌍 Мультиязычность (NEW! Zero Config!)
console.log(sdk.i18n.t('user_management'));  // → "User Management"
sdk.i18n.changeLanguage('ru');
console.log(sdk.i18n.t('user_management'));  // → "Управление пользователями"
```

## Entity snapshot repository (structural cache)

React Query остаётся каналом к серверу (async, retry). Для **синхронного** чтения последнего снимка JSON (project-data, field-access-policy, произвольные blobs) используйте in-memory слой на экземпляре SDK:

- **`sdk.entitySnapshotRepository`** — `setSnapshot` / `getSnapshot` / `getAtPath` / `mergeSnapshot` / `invalidate` / `invalidatePrefix` / `getOrBuildPathIndex` / `subscribe`.
- **Ключи:** `snapshotKeyProjectData(id)`, `snapshotKeyFieldAccessPolicy(id)`, `snapshotKeyBlob(opaqueId)`; префиксы для массовой инвалидации — `snapshotKeyPrefixProjectData()` и т.д. (см. JSDoc в `src/cache/snapshot-key-contract.ts`).
- **Пути:** `getValueAtPath`, `flattenProjectData`, `buildFlatPathMap` экспортируются из пакета (единый источник с фронтом).
- **Опциональная персистенция:** `persistSnapshotEnvelope` / `loadPersistedSnapshotEnvelope` + `SnapshotPersistencePolicy` (allowlist ключей, лимит размера) — только для нечувствительных данных.

**Миграция (чеклист):**

1. Загрузка данных — по-прежнему через React Query (или прямой API).
2. После успешного ответа — `setSnapshot` с `revision` из ответа (etag / `timestamp`).
3. При мутациях — инвалидировать Query и тот же логический префикс в репозитории (`invalidatePrefix`).
4. Производные (flatten, автокомплит путей) — `getOrBuildPathIndex` или утилиты из `@agentstack/sdk`, без дублирующих `useMemo` над тем же деревом.

В репозитории AgentStack фронтенд синхронизирует project-data и FAP через `src/lib/entitySnapshotRepositoryBridge.ts` и хуки `useProjectDataWorkspace`.

**Protein command bus (`/commands/*`):** `sdk.proteinCommandChannel` использует тот же `HTTPClient`, что и REST (токен, X-Project-ID, ретраи). Предпочтительный вход для приложений и автоматизации — **`sdk.protocol`**: `executeCommand`, `executeCommandsBatch`, обёртки `rest*`, снимки, `readThroughSnapshot`, `searchSnapshots`, `runMutation`. Спека: репозиторий `docs/AGENT_PROTOCOL.md`, паттерны — `docs/AGENT_PROTOCOL_QUICKSTART.md`. Фронтовый bridge Query ↔ снимки остаётся в `agentstack-frontend` (`entitySnapshotRepositoryBridge.ts`); команды на горячих путях переводите на `sdk.protocol.executeCommand` при наличии `AgentStackSDK`.

### Vue / vanilla (browser)

Тот же `@agentstack/sdk` без React. После успешного `fetch` или REST-вызова положите ответ в снимок и читайте пути через протокол:

```typescript
import { AgentStackSDK, snapshotKeyProjectData } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: 'https://api.example.com/api', apiKey: process.env.VITE_API_KEY });
// Pinia / ref: после загрузки
sdk.protocol.setSnapshot(snapshotKeyProjectData(projectId), data, { fetchedAt: Date.now(), revision: etag });
// В компоненте
const label = sdk.protocol.readPath(snapshotKeyProjectData(projectId), 'name');
```

С TanStack Query вне React (редко) или с Vue Query — вызывайте `setSnapshot` в `onSuccess` мутации/запроса по тому же контракту ключей, что и на React-фронте.

### Node.js (18+)

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: 'https://api.example.com/api',
  apiKey: process.env.AGENTSTACK_API_KEY,
});
// при JWT: sdk.auth / httpClient.setAuthToken по документации SDK

const out = await sdk.protocol.executeCommand({
  command_type: 'dna_crud',
  command_name: 'list_something',
  payload: { target_entity: 'project', operation_type: 'read', input_data: { project_id: 1 } },
  priority: 5,
  timeout_ms: 30000,
  retry_count: 1,
});
console.log(out);
```

Проверьте доступность `/api/batch` и CORS с сервера; при необходимости отключите batch в конфиге `HTTPClient`. Не используйте `localStorage` на сервере — токены передавайте явно.

## 🌍 NEW! AgentI18n - AI-First Translations

**Zero Config мультиязычность для AI-агентов!**

```typescript
// ✅ Works immediately (no setup!):
sdk.i18n.t('user_management');   // → "User Management"
sdk.i18n.t('common:save');         // → "Save"

// ✅ Change language:
sdk.i18n.changeLanguage('ru');
sdk.i18n.t('user_management');   // → "Управление пользователями"

// ✅ Custom translations for your project:
sdk.i18n.registerNamespace('game', {
  en: { 'level': 'Level {{n}}' },
  ru: { 'level': 'Уровень {{n}}' }
});
sdk.i18n.t('game:level', { n: 10 });  // → "Level 10"

// ✅ AI Discovery:
sdk.i18n.getAvailableKeys('modules');  // All 148 keys!
sdk.i18n.findKey('user');               // Search keys
```

**Features:**
- ✅ Zero Config (works out of the box)
- ✅ Embedded translations (EN + RU) - 12KB gzipped
- ✅ TypeScript autocomplete
- ✅ AI Discovery API
- ✅ Custom namespaces
- ✅ React hook (`useI18n`)
- ✅ Variables support (`{{var}}`)

**See:** `src/i18n/README.md` for full documentation

```

## 🏗️ Архитектура

SDK построен на модульной архитектуре с четким разделением ответственности:

```
AgentStackSDK
├── auth          # Аутентификация и профили
├── payments      # Платежи и кошельки
├── analytics     # Аналитика и метрики
├── api           # API ключи и проекты
├── webhooks      # Webhooks и уведомления
├── wallets       # Управление кошельками
├── notifications # Система уведомлений
├── scheduler     # Планировщик задач
├── i18n          # 🆕 Мультиязычность (Zero Config!)
└── neural        # Neural архитектура
```

## 🔐 Аутентификация (AgentAuth)

### Вход и регистрация

```typescript
// Вход в систему
const tokens = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});

// Регистрация
const newUser = await sdk.auth.register({
  email: 'newuser@example.com',
  password: 'securepassword',
  project_id: 1,
});

// Выход
await sdk.auth.logout();

// Обновление токена
const newTokens = await sdk.auth.refreshToken({
  refresh_token: tokens.refresh_token,
});
```

### Управление профилем

```typescript
// Получение профиля
const profile = await sdk.auth.getProfileData();

// Обновление профиля
await sdk.auth.updateProfileData({
  display_name: 'Иван Иванов',
  bio: 'Разработчик из Москвы',
  location: 'Москва',
  website: 'https://ivan.dev',
  social_links: {
    github: 'https://github.com/ivan',
    twitter: 'https://twitter.com/ivan',
  },
});

// Установка аватара
await sdk.auth.setAvatar('data:image/jpeg;base64,/9j/4AAQ...');

// Установка имени пользователя
await sdk.auth.setUsername('ivan_ivanov');
```

### Настройки пользователя

```typescript
// Получение настроек
const settings = await sdk.auth.getSettings();

// Обновление настроек
await sdk.auth.updateSettings({
  theme: 'dark',
  language: 'ru',
  timezone: 'Europe/Moscow',
  notifications: {
    email: true,
    push: false,
    sms: false,
  },
  privacy: {
    profile_public: true,
    show_email: false,
    show_activity: true,
  },
  dashboard: {
    layout: 'compact',
    default_view: 'grid',
    items_per_page: 20,
  },
});

// Установка темы
await sdk.auth.setTheme('dark');

// Управление уведомлениями
await sdk.auth.setNotification('email', true);
await sdk.auth.setNotification('push', false);
```

### Безопасность

```typescript
// Изменение пароля
await sdk.auth.changePassword({
  currentPassword: 'oldpassword',
  newPassword: 'newpassword',
});

// Управление 2FA
const status2FA = await sdk.auth.get2FAStatus();
await sdk.auth.toggle2FA(true);

// Активные сессии
const sessions = await sdk.auth.getActiveSessions();
await sdk.auth.revokeSession('session_id');

// События безопасности
const alerts = await sdk.auth.getSecurityAlerts();
```

### OAuth интеграция

```typescript
// Получение провайдеров OAuth
const providers = await sdk.auth.getOAuthProviders();

// Подключение провайдера
const redirectUrl = await sdk.auth.connectOAuthProvider('google');
// Перенаправьте пользователя на redirectUrl

// Отключение провайдера
await sdk.auth.disconnectOAuthProvider('google');
```

## 💳 Платежи (AgentPayments)

### Создание и управление платежами

```typescript
// Создание платежа
const payment = await sdk.payments.createPayment({
  amount: 2500, // $25.00
  currency: 'USD',
  description: 'Подписка Premium',
  project_id: 1,
});

// Получение платежа
const paymentDetails = await sdk.payments.getPayment(payment.id);

// Обновление платежа
await sdk.payments.updatePayment(payment.id, {
  description: 'Обновленное описание',
});

// Отмена платежа
await sdk.payments.cancelPayment(payment.id);

// Список платежей
const payments = await sdk.payments.getPayments({
  project_id: 1,
  status: 'completed',
  limit: 20,
  offset: 0,
});
```

### Способы оплаты

```typescript
// Получение способов оплаты
const methods = await sdk.payments.getPaymentMethods();

// Добавление способа оплаты
const newMethod = await sdk.payments.addPaymentMethod({
  type: 'card',
  token: 'tok_visa_123',
});

// Удаление способа оплаты
await sdk.payments.removePaymentMethod(method.id);

// Установка способа оплаты по умолчанию
await sdk.payments.setDefaultPaymentMethod(method.id);
```

### Возвраты

```typescript
// Создание возврата
const refund = await sdk.payments.createRefund(payment.id, {
  amount: 1000, // $10.00
  reason: 'Запрос клиента',
});

// Получение возвратов
const refunds = await sdk.payments.getRefunds(payment.id);
```

### Кошельки

```typescript
// Получение кошельков проекта
const wallets = await sdk.payments.getWallets(projectId);
```

## 📊 Аналитика (AgentAnalytics)

### Отслеживание событий

```typescript
// Отслеживание события
await sdk.analytics.trackEvent({
  event_type: 'user_signup',
  properties: {
    source: 'google',
    campaign: 'summer2024',
    plan: 'premium',
  },
  project_id: 1,
});

// Массовое отслеживание
await sdk.analytics.trackBulkEvents([
  {
    event_type: 'page_view',
    properties: { page: '/dashboard' },
    project_id: 1,
  },
  {
    event_type: 'button_click',
    properties: { button: 'upgrade' },
    project_id: 1,
  },
]);
```

### Дашборд и метрики

```typescript
// Получение метрик дашборда
const metrics = await sdk.analytics.getDashboardMetrics(1, {
  period: '30d',
  metrics: ['total_events', 'unique_users', 'total_revenue'],
});

// Статистика использования
const stats = await sdk.analytics.getUsageStats(1, {
  start_date: '2025-01-01',
  end_date: '2025-01-31',
});
```

### Пользовательские отчеты

```typescript
// Создание отчета
const report = await sdk.analytics.createCustomReport(1, {
  name: 'Отчет по конверсии',
  description: 'Анализ конверсии по каналам',
  query: {
    event_types: ['signup', 'purchase'],
    date_range: {
      start: '2025-01-01',
      end: '2025-01-31',
    },
    filters: {
      source: 'google',
    },
  },
});

// Получение отчетов
const reports = await sdk.analytics.getCustomReports(1);

// Обновление отчета
await sdk.analytics.updateCustomReport(1, report.id, {
  name: 'Обновленный отчет',
});

// Удаление отчета
await sdk.analytics.deleteCustomReport(1, report.id);
```

### Управление метриками

```typescript
// Создание метрики
const metric = await sdk.analytics.createMetric(1, {
  name: 'user_engagement',
  description: 'Метрика вовлеченности пользователей',
  type: 'gauge',
});

// Получение метрик
const metrics = await sdk.analytics.getMetrics(1);

// Обновление метрики
await sdk.analytics.updateMetric(1, metric.id, {
  description: 'Обновленное описание',
});

// Удаление метрики
await sdk.analytics.deleteMetric(1, metric.id);
```

## 🔑 API ключи и проекты (AgentAPI)

### Управление проектами

```typescript
// Получение проектов
const projects = await sdk.api.getProjects();

// Создание проекта
const project = await sdk.api.createProject({
  name: 'Новый проект',
  description: 'Описание проекта',
});

// Обновление проекта
await sdk.api.updateProject(project.id, {
  name: 'Обновленное название',
});

// Удаление проекта
await sdk.api.deleteProject(project.id);
```

### API ключи

```typescript
// Получение API ключей
const apiKeys = await sdk.api.getAPIKeys();

// Создание API ключа
const apiKey = await sdk.api.createAPIKey({
  name: 'Production Key',
  description: 'Ключ для продакшена',
  permissions: ['read', 'write'],
  expires_at: '2025-12-31',
});

// Обновление API ключа
await sdk.api.updateAPIKey(apiKey.id, {
  name: 'Updated Key',
});

// Удаление API ключа
await sdk.api.deleteAPIKey(apiKey.id);

// Получение флагов
const flags = await sdk.api.getFlags();

// Получение плана
const plan = await sdk.api.getPlan();
```

## 🔔 Webhooks (AgentWebhooks)

### Создание и управление webhooks

```typescript
// Создание webhook
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://your-app.com/webhook',
  events: ['payment.completed', 'user.created'],
  secret: 'webhook_secret',
  is_active: true,
});

// Получение webhooks
const webhooks = await sdk.webhooks.getWebhooks();

// Обновление webhook
await sdk.webhooks.updateWebhook(webhook.id, {
  events: ['payment.completed', 'payment.failed'],
});

// Удаление webhook
await sdk.webhooks.deleteWebhook(webhook.id);

// Тестирование webhook
await sdk.webhooks.testWebhook(webhook.id);
```

### Уведомления

```typescript
// Отправка уведомления
const notification = await sdk.webhooks.sendNotification({
  project_id: 1,
  user_id: 123,
  channel: 'email',
  subject: 'Добро пожаловать!',
  body: 'Спасибо за регистрацию',
});

// Получение уведомлений
const notifications = await sdk.webhooks.getNotifications(1, {
  channel: 'email',
  status: 'sent',
  limit: 20,
});
```

## 💰 Кошельки (AgentWallets)

### Управление кошельками

```typescript
// Создание кошелька
const wallet = await sdk.wallets.createWallet({
  project_id: 1,
  name: 'Основной кошелек',
  type: 'main',
  currency: 'USD',
  initial_balance: 10000,
});

// Получение кошельков
const wallets = await sdk.wallets.getWallets(1);

// Обновление кошелька
await sdk.wallets.updateWallet(wallet.id, {
  name: 'Обновленное название',
});

// Удаление кошелька
await sdk.wallets.deleteWallet(wallet.id);
```

### Операции с балансом

```typescript
// Пополнение
await sdk.wallets.deposit(wallet.id, 5000, 'USD', 'Пополнение баланса');

// Снятие
await sdk.wallets.withdraw(wallet.id, 2000, 'USD', 'Вывод средств');

// Перевод между кошельками
await sdk.wallets.transfer(wallet1.id, wallet2.id, 1000, 'USD');

// Заморозка баланса
await sdk.wallets.freezeBalance(wallet.id, 1000, 'Заморозка для оферты');

// Разморозка баланса
await sdk.wallets.unfreezeBalance(wallet.id, 1000, 'Разморозка');

// Корректировка баланса
await sdk.wallets.adjustBalance(wallet.id, 500, 'credit', 'Бонус');
```

### История и статистика

```typescript
// История транзакций
const history = await sdk.wallets.getWalletHistory(wallet.id, {
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  limit: 50,
});

// Статистика проекта
const stats = await sdk.wallets.getWalletStats(1, {
  currency: 'USD',
  type: 'main',
});
```

## 🔔 Уведомления (AgentNotifications)

### Отправка уведомлений

```typescript
// Отправка уведомления
const notification = await sdk.notifications.sendNotification({
  project_id: 1,
  user_id: 123,
  channel: 'email',
  subject: 'Важное уведомление',
  body: 'Содержимое уведомления',
  metadata: { priority: 'high' },
});

// Массовая отправка
await sdk.notifications.bulkSendNotifications([
  {
    user_id: 123,
    channel: 'email',
    subject: 'Уведомление 1',
    body: 'Содержимое 1',
  },
  {
    user_id: 124,
    channel: 'push',
    subject: 'Уведомление 2',
    body: 'Содержимое 2',
  },
]);
```

### Шаблоны уведомлений

```typescript
// Создание шаблона
const template = await sdk.notifications.createTemplate({
  project_id: 1,
  name: 'Welcome Email',
  channel: 'email',
  subject_template: 'Добро пожаловать, {{user.name}}!',
  body_template: 'Спасибо за регистрацию, {{user.name}}!',
  is_active: true,
});

// Получение шаблонов
const templates = await sdk.notifications.getTemplates(1);

// Обновление шаблона
await sdk.notifications.updateTemplate(template.id, {
  subject_template: 'Обновленный заголовок',
});

// Удаление шаблона
await sdk.notifications.deleteTemplate(template.id);
```

### Статистика и подписки

```typescript
// Статистика уведомлений
const stats = await sdk.notifications.getNotificationStats(1, {
  channel: 'email',
  period: '30d',
});

// Подписка на канал
await sdk.notifications.subscribeToChannel(1, 'newsletter');

// Отписка от канала
await sdk.notifications.unsubscribeFromChannel(1, 'newsletter');

// Получение подписок
const subscriptions = await sdk.notifications.getSubscriptions(1);
```

## ⏰ Планировщик (AgentScheduler)

### Управление задачами

```typescript
// Создание задачи
const task = await sdk.scheduler.createTask({
  name: 'Еженедельный отчет',
  description: 'Генерация отчета каждую неделю',
  task_type: 'http_request',
  schedule: '0 0 * * 1', // Каждый понедельник в 00:00
  payload: {
    url: 'https://api.example.com/report',
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' },
  },
  is_active: true,
});

// Получение задач
const tasks = await sdk.scheduler.getTasks({
  is_active: true,
  task_type: 'http_request',
});

// Обновление задачи
await sdk.scheduler.updateTask(task.id, {
  schedule: '0 0 * * 0', // Воскресенье вместо понедельника
});

// Удаление задачи
await sdk.scheduler.deleteTask(task.id);
```

### Управление выполнением

```typescript
// Запуск задачи
await sdk.scheduler.runTask(task.id);

// Остановка задачи
await sdk.scheduler.stopTask(task.id);

// Получение истории выполнения
const history = await sdk.scheduler.getTaskHistory(task.id, {
  limit: 20,
  offset: 0,
});

// Статистика задач
const stats = await sdk.scheduler.getTaskStats();
```

## Platform operator (not for npm integrators)

`sdk.admin` and `sdk.platform.adminData` require `sdkAudience: 'platform_operator'` (AgentStack monorepo ops only). Tenant apps: [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md) — use `sdk.platform.api`, `sdk.platform.rbac`, `sdk.platform.economy`.

## 🧠 Neural архитектура

### Кэширование

```typescript
// Настройка кэша
const cache = await sdk.neural.setCacheConfig({
  enabled: true,
  ttl: 300000, // 5 минут
  maxSize: 1000,
});

// Получение из кэша
const cachedData = await sdk.neural.getFromCache('user:123');

// Сохранение в кэш
await sdk.neural.setCache('user:123', userData, 600000); // 10 минут

// Очистка кэша
await sdk.neural.clearCache('user:123');
```

### События

```typescript
// Эмиссия события
await sdk.neural.emitEvent('user:updated', {
  user_id: 123,
  changes: ['display_name', 'bio'],
});

// Подписка на события
sdk.neural.on('user:updated', (data) => {
  console.log('Пользователь обновлен:', data);
});

// Получение событий
const events = await sdk.neural.getEvents({
  type: 'user:updated',
  limit: 20,
});
```

## ⚙️ Конфигурация

### Базовая конфигурация

```typescript
const sdk = new AgentStackSDK({
  apiBase: 'https://agentstack.tech/api', // Базовый URL API
  apiKey: 'your-api-key',                // API ключ
  projectId: 1,                          // ID проекта
  timeout: 10000,                        // Таймаут запросов (мс)
  retryAttempts: 3,                      // Количество попыток повтора
  retryDelay: 1000,                      // Задержка между попытками (мс)
});
```

### Расширенная конфигурация

```typescript
const sdk = new AgentStackSDK({
  apiBase: 'https://agentstack.tech/api',
  apiKey: 'your-api-key',
  projectId: 1,
  timeout: 15000,
  retryAttempts: 5,
  retryDelay: 2000,
  
  // Кэширование
  enableCaching: true,
  cache: {
    enabled: true,
    ttl: 300000, // 5 минут
  },
  
  // Метрики
  enableMetrics: true,
  
  // Кастомные заголовки
  defaultHeaders: {
    'X-Custom-Header': 'custom-value',
    'User-Agent': 'MyApp/1.0',
  },
  
  // Интерцепторы
  requestInterceptor: async (config) => {
    config.headers['X-Request-Time'] = Date.now().toString();
    return config;
  },
  
  responseInterceptor: async (response) => {
    console.log(`Запрос выполнен за ${response.metadata?.duration}мс`);
    return response;
  },
  
  errorInterceptor: async (error) => {
    console.error('Ошибка API:', error.message);
    return error;
  },
  
  // Neural конфигурация
  neural: {
    cache: {
      enabled: true,
      ttl: 600000, // 10 минут
      maxSize: 5000,
    },
    events: {
      enabled: true,
      bufferSize: 200,
    },
  },
  
  // Retry конфигурация
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential',
  },
  
  // Логирование
  logging: {
    level: 'info',
    enabled: true,
  },
});
```

## 🔄 Обработка ошибок

### Типы ошибок

```typescript
import { AgentStackError, ErrorType } from '@agentstack/sdk';

try {
  await sdk.auth.login(credentials);
} catch (error) {
  if (error instanceof AgentStackError) {
    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
        console.log('Ошибка аутентификации:', error.message);
        break;
      case ErrorType.VALIDATION_ERROR:
        console.log('Ошибка валидации:', error.message);
        break;
      case ErrorType.RATE_LIMIT_ERROR:
        console.log('Превышен лимит запросов:', error.message);
        break;
      case ErrorType.NETWORK_ERROR:
        console.log('Сетевая ошибка:', error.message);
        break;
      default:
        console.log('Неизвестная ошибка:', error.message);
    }
  }
}
```

### Retry логика

```typescript
// Автоматический retry для сетевых ошибок
const sdk = new AgentStackSDK({
  apiBase: 'https://agentstack.tech/api',
  retryAttempts: 3,
  retryDelay: 1000,
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential', // exponential, linear
  },
});

// Ручной retry
try {
  await sdk.auth.getCurrentUser();
} catch (error) {
  if (error.type === ErrorType.NETWORK_ERROR) {
    // Повторная попытка через 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));
    await sdk.auth.getCurrentUser();
  }
}
```

## 📊 Метрики и мониторинг

### Получение метрик

```typescript
// Метрики SDK
const metrics = await sdk.getMetrics();
console.log('Запросов:', metrics.requests);
console.log('Кэш попаданий:', metrics.cacheHitRate);
console.log('Средняя задержка:', metrics.averageLatency);

// Проверка состояния
const health = await sdk.ping();
console.log('API доступен:', health.status === 'ok');
```

### События SDK

```typescript
// Подписка на события
sdk.on('request:success', (data) => {
  console.log('Успешный запрос:', data.url, data.duration);
});

sdk.on('request:error', (error) => {
  console.error('Ошибка запроса:', error.message);
});

sdk.on('auth:login', (user) => {
  console.log('Пользователь вошел:', user.email);
});

sdk.on('neural:cache:hit', (key) => {
  console.log('Кэш попадание:', key);
});
```

## 🧪 Тестирование

### Unit тесты

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

describe('AgentStack SDK', () => {
  let sdk: AgentStackSDK;

  beforeEach(() => {
    sdk = new AgentStackSDK({
      apiBase: 'http://localhost:8000/api',
      apiKey: 'test-key',
      projectId: 1,
    });
  });

  test('should initialize correctly', () => {
    expect(sdk).toBeDefined();
    expect(sdk.auth).toBeDefined();
    expect(sdk.payments).toBeDefined();
  });

  test('should handle authentication', async () => {
    const tokens = await sdk.auth.login({
      email: 'test@example.com',
      password: 'password',
      project_id: 1,
    });

    expect(tokens).toHaveProperty('access_token');
    expect(tokens).toHaveProperty('refresh_token');
  });
});
```

### Интеграционные тесты

```typescript
describe('Integration Tests', () => {
  test('should complete user flow', async () => {
    const sdk = new AgentStackSDK({
      apiBase: 'https://agentstack.tech/api',
      apiKey: 'real-api-key',
      projectId: 1,
    });

    // 1. Регистрация
    await sdk.auth.register({
      email: 'test@example.com',
      password: 'password',
      project_id: 1,
    });

    // 2. Вход
    await sdk.auth.login({
      email: 'test@example.com',
      password: 'password',
      project_id: 1,
    });

    // 3. Обновление профиля
    await sdk.auth.updateProfileData({
      display_name: 'Test User',
    });

    // 4. Создание платежа
    const payment = await sdk.payments.createPayment({
      amount: 1000,
      currency: 'USD',
      description: 'Test payment',
      project_id: 1,
    });

    expect(payment.id).toBeDefined();
  });
});
```

## 📚 Дополнительные ресурсы

- [React SDK](../react/README.md)
- [API Документация](../../docs/api/)
- [Примеры использования](../../examples/)
- [Changelog](./CHANGELOG.md)

## 🤝 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [FAQ](../../docs/FAQ_DETAILED.md)
2. Создайте [Issue](https://github.com/agentstacktech/agentstack-sdk/issues)
3. Напишите в [Telegram](https://t.me/LanceW4P)

## 📄 Лицензия

MIT License - см. [LICENSE](../../LICENSE) для деталей.
