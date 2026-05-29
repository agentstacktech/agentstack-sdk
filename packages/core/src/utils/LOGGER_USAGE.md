# AgentStack SDK Logger - Руководство по использованию

## Обзор

Универсальный логгер для AgentStack SDK, который **автоматически отключает логирование в production** (`NODE_ENV === 'production'`).

## Быстрый старт

### Простая замена console.log

```typescript
import { logger } from '@agentstack/sdk';

// Вместо console.log
logger.log('User logged in', { userId: 123 });
// или
logger.info('User logged in', { userId: 123 });

// Вместо console.warn
logger.warn('Rate limit approaching', { remaining: 10 });

// Вместо console.error
logger.error('API call failed', error);

// Вместо console.debug (если нужно)
logger.debug('HTTP request details', { method: 'GET', url: '/api/users' });
```

## Автоматическое отключение в Production

Логгер **автоматически отключается** в production окружении:

- ✅ В development: логи работают
- ❌ В production: логи отключены (по умолчанию)
- 🔧 Можно принудительно включить через `window.AgentStackLogger.enableInProduction()`

## Уровни логирования

```typescript
import { logger, LogLevel } from '@agentstack/sdk';

// DEBUG (0) - детальная отладочная информация
logger.debug('HTTP request', { method: 'GET', url: '/api/users' });

// INFO (1) - информационные сообщения (по умолчанию)
logger.info('User logged in', { userId: 123 });
logger.log('User logged in', { userId: 123 }); // алиас для info

// WARN (2) - предупреждения
logger.warn('Rate limit approaching', { remaining: 10 });

// ERROR (3) - ошибки
logger.error('API call failed', error);

// NONE (4) - отключить все логи
logger.disable();
```

## Конфигурация

### Программная конфигурация

```typescript
import { logger, LogLevel } from '@agentstack/sdk';

// Установить уровень логирования
logger.setLevel(LogLevel.DEBUG);

// Включить все логи
logger.enable();

// Отключить все логи
logger.disable();

// Принудительно включить в production (для отладки)
logger.enableInProduction();

// Проверить, включено ли логирование
if (logger.isEnabled()) {
  console.log('Logging is enabled');
}

// Получить текущее окружение
const env = logger.getEnvironment(); // 'development' | 'production'
```

### Конфигурация через браузер (window)

```javascript
// В консоли браузера

// Включить все логи
window.AgentStackLogger.enable()

// Отключить все логи
window.AgentStackLogger.disable()

// Установить уровень
window.AgentStackLogger.setLevel(window.AgentStackLogger.LogLevel.INFO)

// Принудительно включить в production
window.AgentStackLogger.enableInProduction()

// Проверить статус
window.AgentStackLogger.isEnabled()

// Получить окружение
window.AgentStackLogger.getEnvironment()
```

## Миграция с console.log

### Шаг 1: Импорт

```typescript
// В начале файла
import { logger } from '@agentstack/sdk';
```

### Шаг 2: Замена

```typescript
// ❌ Было:
console.log('User logged in', user);
console.warn('Warning message', data);
console.error('Error occurred', error);

// ✅ Стало:
logger.info('User logged in', user);
logger.warn('Warning message', data);
logger.error('Error occurred', error);

// Или для простых сообщений:
logger.log('User logged in', user); // алиас для info
```

### Шаг 3: Удаление проверок NODE_ENV

```typescript
// ❌ Было:
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info', data);
}

// ✅ Стало:
logger.debug('Debug info', data);
// Логгер сам проверит окружение!
```

## Примеры использования

### В компонентах React

```typescript
import { logger } from '@agentstack/sdk';

function MyComponent() {
  useEffect(() => {
    logger.info('Component mounted');
    
    return () => {
      logger.debug('Component unmounting');
    };
  }, []);
  
  const handleClick = () => {
    logger.debug('Button clicked', { timestamp: Date.now() });
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

### В SDK модулях

```typescript
import { logger } from '@agentstack/sdk';

export class MyModule {
  async fetchData() {
    try {
      logger.debug('Fetching data', { endpoint: '/api/data' });
      const response = await fetch('/api/data');
      logger.info('Data fetched successfully', { status: response.status });
      return response.json();
    } catch (error) {
      logger.error('Failed to fetch data', error);
      throw error;
    }
  }
}
```

### В HTTP клиенте

```typescript
import { logger } from '@agentstack/sdk';

async function makeRequest(url: string) {
  logger.debug('Making request', { url });
  
  try {
    const response = await fetch(url);
    logger.info('Request completed', { url, status: response.status });
    return response;
  } catch (error) {
    logger.error('Request failed', { url, error });
    throw error;
  }
}
```

## Особенности

- ✅ **Автоматическое отключение в production** - не нужно проверять `NODE_ENV` вручную
- ✅ **Цветной вывод** в консоли браузера
- ✅ **Временные метки** для каждого лога
- ✅ **Сохранение настроек** в localStorage
- ✅ **Глобальный доступ** через `window.AgentStackLogger`
- ✅ **TypeScript поддержка** с полной типизацией
- ✅ **Простой API** - замена `console.log` на `logger.log`

## Рекомендации

1. **Используйте `logger.log()` или `logger.info()`** для обычных сообщений
2. **Используйте `logger.warn()`** для предупреждений
3. **Используйте `logger.error()`** для ошибок
4. **Используйте `logger.debug()`** для детальной отладки
5. **Не проверяйте `NODE_ENV` вручную** - логгер сделает это сам

## Отладка в Production

Если нужно временно включить логи в production для отладки:

```javascript
// В консоли браузера
window.AgentStackLogger.enableInProduction()
```

⚠️ **Внимание**: Используйте только для отладки, не оставляйте включенным в production!

