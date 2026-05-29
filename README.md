# AgentStack SDK

[![npm version](https://img.shields.io/npm/v/@agentstack/sdk.svg)](https://www.npmjs.com/package/@agentstack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages:** [English (canonical)](README.en.md) · **Русский** (this file)

**English README (GitHub / npm / AI default):** [README.en.md](README.en.md) · **Doc hub:** [docs/DOC_HUB_ru.md](docs/DOC_HUB_ru.md) · [docs/DOC_HUB.md](docs/DOC_HUB.md)

Универсальный TypeScript/JavaScript SDK для экосистемы AgentStack. Модульный API: auth, projects, payments, DNA, protocol, Neural Architecture.

**Quick Start (TypeScript/JavaScript):**

```bash
npm install @agentstack/sdk
```

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
});

const projects = await sdk.platform.api.getProjects();
const catalog = sdk.getModuleCatalog(); // AI: discover modules, hints, examples
```

**AI entry:** [AGENTS.md](AGENTS.md) · [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md)  
**Integrator scope (no ecosystem admin):** [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md)  
**All integration flows (npm, submodule, monorepo, …):** [docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)

**Links:** [Changelog](CHANGELOG.md) | [Contributing](CONTRIBUTING.md)

---

## How to add the SDK to your project

| Flow | When | Install |
|------|------|---------|
| **A — npm** (default) | Production apps, most integrators | `npm install @agentstack/sdk` |
| **B — git submodule** | Pin SDK commit in git, vendored CI | [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) → `vendor/agentstack-sdk` |
| **D — monorepo sibling** | You work inside [AgentStack](https://github.com/agentstacktech/AgentStack) | `"@agentstack/sdk": "file:../agentstack-unified-sdk/packages/core"` |
| **E — local `file:` / `npm link`** | Developing SDK + app together | [PUBLISHING.md](PUBLISHING.md) |
| **G — Python** | Python backends | `pip install agentstack-sdk` |

Full decision tree, CI, and env checklist: **[docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)**.

### Submodule in one minute

```bash
git submodule add https://github.com/agentstacktech/agentstack-sdk.git vendor/agentstack-sdk
node vendor/agentstack-sdk/scripts/bootstrap-submodule-consumer.mjs --target . --tag v0.4.13
```

Then `npm install` in your app and set `projectId` — see [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).

---

Современный, универсальный SDK для экосистемы AgentStack с интеграцией Neural Architecture и Admin SDK. Удобный и понятный API для разработчиков и AI агентов.

## 🎯 Цели проекта

- **Единообразие**: Один SDK для всех API запросов
- **Простота**: Интуитивный API для разработчиков
- **Надежность**: Встроенные механизмы retry, кэширования, error handling
- **Производительность**: Оптимизированные запросы с Neural Cache
- **Масштабируемость**: Легкое добавление новых сервисов
- **Мультиязычность**: Поддержка TypeScript, Python, и других языков
- **Neural Integration**: Полная интеграция с Neural Architecture
- **Project-scoped APIs**: RBAC, DNA, economy — без экосистемной `/api/admin/*` (см. [INTEGRATOR_SCOPE](docs/INTEGRATOR_SCOPE.md))

## 🏗️ Архитектура

```
agentstack-sdk/
├── packages/
│   ├── core/                          # @agentstack/sdk
│   │   ├── src/
│   │   │   ├── client/                # HTTP и WebSocket клиенты
│   │   │   │   ├── AgentHTTP.ts       # HTTP клиент
│   │   │   │   └── AgentWebSocket.ts  # WebSocket клиент
│   │   │   ├── modules/               # Модули SDK
│   │   │   │   ├── AgentAuth.ts       # Аутентификация
│   │   │   │   ├── AgentAPI.ts        # Основные API
│   │   │   │   ├── AgentAdmin.ts      # Админ функции
│   │   │   │   ├── AgentNeural.ts     # Neural Architecture
│   │   │   │   ├── AgentDocs.ts       # Документация
│   │   │   │   ├── AgentPayments.ts   # Платежи
│   │   │   │   ├── AgentAnalytics.ts  # Аналитика
│   │   │   │   ├── AgentWebhooks.ts   # Webhooks
│   │   │   │   └── AgentScheduler.ts  # Планировщик
│   │   │   ├── types/                 # TypeScript типы
│   │   │   ├── utils/                 # Утилиты
│   │   │   │   ├── AgentCache.ts      # Кэширование
│   │   │   │   ├── AgentRetry.ts      # Retry логика
│   │   │   │   └── AgentLogger.ts     # Логирование
│   │   │   └── index.ts
│   │   └── package.json
│   ├── react/                         # @agentstack/react
│   │   ├── src/
│   │   │   ├── hooks/                 # React хуки
│   │   │   │   ├── useAgentAuth.ts
│   │   │   │   ├── useAgentAdmin.ts
│   │   │   │   ├── useAgentPayments.ts
│   │   │   │   └── useAgentNeural.ts
│   │   │   ├── components/            # React компоненты
│   │   │   │   ├── AgentProvider.tsx
│   │   │   │   ├── AgentAuthGuard.tsx
│   │   │   │   └── AgentAdminPanel.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   └── python/                        # agentstack-sdk
│       ├── src/
│       │   ├── client/                # HTTP клиент
│       │   ├── modules/               # Модули Python SDK
│       │   │   ├── agent_auth.py
│       │   │   ├── agent_api.py
│       │   │   ├── agent_admin.py
│       │   │   ├── agent_neural.py
│       │   │   └── agent_payments.py
│       │   └── __init__.py
│       └── setup.py
├── docs/                              # Документация
├── examples/                          # Примеры использования
├── tests/                             # Тесты
└── tools/                             # Инструменты разработки
```

## 🚀 Ключевые особенности

### Core SDK
- **Умный HTTP клиент** с автоматическим retry и кэшированием
- **Автоматическая аутентификация** с refresh токенами
- **Type-safe API** с полной типизацией TypeScript
- **Модульная архитектура** с понятными названиями модулей
- **Neural Cache Integration** - интеллектуальное кэширование
- **Admin SDK** - специализированные методы для администрирования
- **Error Handling** с автоматическим retry и fallback
- **Request/Response Interceptors** для логирования и мониторинга

### 🎯 Модули SDK
- **AgentAuth** - аутентификация и авторизация
- **AgentAPI** - основные API операции
- **AgentAdmin** - административные функции
- **AgentNeural** - Neural Architecture интеграция
- **AgentDocs** - документация и справка
- **AgentPayments** - платежная система
- **AgentAnalytics** - аналитика и метрики
- **AgentWebhooks** - webhook'и
- **AgentScheduler** - планировщик задач

### Admin SDK (NEW!)
- **User Management** - полное управление пользователями
- **System Statistics** - метрики и аналитика системы
- **Bulk Operations** - массовые операции с пользователями
- **Security Management** - управление безопасностью
- **Dashboard Metrics** - метрики для дашборда

### Neural Architecture Integration
- **Neural Cache** - интеллектуальное кэширование с предсказаниями
- **Neural Events** - система событий для межмодульной коммуникации
- **Pattern Analysis** - анализ паттернов использования
- **Auto Optimization** - автоматическая оптимизация запросов

### React Integration
- **React Hooks** для всех сервисов
- **Context Provider** для глобального состояния
- **Admin Components** - готовые компоненты для админки
- **Real-time Updates** с WebSocket поддержкой

## 📦 Установка

See **[docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)** for npm vs submodule vs monorepo vs `npm link`.

**Quick paths:**

```bash
# A — npm (default)
npm install @agentstack/sdk
npm install @agentstack/react @tanstack/react-query   # optional UI

# B — git submodule (see SUBMODULE_CONSUMER.md)
git submodule add https://github.com/agentstacktech/agentstack-sdk.git vendor/agentstack-sdk

# G — Python
pip install agentstack-sdk
```

## 🚀 Быстрый старт

### TypeScript/JavaScript
```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
});

// Использование модулей SDK (tenant / integrator)
await sdk.platform.auth.login({ email: 'user@example.com', password: 'password' });
const projects = await sdk.platform.api.getProjects();
const payment = await sdk.payments.createPayment({ amount: 1000, currency: 'RUB' });

// Использование Neural Cache
await sdk.neural.cache.set('key', 'value');
const value = await sdk.neural.cache.get('key');

// Использование документации
const help = await sdk.docs.getHelp('auth');
```

### Python
```python
from agentstack import AgentStackSDK

sdk = AgentStackSDK(
    api_base='https://agentstack.tech/api',
    api_key='your_api_key'
)

# Tenant APIs (no ecosystem admin — see docs/INTEGRATOR_SCOPE.md)
projects = await sdk.platform.api.get_projects()

# Использование Neural Cache
await sdk.neural.cache.set('key', 'value')
value = await sdk.neural.cache.get('key')
```

### React
```tsx
import { SDKProvider, useSDK } from '@agentstack/react';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: 'https://agentstack.tech/api',
        apiKey: process.env.AGENTSTACK_API_KEY,
        projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
      }}
    >
      <ProjectList />
    </SDKProvider>
  );
}

function ProjectList() {
  const sdk = useSDK();
  // useSDKQuery / sdk.platform.api — see docs/REACT_QUERY_INTEGRATION.md
}
```

Ecosystem admin hooks (`useAdminUsers`, …) require `sdkAudience: 'platform_operator'` in the AgentStack monorepo only — see [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md).

## 🔧 API Reference

### Core Services

#### Auth Service
```typescript
// Аутентификация
const tokens = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1
});

// Обновление токена
const newTokens = await sdk.auth.refresh(tokens.refresh_token);

// Получение профиля
const profile = await sdk.auth.getProfile();
```

#### Projects Service
```typescript
// REST (preferred for apps and AI agents)
const projects = await sdk.platform.api.getProjects();
const project = await sdk.platform.api.getProject(projectId);

// 8DNA project row (advanced)
const row = await sdk.platform.dna.get('data_projects_8dna', {
  id: projectId,
  project_id: 0,
});
```

#### Payments Service
```typescript
// Создание платежа
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'RUB',
  description: 'Test payment'
});

// Получение статуса
const status = await sdk.payments.getPaymentStatus(payment.id);

// История платежей
const transactions = await sdk.payments.getTransactions({
  limit: 20,
  offset: 0
});
```

### Platform operator only (not in npm integrator docs)

Ecosystem admin (`sdk.admin`, `/api/admin/*`) is **not** available to tenant apps. Default `SDKConfig.sdkAudience` is `integrator`. AgentStack monorepo ops shells use `sdkAudience: 'platform_operator'`. Details: [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md).

### AgentDocs - Документация и справка

```typescript
// Получение справки по теме
const help = await sdk.docs.getHelp('auth');

// Поиск по документации
const results = await sdk.docs.search('payment integration');

// Получение примеров кода
const examples = await sdk.docs.getCodeExamples({
  language: 'typescript',
  category: 'payments'
});

// Получение FAQ
const faq = await sdk.docs.getFAQ('payments');
```

### Neural Architecture Integration

#### Neural Cache
```typescript
// Кэширование данных
await sdk.neural.cache.set('user:123:profile', userProfile, 300);
const profile = await sdk.neural.cache.get('user:123:profile');

// Кэширование с тегами
await sdk.neural.cache.setWithTags('project:456', projectData, ['projects', 'active']);
const projects = await sdk.neural.cache.getByTag('projects');

// Инвалидация кэша
await sdk.neural.cache.invalidate('user:123:*');
await sdk.neural.cache.invalidateByTag('projects');
```

#### Neural Events
```typescript
// Отправка событий
await sdk.neural.events.emit('payment_created', {
  payment_id: '123',
  amount: 1000,
  currency: 'RUB'
});

// Подписка на события
sdk.neural.events.on('payment_created', (data) => {
  console.log('Payment created:', data);
});

// Отписка от событий
sdk.neural.events.off('payment_created', handler);
```

#### Pattern Analysis
```typescript
// Анализ паттернов
const patterns = await sdk.neural.patterns.analyze('user_behavior', {
  user_id: 123,
  period: '30d'
});

// Предсказания
const predictions = await sdk.neural.patterns.predict('payment_success', {
  amount: 1000,
  currency: 'RUB',
  user_id: 123
});
```

## 🎨 React Hooks

### Admin Hooks
```tsx
import { 
  useAdminUsers, 
  useAdminStats, 
  useAdminDashboard 
} from '@agentstack/react';

function AdminPanel() {
  const { 
    users, 
    loading, 
    error, 
    createUser, 
    updateUser, 
    deleteUser,
    bulkUpdateUsers 
  } = useAdminUsers();

  const { stats, refreshStats } = useAdminStats();
  
  const { metrics, refreshMetrics } = useAdminDashboard();

  return (
    <div>
      <h2>System Statistics</h2>
      <p>Total Users: {stats?.total_users}</p>
      <p>Active Users: {stats?.active_users}</p>
      
      <h2>Dashboard Metrics</h2>
      <p>Revenue: {metrics?.total_revenue?.value}</p>
      
      <h2>Users</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        users.map(user => (
          <div key={user.id}>
            {user.username} - {user.email}
            <button onClick={() => deleteUser(user.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
```

### Core Hooks
```tsx
import { 
  useAuth, 
  useProjects, 
  usePayments 
} from '@agentstack/react';

function App() {
  const { user, login, logout } = useAuth();
  const { projects, createProject } = useProjects();
  const { payments, createPayment } = usePayments();

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.email}!</h1>
          <button onClick={logout}>Logout</button>
          
          <h2>Projects</h2>
          {projects.map(project => (
            <div key={project.id}>{project.name}</div>
          ))}
        </div>
      ) : (
        <button onClick={() => login('user@example.com', 'password')}>
          Login
        </button>
      )}
    </div>
  );
}
```

## 🔧 Конфигурация

### TypeScript/JavaScript
```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: 'your_api_key',
  
  // Neural Architecture
  neural: {
    cache: {
      enabled: true,
      ttl: 300,
      maxSize: 1000
    },
    events: {
      enabled: true,
      bufferSize: 10000
    }
  },
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    ttl: 300
  },
  
  // Logging
  logging: {
    level: 'info',
    enabled: true
  }
});
```

### Python
```python
sdk = AgentStackSDK(
    api_base='https://agentstack.tech/api',
    api_key='your_api_key',
    
    # Neural Architecture
    neural={
        'cache': {
            'enabled': True,
            'ttl': 300,
            'max_size': 1000
        },
        'events': {
            'enabled': True,
            'buffer_size': 10000
        }
    },
    
    # Retry configuration
    retry={
        'attempts': 3,
        'delay': 1000,
        'backoff': 'exponential'
    },
    
    # Cache configuration
    cache={
        'enabled': True,
        'ttl': 300
    },
    
    # Logging
    logging={
        'level': 'info',
        'enabled': True
    }
)
```

## 🧪 Тестирование

### Unit Tests
```typescript
import { AgentStackSDK } from '@agentstack/sdk';

describe('Integrator SDK', () => {
  let sdk: AgentStackSDK;

  beforeEach(() => {
    sdk = new AgentStackSDK({
      apiBase: resolveAgentStackApiBase(),
      apiKey: 'test_key',
    });
  });

  it('should list projects via platform.api', async () => {
    const projects = await sdk.platform.api.getProjects();
    expect(Array.isArray(projects)).toBe(true);
  });

  it('should not expose admin in module catalog', () => {
    const ids = sdk.getModuleCatalog().modules.map((m) => m.id);
    expect(ids).not.toContain('admin');
  });
});
```

### Integration Tests
```typescript
describe('SDK Integration', () => {
  it('should handle authentication flow', async () => {
    const tokens = await sdk.auth.login({
      email: 'test@example.com',
      password: 'password',
      project_id: 1
    });

    expect(tokens.access_token).toBeDefined();
    expect(tokens.refresh_token).toBeDefined();

    const profile = await sdk.auth.getProfile();
    expect(profile.email).toBe('test@example.com');
  });
});
```

## 📚 Примеры использования

### Project dashboard (integrator)
```typescript
class ProjectDashboard {
  constructor(private sdk: AgentStackSDK) {}

  async getDashboardData(projectId: number) {
    const project = await this.sdk.platform.api.getProject(projectId);
    const catalog = this.sdk.getModuleCatalog();
    return { project, catalog };
  }
}
```

### Neural Cache Usage
```typescript
// Пример использования Neural Cache
class UserService {
  private sdk: AgentStackSDK;

  constructor(sdk: AgentStackSDK) {
    this.sdk = sdk;
  }

  async getUserProfile(userId: string) {
    // Проверяем кэш
    const cached = await this.sdk.neural.cache.get(`user:${userId}:profile`);
    if (cached) {
      return cached;
    }

    // Получаем данные
    const profile = await this.sdk.platform.api.getUser(userId);
    
    // Кэшируем с предсказанием TTL
    await this.sdk.neural.cache.set(`user:${userId}:profile`, profile, 300);
    
    return profile;
  }

  async updateUserProfile(userId: string, updates: any) {
    // Обновляем данные
    const updated = await this.sdk.platform.api.updateUser(userId, updates);
    
    // Инвалидируем кэш
    await this.sdk.neural.cache.invalidate(`user:${userId}:*`);
    
    return updated;
  }
}
```

## 🔒 Безопасность

### API Key Management
```typescript
// Создание API ключа с ограничениями
const apiKey = await sdk.auth.createApiKey({
  name: 'Admin Dashboard Key',
  scopes: ['admin:read', 'admin:write'],
  rate_limit_per_minute: 1000,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
});
```

### Secure Configuration
```typescript
const sdk = new AgentStackSDK({
  apiBase: process.env.AGENTSTACK_API_BASE,
  apiKey: process.env.AGENTSTACK_API_KEY,
  
  // Безопасные настройки
  security: {
    validateSSL: true,
    timeout: 30000,
    retryOnFailure: true
  }
});
```

## 📊 Мониторинг и метрики

### SDK Metrics
```typescript
// Получение метрик SDK
const metrics = await sdk.getMetrics();
console.log('Requests:', metrics.requests);
console.log('Cache Hit Rate:', metrics.cacheHitRate);
console.log('Average Latency:', metrics.averageLatency);
```

### Neural Architecture Metrics
```typescript
// Получение метрик Neural Architecture
const neuralMetrics = await sdk.neural.getMetrics();
console.log('Neural Cache Hit Rate:', neuralMetrics.cache.hitRate);
console.log('Neural Events Throughput:', neuralMetrics.events.throughput);
console.log('Pattern Analysis Accuracy:', neuralMetrics.patterns.accuracy);
```

## Production API base

Production REST base is **`https://agentstack.tech/api`**. Prefer the helper (Node, scripts, examples):

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
});
```

| Environment | Configuration |
|-------------|----------------|
| Production (default) | Omit `AGENTSTACK_API_BASE` → `https://agentstack.tech/api` |
| Local Core | `AGENTSTACK_API_BASE=http://localhost:8000/api` |
| Vite SPA | `VITE_API_BASE_URL=https://agentstack.tech/api` (no `/api` suffix in some setups — HTTPClient normalizes) |

```bash
# Node / CI
AGENTSTACK_API_BASE=https://agentstack.tech/api
AGENTSTACK_API_KEY=your_api_key
```

The SDK is a **client library** — deploy your app as you normally would (static host, serverless, container). No separate “SDK Docker image” is required.

## 🤝 Contributing

Мы приветствуем вклад в развитие SDK! Пожалуйста, ознакомьтесь с нашими руководящими принципами:

1. **Следуйте TypeScript best practices**
2. **Добавляйте тесты для нового функционала**
3. **Обновляйте документацию**
4. **Используйте Neural Architecture компоненты**
5. **Поддерживайте обратную совместимость**

## 📞 Поддержка

- **Платформа**: [agentstack.tech](https://agentstack.tech)
- **OpenAPI / Swagger**: [agentstack.tech/swagger](https://agentstack.tech/swagger)
- **MCP**: [agentstack.tech/mcp](https://agentstack.tech/mcp)
- **GitHub (SDK)**: [github.com/agentstacktech/agentstack-sdk](https://github.com/agentstacktech/agentstack-sdk)
- **Issues**: [github.com/agentstacktech/agentstack-sdk/issues](https://github.com/agentstacktech/agentstack-sdk/issues)

---

**npm:** `@agentstack/sdk` · **AI entry:** [AGENTS.md](AGENTS.md) · **Integrator scope:** [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md)