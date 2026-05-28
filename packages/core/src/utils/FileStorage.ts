/**
 * FileStorage - Universal file storage utility for JSON serialization
 * Преобразование файлов в строки для хранения в JSON и обратно
 *
 * Поддерживает любые типы файлов включая изображения, документы, бинарные файлы
 * Использует base64 кодирование для универсальной совместимости с JSON
 *
 * @example
 * ```typescript
 * // Преобразование файла в JSON строку
 * const jsonString = await FileStorage.fileToJSON(file);
 *
 * // Обратное преобразование
 * const restoredFile = FileStorage.jsonToFile(jsonString, 'avatar.jpg', 'image/jpeg');
 *
 * // С метаданными
 * const fileInfo = await FileStorage.fileToFileInfo(file);
 * const file = FileStorage.fileInfoToFile(fileInfo);
 * ```
 */

export interface FileInfo {
  /** Имя файла */
  name: string;
  /** Размер в байтах */
  size: number;
  /** MIME тип файла */
  type: string;
  /** Base64 закодированные данные */
  data: string;
  /** Время последнего изменения (timestamp) */
  lastModified?: number;
}

export interface FileStorageOptions {
  /** Максимальный размер файла в байтах (по умолчанию 10MB) */
  maxSize?: number;
  /** Разрешенные MIME типы (если не указано - все типы) */
  allowedTypes?: string[];
  /** Качество сжатия для изображений (0-1, по умолчанию 0.9) */
  imageQuality?: number;
}

export class FileStorage {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_IMAGE_QUALITY = 0.9;

  /**
   * Преобразует файл в base64 строку для хранения в JSON
   * @param file Файл для преобразования
   * @param options Опции обработки
   * @returns Promise<string> Base64 строка
   */
  static async fileToJSON(
    file: File | Blob,
    options: FileStorageOptions = {}
  ): Promise<string> {
    this.validateFile(file, options);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Для data URLs убираем префикс data:mime;base64,
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Преобразует base64 строку обратно в файл
   * @param jsonString Base64 строка
   * @param filename Имя файла
   * @param mimeType MIME тип файла
   * @param lastModified Время последнего изменения
   * @returns File Восстановленный файл
   */
  static jsonToFile(
    jsonString: string,
    filename: string,
    mimeType: string = 'application/octet-stream',
    lastModified?: number
  ): File {
    if (!jsonString || !filename) {
      throw new Error('Invalid parameters: jsonString and filename are required');
    }

    // Преобразуем base64 в бинарные данные
    const binaryString = atob(jsonString);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Создаем Blob и File
    const blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, {
      type: mimeType,
      lastModified: lastModified || Date.now()
    });
  }

  /**
   * Преобразует файл в объект FileInfo с полной информацией
   * @param file Файл для преобразования
   * @param options Опции обработки
   * @returns Promise<FileInfo> Объект с информацией о файле
   */
  static async fileToFileInfo(
    file: File | Blob,
    options: FileStorageOptions = {}
  ): Promise<FileInfo> {
    this.validateFile(file, options);

    const data = await this.fileToJSON(file, options);

    return {
      name: file instanceof File ? file.name : 'unknown',
      size: file.size,
      type: file.type || 'application/octet-stream',
      data,
      lastModified: file instanceof File ? file.lastModified : Date.now()
    };
  }

  /**
   * Преобразует FileInfo обратно в файл
   * @param fileInfo Объект с информацией о файле
   * @returns File Восстановленный файл
   */
  static fileInfoToFile(fileInfo: FileInfo): File {
    if (!fileInfo.data || !fileInfo.name) {
      throw new Error('Invalid FileInfo: data and name are required');
    }

    return this.jsonToFile(
      fileInfo.data,
      fileInfo.name,
      fileInfo.type,
      fileInfo.lastModified
    );
  }

  /**
   * Преобразует файл в data URL (полный data:mime;base64 формат)
   * Полезно для изображений в HTML
   * @param file Файл для преобразования
   * @param options Опции обработки
   * @returns Promise<string> Data URL
   */
  static async fileToDataURL(
    file: File | Blob,
    options: FileStorageOptions = {}
  ): Promise<string> {
    this.validateFile(file, options);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to data URL'));
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Преобразует data URL обратно в файл
   * @param dataURL Data URL строка
   * @param filename Имя файла
   * @returns File Восстановленный файл
   */
  static dataURLToFile(dataURL: string, filename: string): File {
    if (!dataURL.startsWith('data:')) {
      throw new Error('Invalid data URL format');
    }

    const [mimeInfo, base64] = dataURL.split(',');
    const mimeType = mimeInfo.split(':')[1].split(';')[0];

    return this.jsonToFile(base64, filename, mimeType);
  }

  /**
   * Проверяет, является ли файл изображением
   * @param file Файл для проверки
   * @returns boolean True если файл является изображением
   */
  static isImageFile(file: File | Blob): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Получает размер файла в человекочитаемом формате
   * @param bytes Размер в байтах
   * @returns string Форматированный размер (например "2.5 MB")
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Валидирует файл согласно опциям
   * @private
   */
  private static validateFile(file: File | Blob, options: FileStorageOptions): void {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;

    if (file.size > maxSize) {
      throw new Error(
        `File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(maxSize)}`
      );
    }

    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const isAllowed = options.allowedTypes.some(allowedType =>
        file.type === allowedType || file.type.startsWith(allowedType.split('/')[0] + '/')
      );

      if (!isAllowed) {
        throw new Error(`File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
      }
    }
  }

  /**
   * Создает опции по умолчанию для изображений
   * @returns FileStorageOptions Опции для изображений
   */
  static getImageOptions(): FileStorageOptions {
    return {
      maxSize: 5 * 1024 * 1024, // 5MB для изображений
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      imageQuality: this.DEFAULT_IMAGE_QUALITY
    };
  }

  /**
   * Создает опции по умолчанию для документов
   * @returns FileStorageOptions Опции для документов
   */
  static getDocumentOptions(): FileStorageOptions {
    return {
      maxSize: 20 * 1024 * 1024, // 20MB для документов
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ]
    };
  }

  /**
   * Создает опции по умолчанию для аватаров
   * @returns FileStorageOptions Опции для аватаров
   */
  static getAvatarOptions(): FileStorageOptions {
    return {
      maxSize: 2 * 1024 * 1024, // 2MB для аватаров
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      imageQuality: 0.85 // Немного ниже качество для уменьшения размера
    };
  }
}

// ===== Utility Functions =====

/**
 * Быстрое преобразование файла в JSON (обертка над FileStorage.fileToJSON)
 */
export async function fileToJSON(
  file: File | Blob,
  options?: FileStorageOptions
): Promise<string> {
  return FileStorage.fileToJSON(file, options);
}

/**
 * Быстрое преобразование JSON в файл (обертка над FileStorage.jsonToFile)
 */
export function jsonToFile(
  jsonString: string,
  filename: string,
  mimeType?: string,
  lastModified?: number
): File {
  return FileStorage.jsonToFile(jsonString, filename, mimeType, lastModified);
}

/**
 * Быстрое преобразование файла в FileInfo (обертка над FileStorage.fileToFileInfo)
 */
export async function fileToFileInfo(
  file: File | Blob,
  options?: FileStorageOptions
): Promise<FileInfo> {
  return FileStorage.fileToFileInfo(file, options);
}

/**
 * Быстрое преобразование FileInfo в файл (обертка над FileStorage.fileInfoToFile)
 */
export function fileInfoToFile(fileInfo: FileInfo): File {
  return FileStorage.fileInfoToFile(fileInfo);
}
