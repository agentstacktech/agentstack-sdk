# FileStorageIntegration - Интеграция файлов с Protein и 8DNA

Удобная интеграция FileStorage утилиты с белковой системой и 8DNA для легкого хранения и извлечения файлов.

## 🎯 Возможности

- ✅ **DNA сущности** - файлы в любых 8DNA таблицах
- ✅ **Белковые запросы** - файлы в Protein командах
- ✅ **Автоматическая сериализация** - JSON ↔ File
- ✅ **Гибридное хранение** - маленькие файлы inline, большие - external
- ✅ **Метаданные** - полная информация о файлах
- ✅ **TypeScript** - полная типизация

## 🚀 Быстрый старт

```typescript
import {
  storeFileInDNAEntity,
  retrieveFileFromDNAEntity,
  storeFileInProtein,
  retrieveFileFromProtein
} from '@agentstack/sdk';

// Сохраняем файл в DNA
const entityWithFile = await storeFileInDNAEntity(dnaEntity, 'avatar', avatarFile);

// Извлекаем файл из DNA
const file = await retrieveFileFromDNAEntity(entityWithFile, 'avatar');

// Сохраняем в белковый запрос
const requestWithFile = await storeFileInProtein(proteinRequest, 'document', docFile);

// Извлекаем из белкового запроса
const doc = await retrieveFileFromProtein(requestWithFile, 'document');
```

## 📋 API Reference

### Класс FileStorageIntegration

```typescript
const integration = new FileStorageIntegration({
  inlineFileSizeLimit: 1024 * 1024, // 1MB
  autoCleanup: true
});
```

#### DNA методы
- `storeFileInDNA(entity, fieldName, file)` - сохранить файл в DNA сущность
- `retrieveFileFromDNA(entity, fieldName)` - извлечь файл из DNA сущности
- `updateFileInDNA(entity, fieldName, newFile)` - обновить файл
- `removeFileFromDNA(entity, fieldName)` - удалить файл

#### Protein методы
- `storeFileInProteinRequest(request, fieldName, file)` - файл в запрос
- `storeFileInProteinResponse(response, fieldName, file)` - файл в ответ
- `retrieveFileFromProteinRequest(request, fieldName)` - извлечь из запроса
- `retrieveFileFromProteinResponse(response, fieldName)` - извлечь из ответа

#### Утилиты
- `getFileInfo(entity)` - информация о всех файлах
- `getTotalFileSize(entity)` - общий размер файлов
- `createImagePreview(entity, fieldName, maxWidth)` - превью изображений

### Быстрые функции

```typescript
import {
  createFileStorageIntegration,
  storeFileInDNAEntity,
  retrieveFileFromDNAEntity,
  storeFileInProtein,
  retrieveFileFromProtein
} from '@agentstack/sdk';
```

## 🗂️ Варианты хранения

### Вариант 1: Inline хранение (рекомендуется для маленьких файлов)
```typescript
// Файлы до 1MB хранятся прямо в JSON
const entity = await integration.storeFileInDNA(dnaEntity, 'avatar', smallFile);
// В data._files.avatar будет FileInfo с base64
```

### Вариант 2: External хранение (для больших файлов)
```typescript
// Файлы больше лимита идут во внешнее хранилище
const entity = await integration.storeFileInDNA(dnaEntity, 'video', largeFile);
// В data._files.video будет FileReference с ссылкой
```

### Вариант 3: Гибридный (автоматический выбор)
```typescript
// SDK сам выбирает оптимальный способ
const integration = createFileStorageIntegration({
  inlineFileSizeLimit: 2 * 1024 * 1024 // 2MB
});
```

## 📝 Примеры использования

### Аватар в профиле пользователя
```typescript
// Сохраняем аватар
const profileWithAvatar = await storeFileInDNAEntity(
  userProfile,
  'avatar',
  avatarFile
);

// Загружаем аватар
const avatar = await retrieveFileFromDNAEntity(profileWithAvatar, 'avatar');
const url = URL.createObjectURL(avatar);
```

### Документ в белковой команде
```typescript
// Помещаем документ в запрос
const request = await storeFileInProtein(proteinRequest, 'contract', pdfFile);

// API сам обработает файл
const response = await proteinApi.executeCommand(request);
```

### Галерея изображений
```typescript
let gallery = dnaEntity;
for (let i = 0; i < images.length; i++) {
  gallery = await storeFileInDNAEntity(gallery, `image_${i}`, images[i]);
}

// Получить все файлы
const fileInfos = integration.getFileInfo(gallery);
```

## 🔧 Конфигурация

```typescript
interface FileStorageIntegrationOptions {
  inlineFileSizeLimit?: number;  // Лимит для inline хранения (1MB)
  fileStorageOptions?: FileStorageOptions;  // Опции FileStorage
  autoCleanup?: boolean;  // Автоочистка external файлов
}
```

## 📊 Производительность

| Размер файла | Inline (JSON) | External | Рекомендация |
|-------------|---------------|----------|--------------|
| < 1MB | +33% | - | Inline |
| 1-10MB | +33% | ✅ Быстрее | External |
| > 10MB | ❌ Медленно | ✅ | External |

## 🛡️ Безопасность

- ✅ Валидация типов файлов
- ✅ Проверка размеров
- ✅ Base64 кодирование
- ✅ Автоочистка временных файлов

## 🔗 Совместимость

- ✅ **Protein System** - все типы команд
- ✅ **8DNA** - все 22 таблицы
- ✅ **FileStorage** - все возможности
- ✅ **TypeScript** - полная типизация

## 📖 Смотрите также

- [FileStorage утилита](../utils/FileStorage.ts)
- [Примеры использования](./FileStorageIntegration-examples.ts)
- [Protein система](./AgentProtein.ts)
- [8DNA система](./AgentDNA.ts)
