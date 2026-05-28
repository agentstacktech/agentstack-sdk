/**
 * FileStorage Examples - Примеры использования утилиты FileStorage
 *
 * Утилита для преобразования файлов в JSON-совместимые строки и обратно
 * Поддерживает любые типы файлов включая изображения, документы, бинарные файлы
 */

import { FileStorage, fileToJSON, jsonToFile, fileToFileInfo, fileInfoToFile } from './FileStorage';

// ===== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ =====

/**
 * ПРИМЕР 1: Простое хранение аватара в профиле пользователя
 *
 * Сценарий: Пользователь загружает аватар, мы сохраняем его в JSON профиле
 */
export async function saveAvatarToProfile(avatarFile: File) {
  try {
    // Преобразуем файл в JSON строку
    const avatarJSON = await FileStorage.fileToJSON(avatarFile, FileStorage.getAvatarOptions());

    // Сохраняем в профиль (пример структуры данных)
    const userProfile = {
      username: 'john_doe',
      display_name: 'John Doe',
      avatar: {
        data: avatarJSON,
        filename: avatarFile.name,
        mimeType: avatarFile.type,
        size: avatarFile.size
      }
    };

    console.log('Аватар сохранен в профиль:', userProfile);
    return userProfile;

  } catch (error) {
    console.error('Ошибка сохранения аватара:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 2: Восстановление аватара из профиля
 *
 * Сценарий: Загружаем профиль пользователя и восстанавливаем аватар
 */
export function loadAvatarFromProfile(userProfile: any) {
  try {
    if (!userProfile.avatar?.data) {
      throw new Error('Аватар не найден в профиле');
    }

    // Восстанавливаем файл из JSON строки
    const avatarFile = FileStorage.jsonToFile(
      userProfile.avatar.data,
      userProfile.avatar.filename,
      userProfile.avatar.mimeType
    );

    console.log('Аватар восстановлен:', {
      name: avatarFile.name,
      size: FileStorage.formatFileSize(avatarFile.size),
      type: avatarFile.type
    });

    return avatarFile;

  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 3: Использование FileInfo для полной информации о файле
 *
 * Сценарий: Хранение полной информации о файле для надежного восстановления
 */
export async function saveFileWithMetadata(file: File) {
  try {
    // Преобразуем файл в объект с полной информацией
    const fileInfo = await FileStorage.fileToFileInfo(file, FileStorage.getDocumentOptions());

    // Сохраняем в JSON (вся информация о файле сохраняется автоматически)
    const documentData = {
      id: 'doc_123',
      title: 'Важный документ',
      file: fileInfo, // Полная информация о файле
      uploadedAt: new Date().toISOString()
    };

    console.log('Файл с метаданными сохранен:', {
      name: fileInfo.name,
      size: FileStorage.formatFileSize(fileInfo.size),
      type: fileInfo.type,
      dataLength: fileInfo.data.length
    });

    return documentData;

  } catch (error) {
    console.error('Ошибка сохранения файла:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 4: Восстановление файла из FileInfo
 */
export function loadFileFromMetadata(documentData: any) {
  try {
    if (!documentData.file) {
      throw new Error('Информация о файле не найдена');
    }

    // Восстанавливаем файл из FileInfo
    const file = FileStorage.fileInfoToFile(documentData.file);

    console.log('Файл восстановлен из метаданных:', {
      name: file.name,
      size: FileStorage.formatFileSize(file.size),
      type: file.type,
      uploadedAt: documentData.uploadedAt
    });

    return file;

  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 5: Работа с изображениями (data URL для HTML)
 *
 * Сценарий: Преобразование изображения для использования в HTML img src
 */
export async function imageToDataURL(imageFile: File) {
  try {
    // Преобразуем в data URL для использования в HTML
    const dataURL = await FileStorage.fileToDataURL(imageFile, FileStorage.getImageOptions());

    // Можно использовать напрямую в HTML
    const imgElement = `<img src="${dataURL}" alt="Preview" style="max-width: 200px;" />`;

    console.log('Изображение преобразовано в data URL, длина:', dataURL.length);
    console.log('HTML элемент:', imgElement);

    return { dataURL, imgElement };

  } catch (error) {
    console.error('Ошибка обработки изображения:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 6: Batch обработка нескольких файлов
 *
 * Сценарий: Сохранение галереи изображений
 */
export async function saveImageGallery(files: FileList | File[]) {
  try {
    const gallery = {
      id: 'gallery_123',
      name: 'Моя галерея',
      images: [] as any[],
      createdAt: new Date().toISOString()
    };

    // Обрабатываем каждый файл
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!FileStorage.isImageFile(file)) {
        console.warn(`Файл ${file.name} пропущен - не является изображением`);
        continue;
      }

      const imageInfo = await FileStorage.fileToFileInfo(file, FileStorage.getImageOptions());

      gallery.images.push({
        id: `img_${i + 1}`,
        file: imageInfo,
        order: i + 1
      });
    }

    console.log(`Галерея сохранена с ${gallery.images.length} изображениями`);

    return gallery;

  } catch (error) {
    console.error('Ошибка сохранения галереи:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 7: Валидация файлов перед обработкой
 */
export function validateAvatarFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const options = FileStorage.getAvatarOptions();

  try {
    // Проверяем размер
    if (file.size > (options.maxSize || 0)) {
      errors.push(`Размер файла превышает ${FileStorage.formatFileSize(options.maxSize || 0)}`);
    }

    // Проверяем тип
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`Тип файла ${file.type} не поддерживается. Разрешенные типы: ${options.allowedTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Неизвестная ошибка валидации']
    };
  }
}

/**
 * ПРИМЕР 8: Экспорт/импорт настроек с файлами
 *
 * Сценарий: Экспорт пользовательских настроек включая аватар
 */
export async function exportUserSettings(userId: string, avatarFile?: File) {
  try {
    const settings = {
      userId,
      theme: 'dark',
      locale: 'ru',
      notifications: {
        email: true,
        push: false
      },
      avatar: null as any
    };

    // Если есть аватар - добавляем его
    if (avatarFile) {
      settings.avatar = await FileStorage.fileToFileInfo(avatarFile, FileStorage.getAvatarOptions());
    }

    // Экспортируем как JSON строку
    const exportData = JSON.stringify(settings, null, 2);

    console.log('Настройки экспортированы, размер:', FileStorage.formatFileSize(exportData.length));

    return exportData;

  } catch (error) {
    console.error('Ошибка экспорта настроек:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 9: Импорт настроек с восстановлением файлов
 */
export function importUserSettings(exportData: string) {
  try {
    const settings = JSON.parse(exportData);

    // Если есть аватар - восстанавливаем файл
    if (settings.avatar) {
      const avatarFile = FileStorage.fileInfoToFile(settings.avatar);
      settings.avatarFile = avatarFile; // Добавляем восстановленный файл
    }

    console.log('Настройки импортированы для пользователя:', settings.userId);

    return settings;

  } catch (error) {
    console.error('Ошибка импорта настроек:', error);
    throw error;
  }
}

/**
 * ПРИМЕР 10: Работа с быстрыми функциями-обертками
 */
export async function quickFileOperations() {
  // Создаем тестовый файл (в реальности файл приходит от input[type="file"])
  const testFile = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });

  try {
    // Быстрое преобразование в JSON
    const jsonData = await fileToJSON(testFile);
    console.log('Файл преобразован в JSON, длина:', jsonData.length);

    // Быстрое восстановление из JSON
    const restoredFile = jsonToFile(jsonData, testFile.name, testFile.type);
    console.log('Файл восстановлен:', restoredFile.name, FileStorage.formatFileSize(restoredFile.size));

    // Работа с FileInfo
    const fileInfo = await fileToFileInfo(testFile);
    const fileFromInfo = fileInfoToFile(fileInfo);
    console.log('Работа с FileInfo завершена:', fileFromInfo.name);

  } catch (error) {
    console.error('Ошибка в быстрых операциях:', error);
  }
}

// ===== ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ =====

/**
 * Утилита для создания превью изображений
 */
export async function createImagePreview(imageFile: File, maxWidth: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Вычисляем размеры с сохранением пропорций
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Рисуем изображение
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Преобразуем в data URL
      const previewDataURL = canvas.toDataURL('image/jpeg', 0.8);
      resolve(previewDataURL);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Утилита для расчета эффективности хранения
 */
export function calculateStorageEfficiency(originalSize: number, jsonSize: number): {
  efficiency: number;
  overhead: string;
  compression: string;
} {
  const jsonStringSize = jsonSize; // Размер JSON строки в байтах
  const base64Size = Math.ceil(originalSize * 4 / 3); // Теоретический размер base64
  const overhead = ((jsonStringSize - originalSize) / originalSize * 100);
  const efficiency = (originalSize / jsonStringSize * 100);

  return {
    efficiency: Math.round(efficiency * 100) / 100,
    overhead: overhead > 0 ? `+${Math.round(overhead)}%` : `${Math.round(overhead)}%`,
    compression: overhead > 0 ? 'Увеличение размера' : 'Сжатие'
  };
}
