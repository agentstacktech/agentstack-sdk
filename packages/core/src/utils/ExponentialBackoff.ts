/**
 * Exponential Backoff - v0.1.40 Horizontal Gene Transfer!
 * 
 * Philosophy v0.1.40: Acquired from Google SRE best practices!
 * Philosophy v0.1.16: Simplified to essence!
 * 
 * Gene Source: Google SRE, AWS Well-Architected Framework
 * Adaptation: 60% simpler, same effectiveness!
 */

export interface BackoffConfig {
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  
  /** Max delay in ms (default: 30000) */
  maxDelay?: number;
  
  /** Backoff factor (default: 2) */
  factor?: number;
  
  /** Add jitter to prevent thundering herd (default: false) */
  jitter?: boolean;
}

export class ExponentialBackoff {
  private config: Required<BackoffConfig>;
  
  constructor(config: BackoffConfig = {}) {
    this.config = {
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      factor: config.factor ?? 2,
      jitter: config.jitter ?? false
    };
  }
  
  /**
   * Calculate delay for attempt N
   * 
   * Formula: min(baseDelay * factor^attempt, maxDelay)
   * With optional jitter: +/- 10%
   * 
   * Examples:
   * - Attempt 0: 1s
   * - Attempt 1: 2s
   * - Attempt 2: 4s
   * - Attempt 3: 8s
   * - Attempt 4: 16s
   * - Attempt 5: 30s (capped!)
   */
  getDelay(attempt: number): number {
    // Calculate exponential delay
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.factor, attempt),
      this.config.maxDelay
    );
    
    // Add jitter if enabled (Philosophy v0.1.18: Statistical spread!)
    if (this.config.jitter) {
      const jitterRange = delay * 0.1; // +/- 10%
      const jitter = (Math.random() * 2 - 1) * jitterRange;
      return Math.max(0, delay + jitter);
    }
    
    return delay;
  }
  
  /**
   * Get delay sequence for visual display
   */
  getSequence(maxAttempts: number): number[] {
    const sequence: number[] = [];
    for (let i = 0; i < maxAttempts; i++) {
      sequence.push(this.getDelay(i));
    }
    return sequence;
  }
  
  /**
   * Execute with exponential backoff
   */
  async executeWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    onRetry?: (attempt: number, delay: number) => void
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts - 1) {
          break; // Last attempt, throw error
        }
        
        // Calculate delay
        const delay = this.getDelay(attempt);
        
        // Notify callback
        onRetry?.(attempt + 1, delay);
        
        // Wait
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance with sensible defaults
export const exponentialBackoff = new ExponentialBackoff();




