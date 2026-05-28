# AgentStack-SDK для Python

Модульная архитектура для работы с AgentStack API на Python.

## 🚀 Установка

```bash
pip install agentstack-sdk
```

## 📦 Быстрый старт

```python
import asyncio
from agentstack_sdk import AgentStackSDK, SDKConfig

async def main():
    # Создание конфигурации SDK
    config = SDKConfig(
        api_base="https://agentstack.tech",
        api_key="your_api_key",
        neural={
            'cache': {'enabled': True, 'ttl': 300},
            'events': {'enabled': True}
        }
    )
    
    # Создание экземпляра SDK
    sdk = AgentStackSDK(config)
    
    try:
        # Использование модулей SDK
        await sdk.auth.login("user@example.com", "password")
        users = await sdk.admin.get_users()
        payment = await sdk.payments.create_payment({
            "amount": 1000, 
            "currency": "RUB"
        })
        
        # Neural Cache
        await sdk.neural.cache.set("key", "value")
        value = await sdk.neural.cache.get("key")
        
        # Neural Events
        await sdk.neural.events.emit("user_activity", {"action": "login"})
        
    finally:
        await sdk.http_client.close()

asyncio.run(main())
```

## 🏗️ Модульная архитектура

### Внутренний ID mapper (in-process)
- Доступен только при запуске рядом с AgentStack core, когда модуль `shared` есть в `sys.path`.
- Импорт: `from agentstack_sdk import id_mapper`
- Возможности: `get_project_db_id`, `get_user_db_id`, `set_*`, `delete_*`, `reload_all`, `reset`, `stats`.
- Нет сетевого API; работает только в одном процессе для дешёвых логических→DB ID маппингов.

### Доступные модули:

- **`AgentAuth`** - Аутентификация и авторизация
- **`AgentAdmin`** - Административные функции
- **`AgentNeural`** - Neural Architecture интеграция
- **`AgentDocs`** - Документация и справка
- **`AgentPayments`** - Платежная система
- **`AgentAnalytics`** - Аналитика и метрики
- **`AgentWebhooks`** - Webhook'и
- **`AgentScheduler`** - Планировщик задач
- **`AgentAPI`** - Основные API операции

### Примеры использования модулей:

#### 🔐 AgentAuth
```python
# Вход в систему
await sdk.auth.login("user@example.com", "password")

# Получение профиля
profile = await sdk.auth.get_profile()

# Создание API ключа
api_key = await sdk.auth.create_api_key(
    name="My API Key",
    project_id=1,
    scopes=["read", "write"]
)
```

#### 👑 AgentAdmin
```python
# Получение пользователей
users = await sdk.admin.get_users(limit=10)

# Создание пользователя
new_user = await sdk.admin.create_user(
    username="newuser",
    email="newuser@example.com",
    password="password",
    role="member"
)

# Получение статистики системы
stats = await sdk.admin.get_system_stats()
```

#### 🧠 AgentNeural
```python
# Neural Cache
await sdk.neural.cache.set("product:1", {"name": "Product A"}, ttl=3600)
product = await sdk.neural.cache.get("product:1")

# Neural Events
await sdk.neural.events.emit("user_activity", {
    "user_id": "123",
    "action": "view_product"
})

# Pattern Analysis
analysis = await sdk.neural.patterns.analyze("user_behavior", {
    "user_id": 123,
    "period": "week"
})
```

#### 💳 AgentPayments
```python
# Получение методов оплаты
methods = await sdk.payments.get_payment_methods()

# Создание платежа
payment = await sdk.payments.create_payment({
    "amount": 1000,
    "currency": "RUB",
    "description": "Test payment"
})

# Получение статуса платежа
status = await sdk.payments.get_payment_status(payment["id"])
```

#### 📊 AgentAnalytics
```python
# Метрики дашборда
metrics = await sdk.analytics.get_dashboard_metrics(period="month")

# Статистика платежей
payment_stats = await sdk.analytics.get_payment_stats(period="week")

# Отправка события
await sdk.analytics.send_event({
    "event_type": "item_added_to_cart",
    "user_id": "user-456"
})
```

#### 🔗 AgentWebhooks
```python
# Создание webhook'а
webhook = await sdk.webhooks.create_webhook(
    url="https://example.com/hook",
    events=["payment.completed", "user.created"]
)

# Получение webhook'ов
webhooks = await sdk.webhooks.get_webhooks()

# Тестирование webhook'а
await sdk.webhooks.test_webhook(webhook["id"])
```

#### ⏰ AgentScheduler
```python
# Создание задачи
task = await sdk.scheduler.create_task(
    name="Daily Report",
    task_type="http_request",
    schedule="0 0 * * *"
)

# Получение задач
tasks = await sdk.scheduler.get_tasks()

# Запуск задачи вручную
await sdk.scheduler.run_task(task["id"])
```

## ⚙️ Конфигурация

### SDKConfig параметры:

```python
config = SDKConfig(
    api_base="http://localhost:8000",      # Базовый URL API
    api_key="your_api_key",                # API ключ
    timeout=30,                            # Таймаут запросов (сек)
    retry_attempts=3,                      # Количество попыток
    enable_caching=True,                   # Включить кэширование
    enable_metrics=True,                   # Включить метрики
    
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
    
    # Retry конфигурация
    retry={
        'attempts': 3,
        'delay': 1000,
        'backoff': 'exponential'
    },
    
    # Cache конфигурация
    cache={
        'enabled': True,
        'ttl': 300
    },
    
    # Logging конфигурация
    logging={
        'level': 'info',
        'enabled': True
    }
)
```

## 🔧 Утилиты

### Проверка статуса:
```python
# Проверка здоровья системы
healthy = await sdk.health_check()

# Получение статуса SDK
status = await sdk.get_status()

# Получение метрик
metrics = await sdk.get_metrics()
```

### Управление кэшем:
```python
# Очистка кэша
await sdk.clear_cache()
```

## 📝 Требования

- Python 3.8+
- aiohttp 3.8.0+
- asyncio-mqtt 0.11.0+
- python-dateutil 2.8.0+

## 🐛 Обработка ошибок

```python
try:
    result = await sdk.auth.login("user@example.com", "wrong_password")
except HTTPError as e:
    print(f"HTTP Error {e.status_code}: {e.response_data}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## 📚 Дополнительные ресурсы

- [Документация API](https://docs.agentstack.com)
- [Примеры использования](examples/)
- [GitHub Repository](https://github.com/agentstacktech/agentstack-sdk)
- [Поддержка](https://github.com/agentstacktech/agentstack-sdk/issues)

## 📄 Лицензия

MIT License
