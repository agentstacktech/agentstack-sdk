/**
 * FileStorageIntegration Examples - Примеры интеграции FileStorage с Protein и 8DNA
 *
 * Показывает как легко помещать и извлекать файлы из белковых запросов и DNA сущностей
 */

import {
  FileStorageIntegration,
  createFileStorageIntegration,
  storeFileInDNAEntity,
  retrieveFileFromDNAEntity,
  storeFileInProtein,
  retrieveFileFromProtein,
  type FileEnabledDNAEntity,
  type FileEnabledProteinRequest
} from './FileStorageIntegration';

import { DNAEntity } from './AgentDNA';
import { ProteinRequest } from './AgentProtein';

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

const fileIntegration = createFileStorageIntegration({
  inlineFileSizeLimit: 2 * 1024 * 1024, // 2MB для больших файлов
  autoCleanup: true
});

// ============================================================================
// ПРИМЕР 1: ХРАНЕНИЕ АВАТАРА В ПРОФИЛЕ ПОЛЬЗОВАТЕЛЯ (DNA)
// ============================================================================

async function exampleStoreAvatarInProfile() {
  console.log('🖼️ Пример 1: Хранение аватара в профиле пользователя (DNA)');

  // Создаем тестовый файл аватара
  const avatarFile = new File(['fake-image-data'], 'avatar.jpg', { type: 'image/jpeg' });

  // Исходная DNA сущность профиля
  const profileEntity: DNAEntity = {
    id: 1,
    uuid: 'profile_123',
    project_id: 1,
    user_id: 123,
    data: {
      username: 'john_doe',
      display_name: 'John Doe',
      bio: 'Software Developer',
      theme: 'dark'
    },
    config: {
      privacy: 'public',
      notifications: true
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null
  };

  try {
    // Помещаем аватар в сущность
    const profileWithAvatar = await fileIntegration.storeFileInDNA(
      profileEntity,
      'avatar',
      avatarFile
    );

    console.log('✅ Аватар сохранен в профиле');
    console.log('📊 Размер файла:', FileStorageIntegration.prototype.getTotalFileSize(profileWithAvatar), 'bytes');
    console.log('📁 Структура:', JSON.stringify(profileWithAvatar, null, 2));

    // Сохраняем в базу данных
    // await dnaApi.create('user_profiles', profileWithAvatar);

    return profileWithAvatar;

  } catch (error) {
    console.error('❌ Ошибка сохранения аватара:', error);
  }
}

// ============================================================================
// ПРИМЕР 2: ЗАГРУЗКА АВАТАРА ИЗ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (DNA)
// ============================================================================

async function exampleRetrieveAvatarFromProfile(profileWithAvatar: FileEnabledDNAEntity) {
  console.log('🖼️ Пример 2: Загрузка аватара из профиля пользователя (DNA)');

  try {
    // Извлекаем аватар из сущности
    const avatarFile = await fileIntegration.retrieveFileFromDNA(profileWithAvatar, 'avatar');

    if (avatarFile) {
      console.log('✅ Аватар успешно извлечен');
      console.log('📁 Имя файла:', avatarFile.name);
      console.log('📊 Размер:', avatarFile.size, 'bytes');
      console.log('🏷️ Тип:', avatarFile.type);

      // Используем файл (например, для отображения)
      const avatarUrl = URL.createObjectURL(avatarFile);
      console.log('🔗 URL для отображения:', avatarUrl);

      return avatarFile;
    } else {
      console.log('⚠️ Аватар не найден');
    }

  } catch (error) {
    console.error('❌ Ошибка загрузки аватара:', error);
  }
}

// ============================================================================
// ПРИМЕР 3: ХРАНЕНИЕ ДОКУМЕНТОВ В БЕЛКОВОМ ЗАПРОСЕ
// ============================================================================

async function exampleStoreDocumentInProtein() {
  console.log('📄 Пример 3: Хранение документа в белковом запросе');

  // Создаем тестовый документ
  const documentFile = new File(['document-content'], 'contract.pdf', { type: 'application/pdf' });

  // Исходный белковый запрос
  const proteinRequest: ProteinRequest = {
    uuid: 'protein_upload_123',
    command_type: 'upload_document',
    target: {
      project_id: 1,
      user_id: 123
    },
    data: {
      document_type: 'contract',
      title: 'Service Agreement',
      description: 'Legal contract for services',
      metadata: {
        version: '1.0',
        language: 'en'
      }
    },
    config: {
      priority: 'high',
      notifications: true
    },
    timestamp: new Date().toISOString()
  };

  try {
    // Помещаем документ в запрос
    const requestWithDocument = await fileIntegration.storeFileInProteinRequest(
      proteinRequest,
      'document',
      documentFile
    );

    console.log('✅ Документ помещен в белковый запрос');
    console.log('📊 Общий размер файлов:', fileIntegration.getTotalFileSize(requestWithDocument), 'bytes');

    // Отправляем запрос
    // await proteinApi.executeProteinCommand(requestWithDocument);

    return requestWithDocument;

  } catch (error) {
    console.error('❌ Ошибка помещения документа:', error);
  }
}

// ============================================================================
// ПРИМЕР 4: РАБОТА С ГАЛЕРЕЕЙ ИЗОБРАЖЕНИЙ В DNA
// ============================================================================

async function exampleImageGalleryInDNA() {
  console.log('🖼️ Пример 4: Галерея изображений в DNA сущности');

  // Создаем несколько тестовых изображений
  const images = [
    new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' }),
    new File(['image2'], 'photo2.png', { type: 'image/png' }),
    new File(['image3'], 'diagram.svg', { type: 'image/svg+xml' })
  ];

  // DNA сущность для галереи
  const galleryEntity: DNAEntity = {
    id: 2,
    uuid: 'gallery_456',
    project_id: 1,
    user_id: 123,
    data: {
      name: 'Project Screenshots',
      description: 'UI screenshots for the project',
      tags: ['ui', 'design', 'screenshots']
    },
    config: {
      visibility: 'private',
      allow_download: true
    },
    created_at: new Date().toISOString(),
    updated_at: null
  };

  try {
    // Добавляем изображения одно за другим
    let galleryWithImages = galleryEntity as FileEnabledDNAEntity;

    for (let i = 0; i < images.length; i++) {
      galleryWithImages = await fileIntegration.storeFileInDNA(
        galleryWithImages,
        `image_${i + 1}`,
        images[i]
      );
      console.log(`✅ Изображение ${i + 1} добавлено`);
    }

    console.log('✅ Галерея создана с', images.length, 'изображениями');
    console.log('📊 Общий размер:', fileIntegration.getTotalFileSize(galleryWithImages), 'bytes');

    // Получаем информацию о всех файлах
    const fileInfos = fileIntegration.getFileInfo(galleryWithImages);
    console.log('📁 Файлы в галерее:', fileInfos.map(f => {
      const name = 'name' in f.fileInfo ? f.fileInfo.name : f.fileInfo.originalName;
      return `${f.fieldName}: ${name}`;
    }));

    return galleryWithImages;

  } catch (error) {
    console.error('❌ Ошибка создания галереи:', error);
  }
}

// ============================================================================
// ПРИМЕР 5: ОБНОВЛЕНИЕ ФАЙЛОВ В СУЩНОСТЯХ
// ============================================================================

async function exampleUpdateFilesInEntity(entityWithFiles: FileEnabledDNAEntity) {
  console.log('🔄 Пример 5: Обновление файлов в сущностях');

  // Создаем новый файл для замены
  const newAvatarFile = new File(['new-avatar-data'], 'new-avatar.png', { type: 'image/png' });

  try {
    // Обновляем аватар
    const updatedEntity = await fileIntegration.updateFileInDNA(
      entityWithFiles,
      'avatar',
      newAvatarFile
    );

    console.log('✅ Аватар обновлен');
    console.log('📊 Новый размер:', fileIntegration.getTotalFileSize(updatedEntity), 'bytes');

    return updatedEntity;

  } catch (error) {
    console.error('❌ Ошибка обновления файла:', error);
  }
}

// ============================================================================
// ПРИМЕР 6: РАБОТА С БОЛЬШИМИ ФАЙЛАМИ (ВНЕШНЕЕ ХРАНИЛИЩЕ)
// ============================================================================

async function exampleLargeFileHandling() {
  console.log('📦 Пример 6: Работа с большими файлами');

  // Создаем большой файл (симулируем 5MB файл)
  const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large-video.mp4', { type: 'video/mp4' });

  // Настраиваем интеграцию для больших файлов
  const largeFileIntegration = createFileStorageIntegration({
    inlineFileSizeLimit: 1024 * 1024, // 1MB - файлы больше пойдут во внешнее хранилище
    autoCleanup: true
  });

  const testEntity: DNAEntity = {
    id: 3,
    uuid: 'large_file_789',
    project_id: 1,
    user_id: 123,
    data: { name: 'Large Video File' },
    config: {},
    created_at: new Date().toISOString(),
    updated_at: null
  };

  try {
    // Большой файл автоматически пойдет во внешнее хранилище
    const entityWithLargeFile = await largeFileIntegration.storeFileInDNA(
      testEntity,
      'video',
      largeFile
    );

    console.log('✅ Большой файл сохранен');
    console.log('📊 Используется внешнее хранилище:', !largeFileIntegration.getFileInfo(entityWithLargeFile)[0]?.fileInfo.hasOwnProperty('data'));

    return entityWithLargeFile;

  } catch (error) {
    console.error('❌ Ошибка работы с большим файлом:', error);
  }
}

// ============================================================================
// ПРИМЕР 7: БЫСТРЫЕ МЕТОДЫ ДЛЯ ПРОСТЫХ СЛУЧАЕВ
// ============================================================================

async function exampleQuickMethods() {
  console.log('⚡ Пример 7: Быстрые методы для простых случаев');

  const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

  // DNA сущность
  const dnaEntity: DNAEntity = {
    id: 4,
    uuid: 'quick_test',
    project_id: 1,
    user_id: 123,
    data: {},
    config: {},
    created_at: new Date().toISOString(),
    updated_at: null
  };

  // Белковый запрос
  const proteinRequest: ProteinRequest = {
    uuid: 'quick_protein_test',
    command_type: 'quick_upload',
    target: { project_id: 1, user_id: 123 },
    data: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Быстро сохраняем в DNA
    const dnaWithFile = await storeFileInDNAEntity(dnaEntity, 'attachment', testFile);
    console.log('✅ Файл быстро сохранен в DNA');

    // Быстро извлекаем из DNA
    const retrievedFromDNA = await retrieveFileFromDNAEntity(dnaWithFile, 'attachment');
    console.log('✅ Файл быстро извлечен из DNA:', retrievedFromDNA?.name);

    // Быстро сохраняем в белковый запрос
    const proteinWithFile = await storeFileInProtein(proteinRequest, 'upload', testFile);
    console.log('✅ Файл быстро сохранен в Protein');

    // Быстро извлекаем из белкового запроса
    const retrievedFromProtein = await retrieveFileFromProtein(proteinWithFile, 'upload');
    console.log('✅ Файл быстро извлечен из Protein:', retrievedFromProtein?.name);

  } catch (error) {
    console.error('❌ Ошибка быстрых методов:', error);
  }
}

// ============================================================================
// ПРИМЕР 8: АНАЛИЗ И СТАТИСТИКА ФАЙЛОВ В СИСТЕМЕ
// ============================================================================

async function exampleFileAnalysis(entity: FileEnabledDNAEntity) {
  console.log('📊 Пример 8: Анализ файлов в системе');

  try {
    const fileInfos = fileIntegration.getFileInfo(entity);
    const totalSize = fileIntegration.getTotalFileSize(entity);

    console.log('📁 Всего файлов:', fileInfos.length);
    console.log('📊 Общий размер:', totalSize, 'bytes');

    // Анализируем каждый файл
    for (const { fieldName, fileInfo } of fileInfos) {
      const name = 'name' in fileInfo ? fileInfo.name : fileInfo.originalName;
      const type = 'type' in fileInfo ? fileInfo.type : 'unknown';
      console.log(`  - ${fieldName}: ${name} (${fileInfo.size} bytes, ${type})`);
    }

    // Создаем превью для изображений
    for (const { fieldName } of fileInfos) {
      const preview = await fileIntegration.createImagePreview(entity, fieldName, 100);
      if (preview) {
        console.log(`🖼️ Превью для ${fieldName} создано (длина: ${preview.length} chars)`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка анализа файлов:', error);
  }
}

// ============================================================================
// ЗАПУСК ПРИМЕРОВ
// ============================================================================

export async function runFileStorageIntegrationExamples() {
  console.log('🚀 Запуск примеров FileStorageIntegration\n');

  try {
    // Пример 1: Сохранение аватара
    const profileWithAvatar = await exampleStoreAvatarInProfile();
    if (profileWithAvatar) {
      // Пример 2: Загрузка аватара
      await exampleRetrieveAvatarFromProfile(profileWithAvatar);
    }

    // Пример 3: Документы в белковых запросах
    await exampleStoreDocumentInProtein();

    // Пример 4: Галерея изображений
    const gallery = await exampleImageGalleryInDNA();
    if (gallery) {
      // Пример 5: Обновление файлов
      await exampleUpdateFilesInEntity(gallery);

      // Пример 8: Анализ файлов
      await exampleFileAnalysis(gallery);
    }

    // Пример 6: Большие файлы
    await exampleLargeFileHandling();

    // Пример 7: Быстрые методы
    await exampleQuickMethods();

    console.log('\n✅ Все примеры завершены успешно!');

  } catch (error) {
    console.error('❌ Ошибка выполнения примеров:', error);
  }
}

// Экспорт отдельных примеров для тестирования
export {
  exampleStoreAvatarInProfile,
  exampleRetrieveAvatarFromProfile,
  exampleStoreDocumentInProtein,
  exampleImageGalleryInDNA,
  exampleUpdateFilesInEntity,
  exampleLargeFileHandling,
  exampleQuickMethods,
  exampleFileAnalysis
};
