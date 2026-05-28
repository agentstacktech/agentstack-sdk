/**
 * CacheManager - Унифицированная система кеширования для SDK
 *
 * Предоставляет гибкую систему кеширования с поддержкой различных storage,
 * стратегий инвалидации и типов данных.
 *
 * @example
 * ```typescript
 * // Базовое использование
 * const cache = new CacheManager('my-app-cache');
 *
 * // Сохранить данные
 * await cache.set('user-profile', userData, { ttl: 3600000 }); // 1 час
 *
 * // Получить данные
 * const data = await cache.get('user-profile');
 *
 * // Проверить актуальность
 * if (cache.isExpired('user-profile')) {
 *   // Обновить данные
 * }
 * ```
 */

export interface CacheEntry<T = any> {
  /** Ключ кеша */
  key: string;
  /** Данные */
  data: T;
  /** Timestamp создания */
  createdAt: number;
  /** Timestamp последнего доступа */
  accessedAt: number;
  /** Время жизни в миллисекундах */
  ttl?: number;
  /** Версия данных для проверки изменений */
  version?: string | number;
  /** Метаданные */
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  /** Время жизни в миллисекундах */
  ttl?: number;
  /** Версия данных */
  version?: string | number;
  /** Метаданные */
  metadata?: Record<string, any>;
  /** Принудительно перезаписать существующие данные */
  force?: boolean;
}

export interface CacheStats {
  /** Общее количество записей */
  totalEntries: number;
  /** Общий размер в байтах */
  totalSize: number;
  /** Количество истекших записей */
  expiredEntries: number;
  /** Время последней очистки */
  lastCleanup: number;
}

/**
 * Интерфейс для storage провайдеров
 */
export interface CacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
}

/**
 * LocalStorage реализация CacheStorage
 */
export class LocalStorageCacheStorage implements CacheStorage {
  private readonly prefix: string;

  constructor(prefix: string = 'cache_') {
    // Добавляем префикс окружения только в dev
    const envPrefix = this.getStoragePrefix();
    this.prefix = envPrefix + prefix;
  }

  /**
   * Получить префикс для ключей хранилища (только в dev)
   */
  private getStoragePrefix(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    // Проверяем переменную окружения
    const envApiBase = 
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL as string) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE as string) ||
      (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL as string) ||
      (typeof process !== 'undefined' && process.env?.VITE_API_BASE as string);

    if (envApiBase) {
      const apiBase = String(envApiBase).toLowerCase();
      if (
        apiBase.includes('localhost') ||
        apiBase.includes('127.0.0.1') ||
        apiBase.includes(':5173') ||
        apiBase.includes(':5174') ||
        apiBase.includes(':5180')
      ) {
        return 'agentstack_dev_';
      }
      if (apiBase.includes('agentstack.tech')) {
        return '';
      }
    }

    // Fallback: проверяем hostname
    const hostname = window.location.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return 'agentstack_dev_';
    }

    return '';
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const storageKey = this.getStorageKey(key);
      const data = localStorage.getItem(storageKey);

      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);

      // Обновляем время последнего доступа
      entry.accessedAt = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(entry));

      return entry;
    } catch (error) {
      console.warn(`[LocalStorageCache] Error getting ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn(`[LocalStorageCache] Error setting ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key);
      const existed = localStorage.getItem(storageKey) !== null;
      localStorage.removeItem(storageKey);
      return existed;
    } catch (error) {
      console.warn(`[LocalStorageCache] Error deleting ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));

      cacheKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('[LocalStorageCache] Error clearing cache:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.slice(this.prefix.length));
    } catch (error) {
      console.warn('[LocalStorageCache] Error getting keys:', error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key);
      return localStorage.getItem(storageKey) !== null;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Основной CacheManager класс
 */
export class CacheManager {
  private readonly storage: CacheStorage;
  private readonly namespace: string;
  private readonly defaultTTL?: number;

  constructor(
    namespace: string = 'default',
    storage?: CacheStorage,
    defaultTTL?: number
  ) {
    this.namespace = namespace;
    this.storage = storage || new LocalStorageCacheStorage(`${namespace}_`);
    this.defaultTTL = defaultTTL;
  }

  /**
   * Получить полный ключ с namespace
   */
  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Проверить, истек ли срок действия записи
   */
  isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;

    const now = Date.now();
    return (now - entry.createdAt) > entry.ttl;
  }

  /**
   * Проверить, истек ли срок действия записи по ключу
   */
  async isExpiredByKey(key: string): Promise<boolean> {
    const entry = await this.getEntry(key);
    return entry ? this.isExpired(entry) : true;
  }

  /**
   * Получить запись кеша без проверки срока действия
   */
  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const namespacedKey = this.getNamespacedKey(key);
    return this.storage.get<T>(namespacedKey);
  }

  /**
   * Получить данные из кеша
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = await this.getEntry<T>(key);

    if (!entry) return null;

    // Проверяем срок действия
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Сохранить данные в кеш
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key);

    const entry: CacheEntry<T> = {
      key: namespacedKey,
      data,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      version: options.version,
      metadata: options.metadata
    };

    await this.storage.set(namespacedKey, entry);
  }

  /**
   * Обновить данные только если они изменились
   */
  async setIfChanged<T>(
    key: string,
    data: T,
    options: CacheOptions & { version?: string | number } = {}
  ): Promise<boolean> {
    const currentEntry = await this.getEntry<T>(key);

    // Если данных нет, сохраняем
    if (!currentEntry) {
      await this.set(key, data, options);
      return true;
    }

    // Проверяем версию, если указана
    if (options.version !== undefined && currentEntry.version === options.version) {
      return false; // Данные не изменились
    }

    // Сравниваем данные (простое сравнение)
    try {
      const currentDataStr = JSON.stringify(currentEntry.data);
      const newDataStr = JSON.stringify(data);

      if (currentDataStr === newDataStr) {
        return false; // Данные не изменились
      }
    } catch {
      // Если не можем сравнить, считаем что изменились
    }

    await this.set(key, data, options);
    return true;
  }

  /**
   * Удалить запись из кеша
   */
  async delete(key: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key);
    return this.storage.delete(namespacedKey);
  }

  /**
   * Очистить весь кеш
   */
  async clear(): Promise<void> {
    return this.storage.clear();
  }

  /**
   * Получить все ключи в namespace
   */
  async keys(): Promise<string[]> {
    const allKeys = await this.storage.keys();
    const prefix = `${this.namespace}:`;
    return allKeys
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length));
  }

  /**
   * Проверить наличие ключа
   */
  async has(key: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key);
    return this.storage.has(namespacedKey);
  }

  /**
   * Получить статистику кеша
   */
  async getStats(): Promise<CacheStats> {
    const keys = await this.keys();
    let totalSize = 0;
    let expiredEntries = 0;

    for (const key of keys) {
      const entry = await this.getEntry(key);
      if (entry) {
        try {
          totalSize += JSON.stringify(entry).length;
          if (this.isExpired(entry)) {
            expiredEntries++;
          }
        } catch {
          // Игнорируем ошибки подсчета размера
        }
      }
    }

    return {
      totalEntries: keys.length,
      totalSize,
      expiredEntries,
      lastCleanup: Date.now() // Можно улучшить, сохраняя timestamp
    };
  }

  /**
   * Очистить истекшие записи
   */
  async cleanup(): Promise<number> {
    const keys = await this.keys();
    let cleanedCount = 0;

    for (const key of keys) {
      if (await this.isExpiredByKey(key)) {
        await this.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// ===== Расширенные менеджеры =====

/**
 * FileCacheManager - Специализированный менеджер для кеширования файлов
 * Интегрируется с FileStorage для оптимизации работы с файлами
 */
export class FileCacheManager extends CacheManager {
  constructor(namespace: string = 'files', storage?: CacheStorage, defaultTTL?: number) {
    super(namespace, storage, defaultTTL);
  }

  /**
   * Кешировать файл с использованием FileStorage
   */
  async cacheFile(
    key: string,
    file: File,
    options: CacheOptions & { includeDataURL?: boolean } = {}
  ) {
    const { FileStorage } = await import('./FileStorage');

    // Конвертируем файл в base64
    const base64Data = await FileStorage.fileToJSON(file, FileStorage.getAvatarOptions());

    // Создаем data URL для быстрого отображения
    const dataURL = options.includeDataURL
      ? await FileStorage.fileToDataURL(file, FileStorage.getAvatarOptions())
      : undefined;

    const fileData = {
      base64: base64Data,
      dataURL,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      lastModified: file.lastModified
    };

    await this.set(key, fileData, options);
  }

  /**
   * Получить кешированный файл
   */
  async getCachedFile(key: string) {
    const data = await this.get(key);
    return data as {
      base64: string;
      dataURL?: string;
      filename: string;
      mimeType: string;
      size: number;
      lastModified: number;
    } | null;
  }

  /**
   * Преобразовать кешированные данные обратно в файл
   */
  async getFileFromCache(key: string): Promise<File | null> {
    const cachedData = await this.getCachedFile(key);

    if (!cachedData) return null;

    const { FileStorage } = await import('./FileStorage');
    return FileStorage.jsonToFile(
      cachedData.base64,
      cachedData.filename,
      cachedData.mimeType,
      cachedData.lastModified
    );
  }
}

// ===== Примеры использования =====

/*
 * React хуки для работы с кешем находятся в пакете @agentstack/react-sdk
 *
 * Пример использования:
 *
 * import { useCache, useFileCache } from '@agentstack/react-sdk';
 *
 * function MyComponent() {
 *   const cacheManager = new CacheManager('my-app');
 *   const { data, isLoading, fetchData, setCachedData } = useCache(
 *     cacheManager,
 *     'my-data-key',
 *     { autoFetch: true }
 *   );
 *
 *   return <div>...</div>;
 * }
 */
