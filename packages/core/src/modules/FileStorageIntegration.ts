/**
 * FileStorageIntegration - Интеграция FileStorage с Protein и 8DNA системами
 *
 * Обеспечивает легкое помещение и извлечение файлов из белковых запросов
 * и 8DNA сущностей с автоматической сериализацией/десериализацией
 */

import { FileStorage, FileInfo, FileStorageOptions } from '../utils/FileStorage';
import { logger } from '../utils/logger';
import { DNAEntity } from './AgentDNA';
import { ProteinRequest, ProteinResponse } from './AgentProtein';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Опции интеграции файлового хранилища
 */
export interface FileStorageIntegrationOptions {
  /** Максимальный размер файла для хранения в data поле (по умолчанию 1MB) */
  inlineFileSizeLimit?: number;
  /** Опции для FileStorage */
  fileStorageOptions?: FileStorageOptions;
  /** Автоматически очищать временные файлы */
  autoCleanup?: boolean;
}

/**
 * Расширенная DNA сущность с поддержкой файлов
 */
export interface FileEnabledDNAEntity<TData = any, TConfig = any> extends DNAEntity<TData, TConfig> {
  _files?: {
    [fieldName: string]: FileInfo | FileReference;
  };
}

/**
 * Ссылка на файл (для больших файлов)
 */
export interface FileReference {
  fileId: string;
  tableName: string;
  fieldName: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

/**
 * Белковый запрос с поддержкой файлов
 */
export interface FileEnabledProteinRequest extends Omit<ProteinRequest, 'data'> {
  data: {
    [key: string]: any;
    _files?: {
      [fieldName: string]: FileInfo | FileReference;
    };
  };
}

/**
 * Белковый ответ с поддержкой файлов
 */
export interface FileEnabledProteinResponse extends Omit<ProteinResponse, 'result'> {
  result: {
    [key: string]: any;
    _files?: {
      [fieldName: string]: FileInfo | FileReference;
    };
  };
}

// ============================================================================
// FILE STORAGE INTEGRATION CLASS
// ============================================================================

export class FileStorageIntegration {
  private options: Required<FileStorageIntegrationOptions>;

  constructor(options: FileStorageIntegrationOptions = {}) {
    this.options = {
      inlineFileSizeLimit: options.inlineFileSizeLimit || 1024 * 1024, // 1MB
      fileStorageOptions: options.fileStorageOptions || {},
      autoCleanup: options.autoCleanup ?? true
    };
  }

  // ============================================================================
  // DNA INTEGRATION METHODS
  // ============================================================================

  /**
   * Помещает файл в DNA сущность
   * @param entity DNA сущность
   * @param fieldName Имя поля для файла
   * @param file Файл для хранения
   * @returns Обновленная сущность
   */
  async storeFileInDNA<TData = any, TConfig = any>(
    entity: DNAEntity<TData, TConfig>,
    fieldName: string,
    file: File | Blob
  ): Promise<FileEnabledDNAEntity<TData, TConfig>> {
    const fileInfo = await FileStorage.fileToFileInfo(file, this.options.fileStorageOptions);

    const enhancedEntity: FileEnabledDNAEntity<TData, TConfig> = {
      ...entity,
      _files: {
        ...((entity as any)._files || {}),
        [fieldName]: fileInfo.size <= this.options.inlineFileSizeLimit
          ? fileInfo
          : await this.createFileReference(fileInfo, 'dna_entities', fieldName)
      }
    };

    return enhancedEntity;
  }

  /**
   * Извлекает файл из DNA сущности
   * @param entity DNA сущность с файлами
   * @param fieldName Имя поля файла
   * @returns Восстановленный файл или null
   */
  async retrieveFileFromDNA(
    entity: FileEnabledDNAEntity,
    fieldName: string
  ): Promise<File | null> {
    const fileRef = entity._files?.[fieldName];
    if (!fileRef) return null;

    if (this.isFileInfo(fileRef)) {
      return FileStorage.fileInfoToFile(fileRef);
    } else {
      return await this.retrieveFileFromReference(fileRef);
    }
  }

  /**
   * Обновляет файл в DNA сущности
   * @param entity Исходная сущность
   * @param fieldName Имя поля файла
   * @param newFile Новый файл
   * @returns Обновленная сущность
   */
  async updateFileInDNA<TData = any, TConfig = any>(
    entity: FileEnabledDNAEntity<TData, TConfig>,
    fieldName: string,
    newFile: File | Blob
  ): Promise<FileEnabledDNAEntity<TData, TConfig>> {
    // Удаляем старый файл если он был
    if (entity._files?.[fieldName]) {
      await this.cleanupFileReference(entity._files[fieldName]);
    }

    // Добавляем новый файл
    return this.storeFileInDNA(entity, fieldName, newFile);
  }

  /**
   * Удаляет файл из DNA сущности
   * @param entity Сущность
   * @param fieldName Имя поля файла
   * @returns Обновленная сущность без файла
   */
  async removeFileFromDNA<TData = any, TConfig = any>(
    entity: FileEnabledDNAEntity<TData, TConfig>,
    fieldName: string
  ): Promise<FileEnabledDNAEntity<TData, TConfig>> {
    if (entity._files?.[fieldName]) {
      await this.cleanupFileReference(entity._files[fieldName]);
    }

    const { [fieldName]: removed, ...remainingFiles } = entity._files || {};

    return {
      ...entity,
      _files: Object.keys(remainingFiles).length > 0 ? remainingFiles : undefined
    };
  }

  // ============================================================================
  // PROTEIN INTEGRATION METHODS
  // ============================================================================

  /**
   * Помещает файл в белковый запрос
   * @param request Белковый запрос
   * @param fieldName Имя поля для файла
   * @param file Файл для хранения
   * @returns Обновленный запрос
   */
  async storeFileInProteinRequest(
    request: ProteinRequest,
    fieldName: string,
    file: File | Blob
  ): Promise<FileEnabledProteinRequest> {
    const fileInfo = await FileStorage.fileToFileInfo(file, this.options.fileStorageOptions);

    const enhancedRequest: FileEnabledProteinRequest = {
      ...request,
      data: {
        ...request.data,
        _files: {
          ...((request as any).data._files || {}),
          [fieldName]: fileInfo.size <= this.options.inlineFileSizeLimit
            ? fileInfo
            : await this.createFileReference(fileInfo, 'protein_requests', fieldName)
        }
      }
    };

    return enhancedRequest;
  }

  /**
   * Извлекает файл из белкового запроса
   * @param request Белковый запрос с файлами
   * @param fieldName Имя поля файла
   * @returns Восстановленный файл или null
   */
  async retrieveFileFromProteinRequest(
    request: FileEnabledProteinRequest,
    fieldName: string
  ): Promise<File | null> {
    const fileRef = request.data._files?.[fieldName];
    if (!fileRef) return null;

    if (this.isFileInfo(fileRef)) {
      return FileStorage.fileInfoToFile(fileRef);
    } else {
      return await this.retrieveFileFromReference(fileRef);
    }
  }

  /**
   * Помещает файл в белковый ответ
   * @param response Белковый ответ
   * @param fieldName Имя поля для файла
   * @param file Файл для хранения
   * @returns Обновленный ответ
   */
  async storeFileInProteinResponse(
    response: ProteinResponse,
    fieldName: string,
    file: File | Blob
  ): Promise<FileEnabledProteinResponse> {
    const fileInfo = await FileStorage.fileToFileInfo(file, this.options.fileStorageOptions);

    const enhancedResponse: FileEnabledProteinResponse = {
      ...response,
      result: {
        ...response.result,
        _files: {
          ...((response as any).result._files || {}),
          [fieldName]: fileInfo.size <= this.options.inlineFileSizeLimit
            ? fileInfo
            : await this.createFileReference(fileInfo, 'protein_responses', fieldName)
        }
      }
    };

    return enhancedResponse;
  }

  /**
   * Извлекает файл из белкового ответа
   * @param response Белковый ответ с файлами
   * @param fieldName Имя поля файла
   * @returns Восстановленный файл или null
   */
  async retrieveFileFromProteinResponse(
    response: FileEnabledProteinResponse,
    fieldName: string
  ): Promise<File | null> {
    const fileRef = response.result._files?.[fieldName];
    if (!fileRef) return null;

    if (this.isFileInfo(fileRef)) {
      return FileStorage.fileInfoToFile(fileRef);
    } else {
      return await this.retrieveFileFromReference(fileRef);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Получает информацию о файлах в сущности
   * @param entity Сущность с файлами
   * @returns Массив информации о файлах
   */
  getFileInfo(entity: FileEnabledDNAEntity | FileEnabledProteinRequest | FileEnabledProteinResponse): Array<{
    fieldName: string;
    fileInfo: FileInfo | FileReference;
  }> {
    let files: { [key: string]: FileInfo | FileReference } | undefined;

    if ('data' in entity && entity.data && '_files' in entity.data) {
      files = entity.data._files;
    } else if ('_files' in entity) {
      files = (entity as any)._files;
    }

    if (!files) return [];

    return Object.entries(files).map(([fieldName, fileInfo]) => ({
      fieldName,
      fileInfo: fileInfo as FileInfo | FileReference
    }));
  }

  /**
   * Вычисляет общий размер файлов в сущности
   * @param entity Сущность с файлами
   * @returns Общий размер в байтах
   */
  getTotalFileSize(entity: FileEnabledDNAEntity | FileEnabledProteinRequest | FileEnabledProteinResponse): number {
    const fileInfos = this.getFileInfo(entity);
    return fileInfos.reduce((total, { fileInfo }) => {
      return total + (this.isFileInfo(fileInfo) ? fileInfo.size : 0);
    }, 0);
  }

  /**
   * Создает превью для файлов изображений
   * @param entity Сущность с файлами
   * @param fieldName Имя поля с изображением
   * @param maxWidth Максимальная ширина превью
   * @returns Data URL превью или null
   */
  async createImagePreview(
    entity: FileEnabledDNAEntity | FileEnabledProteinRequest | FileEnabledProteinResponse,
    fieldName: string,
    maxWidth: number = 200
  ): Promise<string | null> {
    let file: File | null = null;

    if ('data' in entity && '_files' in entity.data) {
      // Protein request or response
      file = await this.retrieveFileFromProteinRequest(entity as FileEnabledProteinRequest, fieldName);
    } else if ('_files' in entity) {
      // DNA entity
      file = await this.retrieveFileFromDNA(entity as FileEnabledDNAEntity, fieldName);
    }

    if (!file || !FileStorage.isImageFile(file)) return null;

    // Импортируем функцию создания превью (нужно добавить в FileStorage)
    const { createImagePreview } = await import('../utils/FileStorage-examples');
    return createImagePreview(file, maxWidth);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private isFileInfo(obj: any): obj is FileInfo {
    return obj && typeof obj === 'object' && 'data' in obj && 'name' in obj && 'size' in obj && 'type' in obj;
  }

  private async createFileReference(fileInfo: FileInfo, tableName: string, fieldName: string): Promise<FileReference> {
    // В реальной реализации здесь будет сохранение файла во внешнее хранилище
    // и возвращение ссылки на него
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      fileId,
      tableName,
      fieldName,
      originalName: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      uploadedAt: new Date().toISOString()
    };
  }

  private async retrieveFileFromReference(fileRef: FileReference): Promise<File | null> {
    // Implement external file storage retrieval
    try {
      const storageUrl =
        (typeof process !== 'undefined' && process.env?.FILE_STORAGE_URL) ||
        'https://agentstack.tech/api/files';
      const fileUrl = `${storageUrl}/${fileRef.fileId}`;

      logger.debug('📁 Retrieving file from external storage:', { fileUrl });

      // Fetch file from external storage
      const response = await fetch(fileUrl);
      if (!response.ok) {
        logger.warn('File not found in external storage:', { fileUrl });
        return null;
      }

      const blob = await response.blob();
      const file = new File([blob], fileRef.originalName || 'downloaded-file', {
        type: fileRef.type || 'application/octet-stream',
        lastModified: Date.now()
      });

      logger.debug('✅ File retrieved from external storage:', { name: file.name, size: file.size });
      return file;

    } catch (error) {
      logger.error('External file storage retrieval error:', error);
      return null;
    }
  }

  private async cleanupFileReference(fileRef: FileInfo | FileReference): Promise<void> {
    // Очистка файла из внешнего хранилища если необходимо
    if (!this.isFileInfo(fileRef) && this.options.autoCleanup) {
      logger.debug('Cleaning up external file:', { fileId: fileRef.fileId });
      // Реализация очистки внешнего файла
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Быстрое создание интеграции с настройками по умолчанию
 */
export function createFileStorageIntegration(options?: FileStorageIntegrationOptions): FileStorageIntegration {
  return new FileStorageIntegration(options);
}

/**
 * Помещает файл в DNA сущность (обертка для удобства)
 */
export async function storeFileInDNAEntity<TData = any, TConfig = any>(
  entity: DNAEntity<TData, TConfig>,
  fieldName: string,
  file: File | Blob,
  options?: FileStorageIntegrationOptions
): Promise<FileEnabledDNAEntity<TData, TConfig>> {
  const integration = createFileStorageIntegration(options);
  return integration.storeFileInDNA(entity, fieldName, file);
}

/**
 * Извлекает файл из DNA сущности (обертка для удобства)
 */
export async function retrieveFileFromDNAEntity(
  entity: FileEnabledDNAEntity,
  fieldName: string,
  options?: FileStorageIntegrationOptions
): Promise<File | null> {
  const integration = createFileStorageIntegration(options);
  return integration.retrieveFileFromDNA(entity, fieldName);
}

/**
 * Помещает файл в белковый запрос (обертка для удобства)
 */
export async function storeFileInProtein(
  request: ProteinRequest,
  fieldName: string,
  file: File | Blob,
  options?: FileStorageIntegrationOptions
): Promise<FileEnabledProteinRequest> {
  const integration = createFileStorageIntegration(options);
  return integration.storeFileInProteinRequest(request, fieldName, file);
}

/**
 * Извлекает файл из белкового запроса (обертка для удобства)
 */
export async function retrieveFileFromProtein(
  request: FileEnabledProteinRequest,
  fieldName: string,
  options?: FileStorageIntegrationOptions
): Promise<File | null> {
  const integration = createFileStorageIntegration(options);
  return integration.retrieveFileFromProteinRequest(request, fieldName);
}
