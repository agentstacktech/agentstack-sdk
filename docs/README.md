# AgentStack Unified SDK Documentation

Добро пожаловать в документацию AgentStack Unified SDK - современного, универсального SDK для экосистемы AgentStack.

## 📚 Содержание

- [Быстрый старт](./quick-start.md)
- [API Reference](./api-reference.md)
- [Конфигурация](./configuration.md)
- [Аутентификация](./authentication.md)
- [Обработка ошибок](./error-handling.md)
- [Кэширование](./caching.md)
- [Метрики и мониторинг](./metrics.md)
- [React интеграция](./react-integration.md)
- [Python SDK](./python-sdk.md)
- [Примеры использования](./examples.md)
- [Миграция](./migration-guide.md)
- [Лучшие практики](./best-practices.md)
- [Troubleshooting](./troubleshooting.md)

## 🎯 Основные возможности

### ✅ Реализовано

- **Базовый HTTP клиент** с современными практиками
- **Система аутентификации** с автоматическим refresh токенов
- **Умная обработка ошибок** с типизированными исключениями
- **Retry механизм** с exponential backoff и jitter
- **ETag кэширование** для оптимизации запросов
- **Idempotency keys** для безопасных операций
- **Request/Response interceptors** для кастомизации
- **Метрики и мониторинг** использования SDK
- **Полная типизация TypeScript** для всех API
- **Демо режим** для тестирования без регистрации

### 🚧 В разработке

- **Специализированные сервисы** (Payments, Analytics, Projects, Webhooks, Wallets, Notifications, Scheduler)
- **React хуки и Provider** для удобной интеграции
- **Python SDK** с аналогичным API
- **Автогенерация типов** из OpenAPI спецификации
- **Система логирования** с разными уровнями
- **Unit и интеграционные тесты**
- **CI/CD pipeline** для автоматической сборки

## 🚀 Быстрый старт

### Установка

```bash
npm install @agentstack/sdk
```

### Базовое использование

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  baseUrl: 'https://api.agentstack.com',
  apiKey: 'your-api-key',
  projectId: 123
});

// Аутентификация
await sdk.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Получение данных
const user = await sdk.auth.getCurrentUser();
console.log('User:', user.username);
```

## 🏗️ Архитектура

SDK построен на модульной архитектуре с четким разделением ответственности:

```
AgentStackSDK
├── HTTPClient (базовый HTTP клиент)
├── AuthService (аутентификация)
├── PaymentsService (платежи) - в разработке
├── AnalyticsService (аналитика) - в разработке
├── ProjectsService (проекты) - в разработке
├── WebhooksService (webhooks) - в разработке
├── WalletsService (кошельки) - в разработке
├── NotificationsService (уведомления) - в разработке
└── SchedulerService (планировщик) - в разработке
```

## 🔧 Конфигурация

SDK поддерживает гибкую конфигурацию:

```typescript
const sdk = new AgentStackSDK({
  baseUrl: 'https://api.agentstack.com',
  apiKey: 'your-api-key',
  projectId: 123,
  
  // Опциональные настройки
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCaching: true,
  enableMetrics: true,
  demoMode: 'ro',
  
  // Interceptors
  requestInterceptor: (config) => config,
  responseInterceptor: (response) => response,
  errorInterceptor: (error) => error
});
```

## 📊 Метрики

SDK автоматически собирает метрики использования:

```typescript
const metrics = sdk.http.getMetrics();
console.log('Requests:', metrics.requests);
console.log('Latency:', metrics.latency);
console.log('Cache:', metrics.cache);
```

## 🎭 События

SDK поддерживает систему событий для мониторинга:

```typescript
sdk.on('request:success', (data) => {
  console.log('Request successful:', data.config.url);
});

sdk.on('auth:login', (data) => {
  console.log('User logged in:', data.user.email);
});
```

## 🔒 Безопасность

- Автоматическое управление токенами
- Поддержка idempotency keys
- Валидация всех входных данных
- Безопасное хранение конфигурации
- Защита от CSRF атак

## 📈 Производительность

- ETag кэширование для GET запросов
- Умный retry с exponential backoff
- Дедупликация одновременных запросов
- Оптимизированная сериализация/десериализация
- Минимальный размер bundle

## 🤝 Участие в разработке

Мы приветствуем участие в разработке SDK! См. [CONTRIBUTING.md](../CONTRIBUTING.md) для подробностей.

## 📄 Лицензия

MIT License - см. [LICENSE](../LICENSE) для подробностей.

## 🆘 Поддержка

- 📧 Email: support@agentstack.com
- 💬 Discord: [AgentStack Community](https://discord.gg/agentstack)
- 📖 Документация: [docs.agentstack.com](https://docs.agentstack.com)
- 🐛 Issues: [GitHub Issues](https://github.com/agentstack/unified-sdk/issues)
