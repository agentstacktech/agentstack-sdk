/**
 * Index Cache - быстрый поиск в кеше
 * 
 * Философия: Индексный кеш для быстрого поиска queryKey -> cacheKey
 * - Хранит маппинг queryKey (массив строк) -> cacheKey (ID в DNAStorage)
 * - Быстрый поиск без сканирования всех записей
 * - TTL для индексов
 */

export interface IndexEntry {
  queryKey: string; // JSON.stringify(queryKey array)
  cacheKey: string; // ID в DNAStorage
  timestamp: number;
  ttl: number;
}

export interface IndexCacheConfig {
  dbName?: string;
  storeName?: string;
  defaultTTL?: number;
}

export class IndexCache {
  private dbName: string;
  private storeName: string;
  private defaultTTL: number;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: IndexCacheConfig = {}) {
    this.dbName = config.dbName || 'agentstack_index_cache';
    this.storeName = config.storeName || 'index_entries';
    this.defaultTTL = config.defaultTTL || 300000; // 5 минут по умолчанию
  }

  /**
   * Инициализировать IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
        this.initPromise = null;
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
        this.initPromise = null;
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Создать object store если не существует
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'queryKey' });
          
          // Создать индекс для быстрого поиска по cacheKey
          objectStore.createIndex('cacheKey', 'cacheKey', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Получить cacheKey по queryKey
   */
  async get(queryKey: string[]): Promise<string | null> {
    await this.init();

    const key = JSON.stringify(queryKey);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get index entry: ${request.error}`));
      };

      request.onsuccess = () => {
        const entry = request.result as IndexEntry | undefined;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Проверить TTL
        const now = Date.now();
        const age = now - entry.timestamp;
        
        if (age > entry.ttl) {
          // Индекс устарел, удалить и вернуть null
          this.delete(queryKey).catch(() => {});
          resolve(null);
          return;
        }

        resolve(entry.cacheKey);
      };
    });
  }

  /**
   * Сохранить маппинг queryKey -> cacheKey
   */
  async set(queryKey: string[], cacheKey: string, ttl?: number): Promise<void> {
    await this.init();

    const key = JSON.stringify(queryKey);
    const entry: IndexEntry = {
      queryKey: key,
      cacheKey,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => {
        reject(new Error(`Failed to set index entry: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Удалить индекс
   */
  async delete(queryKey: string[]): Promise<void> {
    await this.init();

    const key = JSON.stringify(queryKey);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error(`Failed to delete index entry: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Удалить все индексы для cacheKey
   */
  async deleteByCacheKey(cacheKey: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('cacheKey');
      const request = index.openCursor(IDBKeyRange.only(cacheKey));

      request.onerror = () => {
        reject(new Error(`Failed to delete by cacheKey: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  /**
   * Полностью очистить индексный кеш (используется при смене пользователя)
   */
  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear IndexCache: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Очистить устаревшие индексы
   */
  async cleanup(): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();
      let deleted = 0;
      const now = Date.now();

      request.onerror = () => {
        reject(new Error(`Failed to cleanup: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value as IndexEntry;
          const age = now - entry.timestamp;
          
          if (age > entry.ttl) {
            cursor.delete();
            deleted++;
          }
          
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
    });
  }
}

