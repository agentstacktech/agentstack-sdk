# 🏗️ Модульная архитектура AgentStack-SDK

## 🎯 Обзор

AgentStack-SDK построен на модульной архитектуре, где каждый модуль отвечает за определенную область функциональности. Все модули имеют префикс `Agent` для легкой идентификации и использования.

## 📦 Структура модулей

### 🔐 AgentAuth - Аутентификация и авторизация
Модуль для работы с аутентификацией пользователей, управлением сессиями и API ключами.

**Основные функции:**
- Вход и выход из системы
- Управление токенами (access/refresh)
- Управление сессиями пользователя
- Создание и управление API ключами
- Получение профиля пользователя

**Пример использования:**
```typescript
// Вход в систему
const tokens = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1
});

// Получение профиля
const profile = await sdk.auth.getProfile();

// Управление сессиями
const sessions = await sdk.auth.getSessions();
await sdk.auth.terminateAllSessions('Security logout');
```

### 👑 AgentAdmin - Административные функции
Модуль для административного управления системой, пользователями и получением системной статистики.

**Основные функции:**
- Управление пользователями (создание, обновление, удаление)
- Массовые операции с пользователями
- Получение системной статистики
- Получение метрик дашборда
- Административное управление сессиями

**Пример использования:**
```typescript
// Получение пользователей
const users = await sdk.admin.getUsers({
  page: 1,
  limit: 20,
  search: 'john'
});

// Создание пользователя
const user = await sdk.admin.createUser({
  username: 'new_user',
  email: 'new@example.com',
  role: 'member'
});

// Получение статистики
const stats = await sdk.admin.getSystemStats();
```

### 🧠 AgentNeural - Neural Architecture
Модуль для работы с Neural Architecture, включая кэширование, события и анализ паттернов.

**Основные функции:**
- Neural Cache операции
- Отправка и получение событий
- Анализ паттернов поведения
- Предсказания на основе данных
- Получение метрик Neural Architecture

**Пример использования:**
```typescript
// Neural Cache
await sdk.neural.cache.set('user:123:profile', userProfile, 300);
const profile = await sdk.neural.cache.get('user:123:profile');

// Отправка событий
await sdk.neural.emitEvent('user_login', {
  user_id: 123,
  timestamp: new Date().toISOString()
});

// Анализ паттернов
const patterns = await sdk.neural.patterns.analyze('user_behavior', {
  user_id: 123,
  period: '30d'
});
```

### 📚 AgentDocs - Документация и справка
Модуль для получения документации, справки и примеров использования.

**Основные функции:**
- Получение справки по темам
- Поиск по документации
- Получение примеров кода
- Получение FAQ
- Получение API справочника

**Пример использования:**
```typescript
// Получение справки
const help = await sdk.docs.getHelp('auth');

// Поиск по документации
const results = await sdk.docs.search('payment integration');

// Получение примеров кода
const examples = await sdk.docs.getCodeExamples({
  language: 'typescript',
  category: 'payments'
});
```

### 💳 AgentPayments - Платежная система
Модуль для работы с платежами, транзакциями и методами оплаты.

**Основные функции:**
- Создание и отслеживание платежей
- Получение методов оплаты
- Управление провайдерами платежей
- Получение статистики платежей
- Создание webhook'ов для платежей

**Пример использования:**
```typescript
// Создание платежа
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'RUB',
  description: 'Test payment'
});

// Получение статуса
const status = await sdk.payments.getPaymentStatus(payment.id);

// Получение статистики
const stats = await sdk.payments.getPaymentStats();
```

### 📊 AgentAnalytics - Аналитика и метрики
Модуль для работы с аналитикой, метриками и созданием отчетов.

**Основные функции:**
- Отправка событий аналитики
- Получение метрик дашборда
- Получение статистики использования
- Создание кастомных отчетов
- Экспорт данных аналитики

**Пример использования:**
```typescript
// Отправка события
await sdk.analytics.trackEvent({
  event_type: 'user_login',
  user_id: 123,
  metadata: { ip_address: '192.168.1.1' }
});

// Получение метрик
const metrics = await sdk.analytics.getDashboardMetrics();

// Создание отчета
const report = await sdk.analytics.createCustomReport({
  name: 'User Activity Report',
  query: 'SELECT * FROM user_activity'
});
```

### 🔗 AgentWebhooks - Webhook'и
Модуль для создания и управления webhook'ами.

**Основные функции:**
- Создание и управление webhook'ами
- Тестирование webhook'ов
- Получение логов webhook'ов
- Получение статистики webhook'ов
- Массовые операции с webhook'ами

**Пример использования:**
```typescript
// Создание webhook'а
const webhook = await sdk.webhooks.createWebhook({
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.updated'],
  secret: 'webhook_secret'
});

// Тестирование webhook'а
const testResult = await sdk.webhooks.testWebhook(webhook.id);

// Получение статистики
const stats = await sdk.webhooks.getWebhookStats();
```

### ⏰ AgentScheduler - Планировщик задач
Модуль для создания и управления планируемыми задачами.

**Основные функции:**
- Создание и управление задачами
- Немедленное выполнение задач
- Получение выполнений задач
- Валидация cron выражений
- Получение статистики планировщика

**Пример использования:**
```typescript
// Создание задачи
const task = await sdk.scheduler.createTask({
  name: 'Daily Sync',
  task_type: 'http_request',
  schedule: '0 2 * * *',
  payload: { url: 'https://api.example.com/sync' }
});

// Немедленное выполнение
const execution = await sdk.scheduler.executeTask(task.id);

// Валидация cron
const validation = await sdk.scheduler.validateCronExpression('0 2 * * *');
```

### 🔧 AgentAPI - Основные API операции
Модуль для работы с основными API операциями, проектами и системной информацией.

**Основные функции:**
- Управление проектами
- Управление пользователями проектов
- Получение системной информации
- Проверка здоровья системы
- Экспорт данных проектов

**Пример использования:**
```typescript
// Получение проектов
const projects = await sdk.api.getProjects();

// Создание проекта
const project = await sdk.api.createProject({
  name: 'My Project',
  description: 'Project description'
});

// Проверка здоровья
const health = await sdk.api.healthCheck();
```

## 🎨 Преимущества модульной архитектуры

### 1. **Четкое разделение ответственности**
Каждый модуль отвечает за определенную область функциональности, что делает код более понятным и поддерживаемым.

### 2. **Легкость использования**
Разработчики могут использовать только нужные им модули, не загружая весь SDK.

### 3. **Предсказуемость**
Все модули следуют единому стилю именования с префиксом `Agent`, что делает API предсказуемым.

### 4. **Расширяемость**
Новые модули можно легко добавлять без изменения существующего кода.

### 5. **TypeScript поддержка**
Каждый модуль полностью типизирован, что обеспечивает отличный опыт разработки.

## 🔧 Конфигурация SDK

```typescript
const sdk = new AgentStackSDK({
  apiBase: 'https://api.agentstack.com',
  apiKey: 'your_api_key',
  
  // Neural Architecture конфигурация
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
  
  // Retry конфигурация
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  },
  
  // Cache конфигурация
  cache: {
    enabled: true,
    ttl: 300
  },
  
  // Logging конфигурация
  logging: {
    level: 'info',
    enabled: true
  }
});
```

## 🚀 Быстрый старт

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

// Инициализация
const sdk = new AgentStackSDK({
  apiBase: 'https://api.agentstack.com',
  apiKey: 'your_api_key'
});

// Использование модулей
await sdk.auth.login({ email, password });
const users = await sdk.admin.getUsers();
const payment = await sdk.payments.createPayment({ amount: 1000 });
await sdk.neural.cache.set('key', 'value');
const help = await sdk.docs.getHelp('auth');
```

## 📚 Дополнительные ресурсы

- [Примеры использования](./examples/)
- [API Reference](./api-reference/)
- [Migration Guide](./migration-guide/)
- [Best Practices](./best-practices/)

---

**Версия документации**: 2.0.0  
**Последнее обновление**: 2025-01-15  
**AgentStack-SDK**: Modular Architecture
