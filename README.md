# AgentStack SDK

[![npm version](https://img.shields.io/npm/v/@agentstack/sdk.svg)](https://www.npmjs.com/package/@agentstack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Universal TypeScript/JavaScript SDK for the AgentStack ecosystem. Modular API for auth, projects, payments, DNA operations, and Neural Architecture.

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

**Links:** [Changelog](CHANGELOG.md) | [Contributing](CONTRIBUTING.md)

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
- **Admin SDK**: Специализированный SDK для администрирования

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

### TypeScript/JavaScript
```bash
npm install @agentstack/sdk
```

### Python
```bash
pip install agentstack
```
> **Note:** Python SDK is in development. For now, use the REST API directly with `requests` or `httpx`.

### React
```bash
npm install @agentstack/react
```

## 🚀 Быстрый старт

### TypeScript/JavaScript
```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
});

// Использование модулей SDK
await sdk.auth.login({ email: 'user@example.com', password: 'password' });
const users = await sdk.admin.getUsers();
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
    api_base='https://agentstack.tech',
    api_key='your_api_key'
)

# Использование Admin SDK
users = await sdk.admin.get_users()
new_user = await sdk.admin.create_user({
    'username': 'new_user',
    'email': 'new@example.com',
    'role': 'member'
})

# Использование Neural Cache
await sdk.neural.cache.set('key', 'value')
value = await sdk.neural.cache.get('key')
```

### React
```tsx
import { AgentStackProvider, useAdminUsers } from '@agentstack/react';

function App() {
  return (
    <AgentStackProvider
      apiBase="https://agentstack.tech"
      apiKey="your_api_key"
    >
      <AdminDashboard />
    </AgentStackProvider>
  );
}

function AdminDashboard() {
  const { users, createUser, updateUser, deleteUser } = useAdminUsers();
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          {user.username} - {user.email}
          <button onClick={() => deleteUser(user.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

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

### AgentAdmin - Административные функции

```typescript
// Получение всех пользователей
const users = await sdk.admin.getUsers({
  page: 1,
  limit: 20,
  search: 'john'
});

// Создание пользователя
const user = await sdk.admin.createUser({
  username: 'new_user',
  email: 'new@example.com',
  first_name: 'New',
  last_name: 'User',
  password: 'secure_password',
  role: 'member',
  phone: '+1234567890',
  locale: 'en'
});

// Получение статистики системы
const stats = await sdk.admin.getSystemStats();
console.log(`Total users: ${stats.total_users}`);

// Получение метрик дашборда
const metrics = await sdk.admin.getDashboardMetrics();
console.log(`Revenue: ${metrics.total_revenue.value}`);
```

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

#### Bulk Operations
```typescript
// Массовое обновление пользователей
await sdk.admin.bulkUpdateUsers(['user1', 'user2', 'user3'], {
  is_active: false,
  role: 'member'
});

// Массовое удаление пользователей
await sdk.admin.bulkDeleteUsers(['user1', 'user2', 'user3']);
```

#### System Statistics
```typescript
// Получение статистики системы
const stats = await sdk.admin.getSystemStats();
// {
//   total_users: 1250,
//   active_users: 980,
//   total_projects: 45,
//   active_projects: 32,
//   total_revenue: 125000,
//   success_rate: 98.7
// }

// Dashboard метрики
const metrics = await sdk.admin.getDashboardMetrics();
// {
//   total_revenue: { value: 125000, change_percentage: 12.5 },
//   total_transactions: { value: 2450, change_percentage: 8.3 },
//   success_rate: { value: 98.7, change_percentage: 1.2 },
//   active_customers: { value: 1250, change_percentage: 15.8 }
// }
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
    api_base='https://agentstack.tech',
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

describe('Admin SDK', () => {
  let sdk: AgentStackSDK;

  beforeEach(() => {
    sdk = new AgentStackSDK({
      apiBase: resolveAgentStackApiBase(),
      apiKey: 'test_key'
    });
  });

  it('should create user', async () => {
    const user = await sdk.admin.createUser({
      username: 'test_user',
      email: 'test@example.com',
      role: 'member'
    });

    expect(user.id).toBeDefined();
    expect(user.username).toBe('test_user');
  });

  it('should get users', async () => {
    const users = await sdk.admin.getUsers();
    
    expect(Array.isArray(users.users)).toBe(true);
    expect(users.pagination).toBeDefined();
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

### Admin Dashboard
```typescript
// Полный пример админ дашборда
class AdminDashboard {
  private sdk: AgentStackSDK;

  constructor(apiKey: string) {
    this.sdk = new AgentStackSDK({
      apiBase: resolveAgentStackApiBase(),
      apiKey
    });
  }

  async getDashboardData() {
    const [stats, metrics, users] = await Promise.all([
      this.sdk.admin.getSystemStats(),
      this.sdk.admin.getDashboardMetrics(),
      this.sdk.admin.getUsers({ limit: 10 })
    ]);

    return {
      stats,
      metrics,
      recentUsers: users.users
    };
  }

  async manageUser(userId: string, action: 'suspend' | 'activate' | 'delete') {
    switch (action) {
      case 'suspend':
        return await this.sdk.admin.suspendUser(userId);
      case 'activate':
        return await this.sdk.admin.activateUser(userId);
      case 'delete':
        return await this.sdk.admin.deleteUser(userId);
    }
  }

  async bulkUserManagement(userIds: string[], updates: any) {
    return await this.sdk.admin.bulkUpdateUsers(userIds, updates);
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
    const profile = await this.sdk.admin.getUser(userId);
    
    // Кэшируем с предсказанием TTL
    await this.sdk.neural.cache.set(`user:${userId}:profile`, profile, 300);
    
    return profile;
  }

  async updateUserProfile(userId: string, updates: any) {
    // Обновляем данные
    const updated = await this.sdk.admin.updateUser(userId, updates);
    
    // Инвалидируем кэш
    await this.sdk.neural.cache.invalidate(`user:${userId}:*`);
    
    return updated;
  }
}
```

## 🔒 Безопасность

### API Key Management
```typescript
// Ротация API ключей
const newKey = await sdk.admin.rotateApiKey('old_key_id');

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

## 🚀 Production Deployment

### Environment Configuration
```bash
# .env
AGENTSTACK_API_BASE=https://api.agentstack.com
AGENTSTACK_API_KEY=your_production_api_key
AGENTSTACK_NEURAL_CACHE_ENABLED=true
AGENTSTACK_NEURAL_EVENTS_ENABLED=true
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

## 🤝 Contributing

Мы приветствуем вклад в развитие SDK! Пожалуйста, ознакомьтесь с нашими руководящими принципами:

1. **Следуйте TypeScript best practices**
2. **Добавляйте тесты для нового функционала**
3. **Обновляйте документацию**
4. **Используйте Neural Architecture компоненты**
5. **Поддерживайте обратную совместимость**

## 📞 Поддержка

- **Документация**: [docs.agentstack.com](https://docs.agentstack.com)
- **GitHub**: [github.com/agentstack/sdk](https://github.com/agentstack/sdk)
- **Discord**: [discord.gg/agentstack](https://discord.gg/agentstack)
- **Email**: [support@agentstack.com](mailto:support@agentstack.com)

---

**Версия**: 2.0.0  
**Последнее обновление**: 2025-01-15  
**Neural Architecture**: Integrated  
**Admin SDK**: Available  
**Статус**: Production Ready