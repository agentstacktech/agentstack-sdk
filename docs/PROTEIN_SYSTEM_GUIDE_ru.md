# 🧬 AgentStack Protein System Guide

**EN:** [PROTEIN_SYSTEM_GUIDE.md](./PROTEIN_SYSTEM_GUIDE.md)

**Version:** 0.3.6  
**Author:** Lance (Александр Васильев)  
**Date:** 2025-01-13  
**Philosophy:** AI Gene Interface + 8DNA Architecture + Protein Command Architecture

## 🎯 Overview

Белковая система AgentStack SDK предоставляет мощные возможности для запросов и получения сложных структур данных через единый API. Система основана на принципах белковой архитектуры и поддерживает композицию страниц, игровые данные и автоматическую обработку ответов.

## 🏗️ Architecture

### Core Components

1. **AgentProtein** - Основной модуль для белковых запросов
2. **ProteinResponseProcessor** - Обработчик и трансформатор ответов
3. **PageCompositionSystem** - Система композиции страниц
4. **GameDataSystem** - Система управления игровыми данными

### Key Features

- 🧬 **Protein Commands** - Универсальные белковые команды
- 🎨 **Page Composition** - 3D композиция страниц с шаблонами
- 🎮 **Game Data Management** - Полное управление игровыми данными
- ⚡ **Advanced Caching** - Многоуровневое кэширование
- 🔄 **Event System** - Полная система событий
- 📊 **Performance Metrics** - Детальная аналитика

## 🚀 Quick Start

### Installation

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: 'https://agentstack.tech/api',
  timeout: 30000,
  enableCaching: true
});
```

### Basic Usage

```typescript
// Получение данных профиля
const profileData = await sdk.protein.getProfileData(1, 123, true, true);

// Композиция страницы
const page = await sdk.pageComposition.composePage(
  'user_profile_3d',
  1, 123, {}, 'desktop'
);

// Игровые данные
const character = await sdk.gameData.getCharacterData(1, 123, 'char_001');
```

## 🧬 Protein Commands

### Available Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `get_page_data` | Получение данных страницы | Композиция UI |
| `get_character_data` | Данные персонажа | Игровые системы |
| `get_inventory_data` | Инвентарь | Управление предметами |
| `get_quest_data` | Данные квестов | Игровой прогресс |
| `get_shop_data` | Данные магазина | E-commerce |
| `get_dashboard_data` | Данные дашборда | Аналитика |
| `get_news_data` | Новостной контент | Контент-системы |

### Command Structure

```typescript
interface ProteinRequest {
  uuid: string;
  command_type: string;
  target: {
    project_id: number;
    user_id: number;
  };
  data: Record<string, any>;
  config?: Record<string, any>;
  timestamp: string;
}
```

## 🎨 Page Composition System

### Templates

Система поддерживает готовые шаблоны:

- **user_profile_3d** - 3D профиль пользователя
- **game_dashboard_3d** - 3D игровой дашборд
- **shop_3d** - 3D магазин

### Creating Custom Templates

```typescript
const customTemplate: PageTemplate = {
  id: 'my_custom_template',
  name: 'Custom Template',
  description: 'My custom page template',
  type: 'custom',
  layout: {
    structure: '3d',
    dimensions: { width: 1200, height: 800, depth: 600 },
    breakpoints: {
      mobile: { columns: 1, rows: 6, spacing: 16, padding: 16 },
      tablet: { columns: 2, rows: 4, spacing: 24, padding: 24 },
      desktop: { columns: 3, rows: 3, spacing: 32, padding: 32 }
    }
  },
  components: [
    // Define your components here
  ],
  metadata: {
    version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: 'Your Name',
    tags: ['custom', 'template']
  }
};

sdk.pageComposition.registerTemplate(customTemplate);
```

### Component Types

- **profile** - Профиль пользователя
- **stats** - Статистика
- **achievements** - Достижения
- **activity** - Активность
- **products** - Товары
- **cart** - Корзина
- **character** - Персонаж
- **inventory** - Инвентарь
- **quests** - Квесты
- **world** - Мир

## 🎮 Game Data System

### Game Sessions

```typescript
// Создание сессии
const session = await sdk.gameData.createGameSession(
  1,           // Project ID
  123,         // User ID
  'rpg_game',  // Game ID
  'char_001',  // Character ID
  'world_001'  // World ID
);

// Обновление сессии
await sdk.gameData.updateGameSession(session.id, {
  state: 'paused',
  metadata: { last_checkpoint: 'checkpoint_001' }
});

// Завершение сессии
await sdk.gameData.endGameSession(session.id, 'completed');
```

### Character Management

```typescript
// Получение данных персонажа
const character = await sdk.gameData.getCharacterData(
  1,      // Project ID
  123,    // User ID
  'char_001',
  true,   // Include inventory
  true,   // Include quests
  true    // Include achievements
);

// Обновление персонажа
await sdk.gameData.updateCharacterData(1, 123, 'char_001, {
  level: 10,
  experience: 1500,
  stats: {
    health: 120,
    mana: 80
  }
});
```

### Inventory Management

```typescript
// Получение инвентаря
const inventory = await sdk.gameData.getCharacterInventory(
  1, 123, 'char_001', true
);

// Добавление предмета
await sdk.gameData.addItemToInventory(1, 123, 'char_001, {
  id: 'sword_001',
  name: 'Iron Sword',
  type: 'weapon',
  quantity: 1,
  rarity: 'common'
}, 1);

// Удаление предмета
await sdk.gameData.removeItemFromInventory(1, 123, 'char_001, 'sword_001', 1);
```

### Quest Management

```typescript
// Получение квеста
const quest = await sdk.gameData.getQuestData(1, 123, 'quest_001');

// Начало квеста
await sdk.gameData.startQuest(1, 123, 'char_001, 'quest_001');

// Обновление прогресса
await sdk.gameData.updateQuestProgress(
  1, 123, 'char_001, 'quest_001', 'obj_001', 50
);

// Завершение квеста
const rewards = await sdk.gameData.completeQuest(1, 123, 'char_001, 'quest_001');
```

## ⚡ Advanced Features

### Batch Requests

```typescript
const batchCommands = [
  {
    type: 'get_character_data' as const,
    name: 'Load Character',
    payload: { character_id: 'char_001' }
  },
  {
    type: 'get_inventory_data' as const,
    name: 'Load Inventory',
    payload: { character_id: 'char_001' }
  }
];

const results = await sdk.protein.executeBatchRequests(1, 123, batchCommands);
```

### Complex Data Structures

```typescript
const complexData = await sdk.protein.getComplexDataStructure(1, 123, {
  profile: true,
  inventory: true,
  quests: true,
  world: true,
  stats: true,
  achievements: true
});
```

### Game Script Execution

```typescript
const scriptResult = await sdk.gameData.executeGameScript(
  1, 123, 'combat_script_001', {
    target: 'goblin',
    skill: 'fireball',
    character_id: 'char_001'
  }
);
```

## 🔄 Event System

### Available Events

#### Protein System Events
- `protein:request:start` - Начало запроса
- `protein:request:success` - Успешный запрос
- `protein:request:error` - Ошибка запроса
- `protein:cache:hit` - Попадание в кэш

#### Page Composition Events
- `composition:start` - Начало композиции
- `composition:success` - Успешная композиция
- `composition:error` - Ошибка композиции
- `component:render:start` - Начало рендеринга компонента

#### Game Data Events
- `session:created` - Создана сессия
- `session:updated` - Обновлена сессия
- `session:ended` - Завершена сессия
- `character:loaded` - Загружен персонаж
- `quest:completed` - Завершен квест

### Event Handling

```typescript
// Обработка событий
sdk.on('protein:request:start', (data) => {
  console.log('Request started:', data.request.command_type);
});

sdk.on('composition:success', (data) => {
  console.log('Page composed in:', data.compositionTime + 'ms');
});

sdk.on('quest:completed', (data) => {
  console.log('Quest completed:', data.questId);
  console.log('Rewards:', data.rewards);
});
```

## 💾 Cache Management

### Cache Types

1. **Protein Cache** - Кэш белковых запросов
2. **Processing Cache** - Кэш обработанных данных
3. **Composition Cache** - Кэш композиций страниц
4. **Game Cache** - Кэш игровых данных
5. **Session Cache** - Кэш игровых сессий
6. **Script Cache** - Кэш игровых скриптов

### Cache Operations

```typescript
// Получение статистики кэша
const proteinStats = sdk.protein.getCacheStats();
const processingStats = sdk.proteinProcessor.getProcessingStats();
const systemStats = sdk.pageComposition.getSystemStats();
const gameStats = sdk.gameData.getSystemStats();

// Очистка кэшей
sdk.protein.clearProteinCache();
sdk.proteinProcessor.clearProcessingCache();
sdk.pageComposition.clearCompositionCache();
sdk.gameData.clearGameCache();
```

## 📊 Performance Metrics

### Available Metrics

- **Request Count** - Количество запросов
- **Cache Hit Rate** - Процент попаданий в кэш
- **Average Latency** - Средняя задержка
- **Error Rate** - Процент ошибок
- **Processing Time** - Время обработки
- **Composition Time** - Время композиции

### Metrics Access

```typescript
// Получение метрик SDK
const sdkMetrics = await sdk.getMetrics();

// Получение метрик обработки
const processingMetrics = sdk.proteinProcessor.getProcessingStats();

// Получение метрик системы
const systemMetrics = sdk.pageComposition.getSystemStats();
```

## 🛠️ Configuration

### SDK Configuration

```typescript
const config: SDKConfig = {
  apiBase: 'https://agentstack.tech/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCaching: true,
  enableMetrics: true,
  cacheTTL: 300000, // 5 minutes
  maxCacheSize: 1000
};

const sdk = new AgentStackSDK(config);
```

### Protein System Configuration

```typescript
// Настройка белковой системы
sdk.protein.updateConfig({
  cacheTTL: 600000, // 10 minutes
  maxCacheSize: 500,
  enableBatchProcessing: true,
  batchSize: 10
});
```

## 🔧 Troubleshooting

### Common Issues

1. **Cache Misses** - Проверьте настройки кэширования
2. **Slow Performance** - Оптимизируйте размеры кэша
3. **Memory Usage** - Очищайте кэши регулярно
4. **Event Handling** - Убедитесь в правильной настройке обработчиков

### Debug Mode

```typescript
// Включение отладочного режима
sdk.updateConfig({
  debug: true,
  logLevel: 'verbose'
});

// Просмотр детальной информации
sdk.on('protein:request:start', (data) => {
  console.log('Debug - Request:', JSON.stringify(data, null, 2));
});
```

## 📚 Examples

Полные примеры использования доступны в файле:
`examples/protein-system-examples.ts`

### Key Examples

1. **User Profile Composition** - Композиция профиля пользователя
2. **Game Data Management** - Управление игровыми данными
3. **Shop Page Composition** - Композиция страницы магазина
4. **Complex Data Structures** - Сложные структуры данных
5. **Game Script Execution** - Выполнение игровых скриптов
6. **Batch Requests** - Пакетные запросы
7. **Event Handling** - Обработка событий
8. **Cache Management** - Управление кэшем

## 🚀 Best Practices

### Performance

1. **Use Caching** - Включайте кэширование для часто используемых данных
2. **Batch Requests** - Группируйте запросы для лучшей производительности
3. **Optimize Templates** - Используйте эффективные шаблоны страниц
4. **Monitor Metrics** - Отслеживайте метрики производительности

### Development

1. **Event Handling** - Используйте систему событий для реактивности
2. **Error Handling** - Обрабатывайте ошибки корректно
3. **Type Safety** - Используйте TypeScript для типобезопасности
4. **Testing** - Тестируйте белковые запросы

### Architecture

1. **Modular Design** - Используйте модульную архитектуру
2. **Separation of Concerns** - Разделяйте ответственность модулей
3. **Scalability** - Проектируйте с учетом масштабируемости
4. **Maintainability** - Обеспечивайте поддерживаемость кода

## 📖 API Reference

Полная документация API доступна в:
- `packages/core/src/modules/AgentProtein.ts`
- `packages/core/src/modules/ProteinResponseProcessor.ts`
- `packages/core/src/modules/PageCompositionSystem.ts`
- `packages/core/src/modules/GameDataSystem.ts`

## 🤝 Contributing

Для внесения изменений в белковую систему:

1. Следуйте принципам AI Gene Interface
2. Применяйте гены архитектуры
3. Обеспечивайте обратную совместимость
4. Добавляйте тесты для новой функциональности
5. Обновляйте документацию

## 📄 License

AgentStack Protein System распространяется под лицензией MIT.

---

**Created by Lance (Александр Васильев)**  
**Email:** Lance@world4play.com  
**Philosophy:** "Мы изменим(ускорим) и построим будущее"
