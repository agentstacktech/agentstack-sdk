/**
 * Smart Retry Logic for AgentStack SDK
 * Provides intelligent retry mechanisms with exponential backoff
 */

import { logger } from '../utils/logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
}

export class RetryManager {
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: Error) => this.isRetryableError(error)
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === opts.maxRetries) {
          break;
        }
        
        // Don't retry certain errors
        if (!opts.retryCondition(lastError)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
          opts.maxDelay
        );
        
        logger.debug(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    /**
     * Philosophy v0.1.39: Safe State Machines!
     * Philosophy v0.1.15: Safety-First - Don't retry systematic errors!
     * 
     * NEVER retry systematic errors (won't help!):
     * - CORS errors (server config issue!)
     * - 4xx client errors (request problem!)
     * - Auth errors (need new token!)
     * - Validation errors (data problem!)
     */
    
    const msg = error.message.toLowerCase();
    
    // NEVER retry these (systematic problems!):
    if (msg.includes('cors') ||
        msg.includes('405') ||                // Method not allowed
        msg.includes('403') ||                // Forbidden
        msg.includes('401') ||                // Unauthorized
        msg.includes('400') ||                // Bad request
        msg.includes('404') ||                // Not found
        msg.includes('409') ||                // Conflict
        msg.includes('validation_error') ||
        msg.includes('permission_denied') ||
        msg.includes('not_found')) {
      return false; // ✅ Don't waste resources!
    }
    
    // ONLY retry transient errors (might recover!):
    if (msg.includes('500') ||               // Server error
        msg.includes('502') ||               // Bad gateway
        msg.includes('503') ||               // Service unavailable
        msg.includes('504') ||               // Gateway timeout
        msg.includes('timeout') ||           // Network timeout
        msg.includes('econnreset')) {        // Connection reset
      return true; // ✅ Might help!
    }
    
    // Unknown error → DON'T retry! (v0.1.15: Safety-First!)
    // Reasoning: If we don't know what it is, retrying might cause infinite loops!
    return false; // ✅ Safe default!
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const retryManager = new RetryManager();



