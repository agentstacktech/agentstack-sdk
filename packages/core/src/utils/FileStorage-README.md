# FileStorage Utility

Универсальная утилита для преобразования файлов в JSON-совместимые строки и обратно. Поддерживает любые типы файлов включая изображения, документы и бинарные файлы.

## Основные возможности

- ✅ **Любой тип файла** - изображения, документы, бинарные файлы
- ✅ **Base64 кодирование** - совместимо с JSON
- ✅ **Метаданные файлов** - имя, размер, тип, время изменения
- ✅ **Валидация** - проверка размера и типа файлов
- ✅ **Оптимизация** - специальные настройки для изображений и аватаров
- ✅ **TypeScript** - полная типизация

## Быстрый старт

```typescript
import { FileStorage, fileToJSON, jsonToFile } from '@agentstack/sdk';

// Преобразование файла в JSON
const jsonString = await FileStorage.fileToJSON(imageFile);

// Обратное преобразование
const restoredFile = FileStorage.jsonToFile(jsonString, 'avatar.jpg', 'image/jpeg');
```

## API Reference

### FileStorage класс

#### Методы преобразования

- `fileToJSON(file, options?)` - файл → base64 строка
- `jsonToFile(jsonString, filename, mimeType?, lastModified?)` - base64 строка → файл
- `fileToFileInfo(file, options?)` - файл → объект FileInfo
- `fileInfoToFile(fileInfo)` - объект FileInfo → файл
- `fileToDataURL(file, options?)` - файл → data URL для HTML
- `dataURLToFile(dataURL, filename)` - data URL → файл

#### Вспомогательные методы

- `isImageFile(file)` - проверка, является ли файл изображением
- `formatFileSize(bytes)` - форматирование размера файла
- `getAvatarOptions()` - настройки для аватаров
- `getImageOptions()` - настройки для изображений
- `getDocumentOptions()` - настройки для документов

### Быстрые функции

```typescript
import { fileToJSON, jsonToFile, fileToFileInfo, fileInfoToFile } from '@agentstack/sdk';
```

### Типы

```typescript
interface FileInfo {
  name: string;        // Имя файла
  size: number;        // Размер в байтах
  type: string;        // MIME тип
  data: string;        // Base64 данные
  lastModified?: number; // Время изменения
}

interface FileStorageOptions {
  maxSize?: number;           // Максимальный размер
  allowedTypes?: string[];    // Разрешенные MIME типы
  imageQuality?: number;      // Качество изображений (0-1)
}
```

## Примеры использования

### Хранение аватара в профиле

```typescript
// Сохранение
const avatarJSON = await FileStorage.fileToJSON(avatarFile, FileStorage.getAvatarOptions());
const profile = { avatar: { data: avatarJSON, filename: avatarFile.name } };

// Загрузка
const avatarFile = FileStorage.jsonToFile(
  profile.avatar.data,
  profile.avatar.filename,
  'image/jpeg'
);
```

### Хранение с метаданными

```typescript
// Сохранение
const fileInfo = await FileStorage.fileToFileInfo(file);
const data = { file: fileInfo };

// Загрузка
const file = FileStorage.fileInfoToFile(data.file);
```

### Работа с изображениями

```typescript
// Data URL для HTML
const dataURL = await FileStorage.fileToDataURL(imageFile);
const img = `<img src="${dataURL}" />`;
```

## Ограничения и рекомендации

### Ограничения
- Максимальный размер файла: 10MB (настраивается)
- Base64 увеличивает размер на ~33%
- Браузерные ограничения на File API

### Рекомендации
- Для аватаров: используйте `getAvatarOptions()` (2MB, quality: 0.85)
- Для изображений: используйте `getImageOptions()` (5MB, quality: 0.9)
- Для больших файлов: рассмотрите внешнее хранилище
- Всегда валидируйте файлы перед обработкой

## Производительность

| Тип файла | Оригинал | Base64 | Overhead |
|-----------|----------|--------|----------|
| Текст 1KB | 1KB | 1.4KB | +40% |
| Изображение 100KB | 100KB | 134KB | +34% |
| Документ 1MB | 1MB | 1.34MB | +34% |

## Совместимость

- ✅ **Браузеры**: Все современные браузеры
- ✅ **Node.js**: С File API полифиллом
- ✅ **TypeScript**: Полная поддержка типов
- ✅ **JSON**: Base64 совместим с JSON

## Смотрите также

- [Примеры использования](./FileStorage-examples.ts)
- [Тесты](../../__tests__/modules/FileStorage.test.ts)
