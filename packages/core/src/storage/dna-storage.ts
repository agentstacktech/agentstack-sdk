/**
 * DNA Storage - локальное хранилище в формате 8DNA
 * 
 * Философия: Храним данные в формате 8DNA в IndexedDB
 * - Структура данных соответствует 8DNA формату
 * - TTL и инвалидация кеша
 * - Интеграция с IndexCache для быстрого поиска
 */

export interface DNAStorageEntry {
  id: string;
  uuid?: string;
  project_id?: number;
  user_id?: number;
  data: any;
  config: {
    ttl: number;
    timestamp: number;
  };
  created_at: number;
  updated_at: number;
}

export interface DNAStorageConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
}

export class DNAStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: DNAStorageConfig = {}) {
    this.dbName = config.dbName || 'agentstack_dna_storage';
    this.storeName = config.storeName || 'dna_entries';
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
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Создать индексы для быстрого поиска
          objectStore.createIndex('uuid', 'uuid', { unique: false });
          objectStore.createIndex('project_id', 'project_id', { unique: false });
          objectStore.createIndex('user_id', 'user_id', { unique: false });
          objectStore.createIndex('updated_at', 'updated_at', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Получить запись по ID
   */
  async get(id: string): Promise<DNAStorageEntry | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to get entry: ${request.error}`));
      };

      request.onsuccess = () => {
        const entry = request.result as DNAStorageEntry | undefined;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Проверить TTL
        const now = Date.now();
        const age = now - entry.config.timestamp;
        
        if (age > entry.config.ttl) {
          // Запись устарела, удалить и вернуть null
          this.delete(id).catch(() => {});
          resolve(null);
          return;
        }

        resolve(entry);
      };
    });
  }

  /**
   * Сохранить запись
   */
  async set(entry: DNAStorageEntry): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Обновить timestamps
      const now = Date.now();
      const updatedEntry: DNAStorageEntry = {
        ...entry,
        updated_at: now,
        created_at: entry.created_at || now
      };

      const request = store.put(updatedEntry);

      request.onerror = () => {
        reject(new Error(`Failed to set entry: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Удалить запись
   */
  async delete(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete entry: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Найти записи по фильтру
   */
  async find(filter: {
    uuid?: string;
    project_id?: number;
    user_id?: number;
  }): Promise<DNAStorageEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const results: DNAStorageEntry[] = [];

      let index: IDBIndex | null = null;
      let keyRange: IDBKeyRange | null = null;

      // Выбрать индекс для поиска
      if (filter.uuid) {
        index = store.index('uuid');
        keyRange = IDBKeyRange.only(filter.uuid);
      } else if (filter.project_id !== undefined) {
        index = store.index('project_id');
        keyRange = IDBKeyRange.only(filter.project_id);
      } else if (filter.user_id !== undefined) {
        index = store.index('user_id');
        keyRange = IDBKeyRange.only(filter.user_id);
      }

      const request = index 
        ? index.openCursor(keyRange)
        : store.openCursor();

      request.onerror = () => {
        reject(new Error(`Failed to find entries: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value as DNAStorageEntry;
          
          // Проверить TTL
          const now = Date.now();
          const age = now - entry.config.timestamp;
          
          if (age <= entry.config.ttl) {
            // Проверить дополнительные фильтры
            let matches = true;
            if (filter.uuid && entry.uuid !== filter.uuid) matches = false;
            if (filter.project_id !== undefined && entry.project_id !== filter.project_id) matches = false;
            if (filter.user_id !== undefined && entry.user_id !== filter.user_id) matches = false;
            
            if (matches) {
              results.push(entry);
            }
          } else {
            // Удалить устаревшую запись
            this.delete(entry.id).catch(() => {});
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * Полностью очистить всё хранилище (используется при смене пользователя)
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
        reject(new Error(`Failed to clear DNAStorage: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Очистить устаревшие записи
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
      const index = store.index('updated_at');
      const request = index.openCursor();
      let deleted = 0;
      const now = Date.now();

      request.onerror = () => {
        reject(new Error(`Failed to cleanup: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value as DNAStorageEntry;
          const age = now - entry.config.timestamp;
          
          if (age > entry.config.ttl) {
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

  /**
   * Получить статистику хранилища
   */
  async getStats(): Promise<{
    total: number;
    expired: number;
    size: number;
  }> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();
      
      let total = 0;
      let expired = 0;
      let size = 0;
      const now = Date.now();

      request.onerror = () => {
        reject(new Error(`Failed to get stats: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          total++;
          const entry = cursor.value as DNAStorageEntry;
          const age = now - entry.config.timestamp;
          
          if (age > entry.config.ttl) {
            expired++;
          }
          
          // Примерная оценка размера (в байтах)
          size += JSON.stringify(entry).length;
          
          cursor.continue();
        } else {
          resolve({ total, expired, size });
        }
      };
    });
  }
}

