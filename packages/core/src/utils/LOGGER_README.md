# AgentStack SDK Logger

Универсальный конфигурируемый logger для отладки и мониторинга SDK.

## Быстрый старт

### Включить логирование (в консоли браузера):

```javascript
// Включить все логи (DEBUG, INFO, WARN, ERROR)
window.AgentStackLogger.enable()

// Отключить все логи
window.AgentStackLogger.disable()

// Установить уровень логирования
window.AgentStackLogger.setLevel(window.AgentStackLogger.LogLevel.INFO)
```

### Уровни логирования:

- `DEBUG (0)` - все логи, включая HTTP запросы
- `INFO (1)` - информационные сообщения
- `WARN (2)` - предупреждения
- `ERROR (3)` - только ошибки
- `NONE (4)` - отключить логи

## Использование в коде

```typescript
import { logger } from './utils/logger';

// Debug - детальная информация
logger.debug('HTTP request', { method: 'GET', url: '/api/users' });

// Info - важные события
logger.info('User logged in', { userId: 123 });

// Warn - предупреждения
logger.warn('Rate limit approaching', { remaining: 10 });

// Error - ошибки
logger.error('API call failed', error);
```

## Особенности

- ✅ **Цветной вывод** в консоли браузера
- ✅ **Временные метки** для каждого лога
- ✅ **Сохранение настроек** в localStorage
- ✅ **Глобальный доступ** через `window.AgentStackLogger`
- ✅ **TypeScript поддержка**

## Примеры

### Отладка HTTP запросов:

```javascript
// В консоли браузера
window.AgentStackLogger.setLevel(0) // DEBUG
```

Вы увидите:
```
[17:30:15] [AgentStack SDK] [DEBUG] HTTP POST http://localhost:8000/api/auth/login
[17:30:15] [AgentStack SDK] [DEBUG] HTTP 200 POST http://localhost:8000/api/auth/login
```

### Отладка только ошибок:

```javascript
window.AgentStackLogger.setLevel(3) // ERROR
```

## Integration в ваш код

Logger уже интегрирован в:
- ✅ HTTP Client (все запросы и ответы)
- ✅ Auth Module (login, logout, refresh)
- ✅ Error Handler (все ошибки)

## Полезные команды

```javascript
// Проверить текущий уровень
localStorage.getItem('agentstack_log_level')

// Очистить настройки
localStorage.removeItem('agentstack_log_level')

// Включить логи на время отладки
window.AgentStackLogger.enable()
// ... отладка ...
window.AgentStackLogger.disable()
```

