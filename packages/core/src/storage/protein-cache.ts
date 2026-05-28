/**
 * Protein Cache - кеширование белков (данных в формате 8DNA)
 * 
 * Философия: Высокоуровневый кеш для белков с интеграцией DNAStorage и IndexCache
 * - Использует DNAStorage для хранения данных
 * - Использует IndexCache для быстрого поиска
 * - Предотвращает дубликаты запросов
 * - TTL и инвалидация
 */

import { DNAStorage, DNAStorageEntry } from './dna-storage';
import { IndexCache } from './index-cache';

export interface ProteinCacheConfig {
  defaultTTL?: number;
  dnaStorage?: DNAStorage;
  indexCache?: IndexCache;
}

export interface CacheOptions {
  ttl?: number;
  project_id?: number;
  user_id?: number;
  uuid?: string;
}

export class ProteinCache {
  private dnaStorage: DNAStorage;
  private indexCache: IndexCache;
  private defaultTTL: number;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(config: ProteinCacheConfig = {}) {
    this.defaultTTL = config.defaultTTL || 300000; // 5 минут по умолчанию
    this.dnaStorage = config.dnaStorage || new DNAStorage();
    this.indexCache = config.indexCache || new IndexCache();
  }

  /**
   * Получить данные по queryKey
   */
  async get<T = any>(queryKey: string[]): Promise<T | null> {
    try {
      // Проверить индексный кеш
      const cacheKey = await this.indexCache.get(queryKey);
      
      if (!cacheKey) {
        return null;
      }

      // Получить данные из DNAStorage
      const entry = await this.dnaStorage.get(cacheKey);
      
      if (!entry) {
        // Индекс указывает на несуществующую запись, удалить индекс
        await this.indexCache.delete(queryKey);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error('Error getting from protein cache:', error);
      return null;
    }
  }

  /**
   * Сохранить данные в кеш
   */
  async set<T = any>(
    queryKey: string[],
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      // Генерировать cacheKey
      const cacheKey = this.generateCacheKey(queryKey, options);
      
      // Сохранить в DNAStorage
      const entry: DNAStorageEntry = {
        id: cacheKey,
        uuid: options.uuid,
        project_id: options.project_id,
        user_id: options.user_id,
        data,
        config: {
          ttl: options.ttl || this.defaultTTL,
          timestamp: Date.now()
        },
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await this.dnaStorage.set(entry);

      // Сохранить в индексный кеш
      await this.indexCache.set(queryKey, cacheKey, options.ttl || this.defaultTTL);
    } catch (error) {
      console.error('Error setting protein cache:', error);
    }
  }

  /**
   * Удалить данные из кеша
   */
  async delete(queryKey: string[]): Promise<void> {
    try {
      // Получить cacheKey из индекса
      const cacheKey = await this.indexCache.get(queryKey);
      
      if (cacheKey) {
        // Удалить из DNAStorage
        await this.dnaStorage.delete(cacheKey);
        
        // Удалить индекс
        await this.indexCache.delete(queryKey);
      }
    } catch (error) {
      console.error('Error deleting from protein cache:', error);
    }
  }

  /**
   * Инвалидировать кеш по паттерну
   */
  async invalidate(pattern: {
    project_id?: number;
    user_id?: number;
    uuid?: string;
  }): Promise<number> {
    try {
      // Найти все записи по фильтру
      const entries = await this.dnaStorage.find(pattern);
      
      // Удалить все найденные записи
      let deleted = 0;
      for (const entry of entries) {
        await this.dnaStorage.delete(entry.id);
        await this.indexCache.deleteByCacheKey(entry.id);
        deleted++;
      }
      
      return deleted;
    } catch (error) {
      console.error('Error invalidating protein cache:', error);
      return 0;
    }
  }

  /**
   * Получить или загрузить данные (с предотвращением дубликатов)
   */
  async getOrLoad<T = any>(
    queryKey: string[],
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = JSON.stringify(queryKey);
    
    // Проверить есть ли уже pending запрос
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Проверить кеш
    const cached = await this.get<T>(queryKey);
    if (cached !== null) {
      return cached;
    }

    // Загрузить данные
    const loadPromise = (async () => {
      try {
        const data = await loader();
        await this.set(queryKey, data, options);
        return data;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * Полностью очистить весь кеш — вызывается при logout / смене пользователя.
   * Без этого IndexedDB хранит ответы 5 минут, и новый пользователь видит
   * данные предыдущего вместо свежих.
   */
  async clear(): Promise<void> {
    this.pendingRequests.clear();
    await Promise.all([
      this.dnaStorage.clear(),
      this.indexCache.clear(),
    ]);
  }

  /**
   * Очистить устаревшие записи
   */
  async cleanup(): Promise<{ dna: number; index: number }> {
    try {
      const [dnaDeleted, indexDeleted] = await Promise.all([
        this.dnaStorage.cleanup(),
        this.indexCache.cleanup()
      ]);

      return { dna: dnaDeleted, index: indexDeleted };
    } catch (error) {
      console.error('Error cleaning up protein cache:', error);
      return { dna: 0, index: 0 };
    }
  }

  /**
   * Получить статистику кеша
   */
  async getStats(): Promise<{
    dna: { total: number; expired: number; size: number };
  }> {
    try {
      const dnaStats = await this.dnaStorage.getStats();
      return { dna: dnaStats };
    } catch (error) {
      console.error('Error getting protein cache stats:', error);
      return { dna: { total: 0, expired: 0, size: 0 } };
    }
  }

  /**
   * Генерировать cacheKey из queryKey и опций
   */
  private generateCacheKey(queryKey: string[], options: CacheOptions): string {
    const parts = [
      ...queryKey,
      options.project_id?.toString() || '',
      options.user_id?.toString() || '',
      options.uuid || ''
    ].filter(Boolean);
    
    // Использовать hash для создания уникального ключа
    const keyString = parts.join('|');
    return this.hashString(keyString);
  }

  /**
   * Простая hash функция для строки
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }
}

