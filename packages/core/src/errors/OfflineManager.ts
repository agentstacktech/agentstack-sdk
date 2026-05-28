/**
 * Offline Support Manager for AgentStack SDK
 * Handles operations when network is unavailable
 */

import { logger } from '../utils/logger';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/storage-utils';
import { getStoragePrefix } from '../utils/storage-utils';

export interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

export class OfflineManager {
  private isOnline = navigator.onLine;
  private queue: QueuedOperation[] = [];
  private processingQueue = false;
  private readonly STORAGE_KEY: string;
  
  constructor() {
    // Добавляем префикс окружения к ключу хранилища
    const prefix = getStoragePrefix();
    this.STORAGE_KEY = prefix + 'agentstack_offline_queue';
    this.initializeEventListeners();
    this.loadQueueFromStorage();
  }

  private initializeEventListeners(): void {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true;
    logger.info('Network connection restored');
    await this.processQueue();
  }

  private async handleOffline(): Promise<void> {
    this.isOnline = false;
    logger.warn('Network connection lost, entering offline mode');
  }

  async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOnline) {
      try {
        return await operation();
      } catch (error) {
        if (this.isNetworkError(error)) {
          this.queueOperation(operation);
          throw new OfflineError('Operation queued for later execution');
        }
        throw error;
      }
    } else {
      this.queueOperation(operation);
      throw new OfflineError('Operation queued for later execution');
    }
  }

  private queueOperation<T>(operation: () => Promise<T>): void {
    const queuedOp: QueuedOperation = {
      id: this.generateId(),
      operation: operation,
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3
    };

    this.queue.push(queuedOp);
    this.saveQueueToStorage();
    
    logger.debug(`Operation queued. Queue size: ${this.queue.length}`);
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processingQueue = true;
    logger.info(`Processing ${this.queue.length} queued operations...`);

    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue.shift()!;
      
      try {
        await operation.operation();
        logger.debug(`Queued operation ${operation.id} completed successfully`);
      } catch (error) {
        logger.error(`Queued operation ${operation.id} failed:`, error);
        
        // Re-queue if still failing and under retry limit
        if (operation.retries < operation.maxRetries) {
          operation.retries++;
          this.queue.push(operation);
        } else {
          logger.error(`Operation ${operation.id} exceeded max retries, dropping`);
        }
      }
      
      this.saveQueueToStorage();
    }

    this.processingQueue = false;
    logger.info('Queue processing completed');
  }

  private isNetworkError(error: any): boolean {
    return error instanceof OfflineError ||
           error.message.includes('Network error') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('timeout') ||
           error.message.includes('NETWORK_ERROR');
  }

  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveQueueToStorage(): void {
    try {
      const serialized = JSON.stringify(this.queue.map(op => ({
        ...op,
        operation: op.operation.toString()
      })));
      setStorageItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      logger.error('Failed to save queue to storage:', error);
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = getStorageItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Note: We can't restore the actual functions, so we'll clear the queue
        // In a real implementation, you'd want to store operation metadata
        // and reconstruct the operations
        logger.debug(`Found ${parsed.length} queued operations in storage`);
        this.queue = []; // Clear for now
        removeStorageItem(this.STORAGE_KEY);
      }
    } catch (error) {
      logger.error('Failed to load queue from storage:', error);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isOffline(): boolean {
    return !this.isOnline;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueueToStorage();
    logger.info('Offline queue cleared');
  }
}

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();



