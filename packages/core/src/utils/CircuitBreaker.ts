/**
 * Circuit Breaker Pattern - v0.1.39 Safe State Machines!
 * 
 * Philosophy v0.1.39: Prevent infinite loops!
 * Philosophy v0.1.15: Safety-First Evolution!
 * Philosophy v0.1.18: Statistical Fundamental Principle!
 * 
 * Biological Parallel: Immune System Fatigue Prevention!
 */

import { isAuthTransientRetryError } from '../client/apiWarming';
import { isTypedDna503Code } from './classifyAuthFailure';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Max consecutive failures before opening (default: 3) */
  maxFailures?: number;
  
  /** Timeout before testing recovery in ms (default: 30000) */
  resetTimeout?: number;
  
  /** Max reset timeout in ms (default: 300000 = 5 min) */
  maxResetTimeout?: number;
  
  /** Name for logging */
  name?: string;
  
  /** Whether circuit breaker is enabled (default: true) */
  enabled?: boolean;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  nextRecoveryTest: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private errorCache: Error | null = null;
  private currentResetTimeout: number;
  
  private config: Required<CircuitBreakerConfig>;
  
  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      maxFailures: config.maxFailures ?? 3,
      resetTimeout: config.resetTimeout ?? 30000,
      maxResetTimeout: config.maxResetTimeout ?? 300000,
      name: config.name ?? 'circuit',
      enabled: config.enabled ?? true
    };
    
    this.currentResetTimeout = this.config.resetTimeout;
  }
  
  /**
   * Execute operation through circuit breaker
   * 
   * Philosophy v0.1.39: Safe State Machine!
   * 
   * States:
   * - CLOSED: Normal operation
   * - OPEN: Circuit breaker triggered, fail fast!
   * - HALF_OPEN: Testing recovery
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit breaker is disabled, execute directly
    if (!this.config.enabled) {
      return await fn();
    }
    
    // Check if circuit is open
    if (this.state === 'open') {
      const now = Date.now();
      const timeSinceFailure = now - (this.lastFailure || 0);
      
      // Check if time to test recovery
      if (timeSinceFailure >= this.currentResetTimeout) {
        this.state = 'half_open';
        console.info(`🛡️ Circuit Breaker [${this.config.name}]: Testing recovery...`);
      } else {
        // Still open! Fail immediately (preserve resources!)
        const remainingTime = Math.ceil((this.currentResetTimeout - timeSinceFailure) / 1000);
        const error = new Error(
          `Circuit breaker open! Retry in ${remainingTime}s. (${this.failures} consecutive failures)`
        );
        throw this.errorCache || error;
      }
    }
    
    // Execute operation
    try {
      const result = await fn();
      
      // Success!
      this.handleSuccess();
      
      return result;
    } catch (error) {
      // Failure!
      this.handleFailure(error as Error);
      
      throw error;
    }
  }
  
  private handleSuccess() {
    this.successes++;
    this.lastSuccess = Date.now();
    
    // Reset circuit on success!
    if (this.state !== 'closed') {
      console.info(`🛡️ Circuit Breaker [${this.config.name}]: Recovery successful! Circuit CLOSED!`);
    }
    
    this.state = 'closed';
    this.failures = 0;
    this.errorCache = null;
    this.currentResetTimeout = this.config.resetTimeout; // Reset timeout
  }
  
  private handleFailure(error: Error) {
    // Check if this is an expected error that shouldn't trigger circuit breaker
    if (this.isExpectedError(error)) {
      // Don't count expected errors (401, 403, Abort) as failures — avoid noisy logs for routine cancellation.
      if (!this.isAbortLikeError(error)) {
        console.debug(`🛡️ Circuit Breaker [${this.config.name}]: Expected error ignored: ${error.message}`);
      }
      return;
    }
    
    this.failures++;
    this.lastFailure = Date.now();
    this.errorCache = error;
    
    // Check if should open circuit
    if (this.failures >= this.config.maxFailures && this.state === 'closed') {
      this.state = 'open';
      console.warn(
        `🛡️ Circuit Breaker [${this.config.name}]: OPEN! (${this.failures} consecutive failures)` +
        `\n   Next recovery test in ${this.currentResetTimeout / 1000}s`
      );
    }
    
    // If in half_open and failed, back to open with exponential backoff!
    if (this.state === 'half_open') {
      this.state = 'open';
      // Exponential backoff (Philosophy v0.1.39!)
      this.currentResetTimeout = Math.min(
        this.currentResetTimeout * 2,
        this.config.maxResetTimeout
      );
      console.warn(
        `🛡️ Circuit Breaker [${this.config.name}]: Recovery FAILED! Circuit re-opened.` +
        `\n   Next test in ${this.currentResetTimeout / 1000}s (exponential backoff!)`
      );
    }
  }
  
  /** Abort / fetch cancellation — expected on React Query key changes; no console spam. */
  private isAbortLikeError(error: Error): boolean {
    if (error.name === 'AbortError') return true;
    const message = (error.message || '').toLowerCase();
    return message.includes('aborted') || message.includes('abort');
  }

  /**
   * Check if error is expected and shouldn't trigger circuit breaker.
   * 401/403 = normal auth misses; warm-up / mint-busy 503 / login timeouts = retry, don't trip CB.
   */
  private isExpectedError(error: Error): boolean {
    if (this.isAbortLikeError(error)) return true;
    if (isAuthTransientRetryError(error)) return true;
    const apiCode = (error as { apiCode?: string }).apiCode;
    if (apiCode && isTypedDna503Code(apiCode)) return true;
    const message = (error.message || '').toLowerCase();
    const expectedPatterns = [
      'unauthorized',
      'forbidden',
      '401',
      '403',
      'warming up',
      'retry shortly',
      'auth_mint',
      'project_key_unavailable',
      'dna_timeout',
      'dna_overloaded',
      'dna_router_unavailable',
      'auth_me_db_timeout',
      'batch_sub_timeout',
      'timeout',
      'entity not found',
      'dna_router_unavailable',
    ];

    return expectedPatterns.some((pattern) => message.includes(pattern));
  }
  
  /**
   * Manually reset circuit breaker
   * For user-triggered retry buttons!
   */
  reset() {
    if (this.state === 'closed' && this.failures === 0) {
      return;
    }
    const wasOpen = this.state !== 'closed';
    const isProd =
      typeof import.meta !== 'undefined' && Boolean((import.meta as { env?: { PROD?: boolean } }).env?.PROD);
    if (wasOpen || !isProd) {
      const msg = `Circuit Breaker [${this.config.name}]: Manual reset!`;
      if (isProd) {
        console.debug(msg);
      } else {
        console.info(msg);
      }
    }
    this.state = 'closed';
    this.failures = 0;
    this.errorCache = null;
    this.currentResetTimeout = this.config.resetTimeout;
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextRecoveryTest: this.state === 'open' && this.lastFailure
        ? this.lastFailure + this.currentResetTimeout
        : null
    };
  }
  
  /**
   * Check if circuit is open (for UI display!)
   */
  isOpen(): boolean {
    return this.state === 'open';
  }
  
  /**
   * Get time until next recovery test (in seconds)
   */
  getRecoveryCountdown(): number {
    if (this.state !== 'open' || !this.lastFailure) {
      return 0;
    }
    
    const now = Date.now();
    const remaining = (this.lastFailure + this.currentResetTimeout) - now;
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

/**
 * Circuit Breaker Manager - Per-endpoint breakers!
 * 
 * Philosophy v0.1.39: Independent failure handling!
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private config: CircuitBreakerConfig;
  
  constructor(config: CircuitBreakerConfig = {}) {
    this.config = config;
  }
  
  /**
   * Get or create circuit breaker for endpoint
   */
  getCircuit(key: string): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker({
        ...this.config,
        name: key
      }));
    }
    return this.breakers.get(key)!;
  }
  
  /**
   * Execute through circuit breaker
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getCircuit(key);
    return circuit.execute(fn);
  }
  
  /**
   * Reset specific circuit
   */
  reset(key: string) {
    this.getCircuit(key).reset();
  }
  
  /**
   * Reset circuits whose key contains any of the substrings (auth-scoped; G-16).
   */
  resetMatching(substrings: string[]) {
    const needles = substrings.map((s) => s.toLowerCase());
    this.breakers.forEach((circuit, key) => {
      const k = key.toLowerCase();
      if (needles.some((n) => k.includes(n))) {
        circuit.reset();
      }
    });
  }

  /**
   * Reset all circuits
   */
  resetAll() {
    this.breakers.forEach(circuit => circuit.reset());
  }
  
  /**
   * Get all circuit stats
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    this.breakers.forEach((circuit, key) => {
      stats[key] = circuit.getStats();
    });
    return stats;
  }
  
  /**
   * Check if any circuit is open
   */
  hasOpenCircuits(): boolean {
    return Array.from(this.breakers.values()).some(c => c.isOpen());
  }
  
  /**
   * Get list of open circuits
   */
  getOpenCircuits(): string[] {
    const open: string[] = [];
    this.breakers.forEach((circuit, key) => {
      if (circuit.isOpen()) {
        open.push(key);
      }
    });
    return open;
  }
}

// Global instance
export const circuitBreakerManager = new CircuitBreakerManager({
  maxFailures: 3,
  resetTimeout: 30000,
  maxResetTimeout: 300000
});




