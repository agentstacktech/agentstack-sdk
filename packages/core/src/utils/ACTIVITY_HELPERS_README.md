# Activity Helpers - Универсальная система проверки активности

## Философия

Единый механизм проверки `is_active` для любых сущностей через SDK. Использует систему плоских белков (flat proteins) для эффективного доступа O(1).

## Основные функции

### `isActive(entity, path?)`

Универсальная проверка активности сущности.

**Параметры:**
- `entity` - Сущность (8DNA или плоский белок)
- `path` - Опциональный путь к области проверки (например: `'skills.passive_skill'`)

**Возвращает:** `true` если сущность/область активна, `false` иначе

**Примеры:**

```typescript
import { isActive } from '@agentstack/sdk/utils';

// Проверка активности проекта
const project = { data: { is_active: true } };
isActive(project); // true

// Проверка активности навыка
const user = { 
  data: { 
    skills: { 
      passive_skill: { is_active: false } 
    } 
  } 
};
isActive(user, 'skills.passive_skill'); // false
```

### `getIsActive(entity, path?)`

Получить значение `is_active` по пути.

**Примеры:**

```typescript
import { getIsActive } from '@agentstack/sdk/utils';

const user = { data: { is_active: true } };
getIsActive(user); // true

const skill = { data: { skills: { passive_skill: { is_active: false } } } };
getIsActive(skill, 'skills.passive_skill'); // false
```

### `setIsActive(entity, value, path?)`

Установить значение `is_active` по пути.

**Примеры:**

```typescript
import { setIsActive } from '@agentstack/sdk/utils';

const user = { data: {} };
setIsActive(user, true);
// user.data.is_active === true

setIsActive(user, false, 'skills.passive_skill');
// user.data.skills.passive_skill.is_active === false
```

### `filterActive(entities, path?)`

Фильтровать активные сущности из массива.

**Примеры:**

```typescript
import { filterActive } from '@agentstack/sdk/utils';

const projects = [
  { data: { is_active: true } },
  { data: { is_active: false } }
];

const activeProjects = filterActive(projects);
// [{ data: { is_active: true } }]
```

### `getActiveCount(entities, path?)`

Получить количество активных сущностей.

**Примеры:**

```typescript
import { getActiveCount } from '@agentstack/sdk/utils';

const users = [
  { data: { is_active: true } },
  { data: { is_active: false } },
  { data: { is_active: true } }
];

getActiveCount(users); // 2
```

### `toFlatProteinEntity(entity)`

Преобразовать 8DNA сущность в плоский белок для O(1) доступа.

**Примеры:**

```typescript
import { toFlatProteinEntity } from '@agentstack/sdk/utils';

const entity = {
  id: 1,
  data: { name: 'Test', is_active: true },
  config: { settings: { enabled: true } }
};

const protein = toFlatProteinEntity(entity);
// {
//   '_id': 1,
//   'data.name': 'Test',
//   'data.is_active': true,
//   'config.settings.enabled': true
// }
```

### `getFlatValue(protein, path, defaultValue?)`

Получить значение из плоского белка по пути.

**Примеры:**

```typescript
import { getFlatValue } from '@agentstack/sdk/utils';

const protein = { 'data.skills.passive_skill.is_active': false };
getFlatValue(protein, 'data.skills.passive_skill.is_active'); // false
```

## Поддерживаемые форматы

### 8DNA сущности

```typescript
const entity = {
  id: 1,
  uuid: '...',
  project_id: 1025,
  data: {
    is_active: true,
    name: 'Test'
  },
  config: {
    settings: { enabled: true }
  }
};
```

### Плоские белки (Flat Proteins)

```typescript
const protein = {
  '_id': 1,
  '_uuid': '...',
  '_project_id': 1025,
  'data.is_active': true,
  'data.name': 'Test',
  'config.settings.enabled': true
};
```

## Приоритет проверки

При проверке `isActive(entity)` без пути:

1. `entity.data.is_active` (если существует)
2. `entity.is_active` (если существует)
3. `true` (по умолчанию, для backward compatibility)

## Интеграция с существующим кодом

Старые функции `isProjectActive()` теперь используют `isActive()` внутри:

```typescript
// Старый способ (все еще работает)
import { isProjectActive } from '@agentstack/sdk/utils';
isProjectActive(project);

// Новый универсальный способ (рекомендуется)
import { isActive } from '@agentstack/sdk/utils';
isActive(project);
isActive(user, 'skills.passive_skill');
```

## Производительность

- **8DNA сущности**: O(n) где n - глубина вложенности
- **Плоские белки**: O(1) - прямой доступ по ключу
- **Рекомендация**: Используйте `toFlatProteinEntity()` для частых проверок

## Примеры использования

См. `activityHelpers.examples.ts` для подробных примеров.

