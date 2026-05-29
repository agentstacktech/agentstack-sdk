/**
 * SDK Configuration Types
 */

import { HTTPMethod } from './HTTPTypes';

/**
 * Optional gates for **domain** SDK modules (not `auth` / `api` / `protocol`).
 * Omitted key = enabled. `false` = reported disabled in `getCapabilityMatrix()`; lazy construction is a follow-up (RFC C).
 */
export type SDKDomainModuleId =
  | 'neural'
  | 'docs'
  | 'payments'
  | 'agentcoin'
  | 'analytics'
  | 'webhooks'
  | 'scheduler'
  | 'notifications'
  | 'wallets'
  | 'invoices'
  | 'billing'
  | 'logic'
  | 'marketplace'
  | 'assets'
  | 'globalAssets'
  | 'buffs'
  | 'protein'
  | 'proteinProcessor'
  | 'pageComposition'
  | 'gameData'
  | 'social'
  | 'webPush';

export type SDKModuleGates = Partial<Record<SDKDomainModuleId, boolean>>;

export interface SDKConfig {
  /** Base URL of the AgentStack API */
  apiBase?: string;
  
  /** Base URL (alias for apiBase) */
  baseUrl?: string;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Project ID for multi-tenant operations */
  projectId?: number | string;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Number of retry attempts for failed requests */
  retryAttempts?: number;
  
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  
  /** Enable ETag caching for GET requests */
  enableCaching?: boolean;
  
  /** Enable metrics collection */
  enableMetrics?: boolean;

  /**
   * GET batching: max milliseconds from the first queued request until `/api/batch` is sent,
   * even if new GETs keep arriving (prevents debounce starvation on busy screens, e.g. messenger).
   */
  maxBatchWaitMs?: number;

  /** GET batching: debounce window before sending `/api/batch` (default 50). */
  batchTimeout?: number;

  /** Max sub-requests per `/api/batch` body (default 50). */
  maxBatchSize?: number;

  /** When false, disables automatic GET coalescing via `/api/batch`. */
  enableBatching?: boolean;

  /**
   * Optional shell perf hook: return true to set `skipBatching` on a GET path
   * (e.g. defer RBAC/logic/projects on cold dashboard load).
   */
  shouldDeferBatchUrl?: (path: string) => boolean;
  
  /** Demo mode configuration */
  demoMode?: 'ro' | 'rw' | false;
  
  /** Custom headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  
  /** Request interceptor */
  requestInterceptor?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  
  /** Response interceptor */
  responseInterceptor?: (response: APIResponse<any>) => APIResponse<any> | Promise<APIResponse<any>>;
  
  /** Error interceptor */
  errorInterceptor?: (error: any) => any | Promise<any>;
  
  /** Neural Architecture configuration */
  neural?: {
    cache?: {
      enabled?: boolean;
      ttl?: number;
      maxSize?: number;
    };
    events?: {
      enabled?: boolean;
      bufferSize?: number;
    };
  };
  
  /** Retry configuration */
  retry?: {
    attempts?: number;
    delay?: number;
    backoff?: 'exponential' | 'linear';
  };
  
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  
  /** Logging configuration */
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    enabled?: boolean;
  };

  /**
   * Per-domain module switches for capability matrix and future lazy init.
   * Does not yet skip constructor work; use `false` to signal opt-out to agents/tools.
   */
  modules?: SDKModuleGates;

  /**
   * Who this SDK instance serves. Default `integrator` (tenant apps, npm, third-party agents).
   * Use `platform_operator` only in AgentStack monorepo admin / ops shells.
   */
  sdkAudience?: 'integrator' | 'platform_operator';
}

export interface RequestConfig {
  /** Request URL */
  url: string;
  
  /** HTTP method */
  method: HTTPMethod;
  
  /**
   * Allow request to bypass auth-state guard
   * (useful for login/refresh/public endpoints)
   */
  skipAuthStateCheck?: boolean;
  
  /** Request headers */
  headers: Record<string, string>;
  
  /** Request body */
  body?: any;
  
  /** Query parameters */
  params?: Record<string, any>;
  
  /** Request timeout */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Idempotency key */
  idempotencyKey?: string;
  
  /** Skip cache for this request */
  skipCache?: boolean;
  
  /** Skip batching for this request */
  skipBatching?: boolean;

  /** Abort in-flight request (e.g. React Query cancellation on unmount / key change) */
  signal?: AbortSignal;

  /**
   * Browser fetch priority hint (Chromium). Forwarded to `globalThis.fetch` when set.
   * Use `high` for latency-sensitive UI reads (e.g. open chat history).
   */
  fetchPriority?: 'high' | 'low' | 'auto';
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Delay between retries in milliseconds */
  delay: number;
  
  /** Base delay for exponential backoff */
  baseDelay?: number;
  
  /** Maximum delay for exponential backoff */
  maxDelay?: number;
  
  /** Backoff multiplier */
  backoffMultiplier?: number;
  
  /** Enable jitter */
  jitter?: boolean;
  
  /** Backoff strategy */
  backoff?: 'exponential' | 'linear';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
}

export interface SDKMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  cache: {
    hits: number;
    misses: number;
    evictions: number;
  };
  latency: {
    min: number;
    max: number;
    avg: number;
  };
  errors: {
    [key: string]: number;
  };
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  duration?: number;
  timestamp?: number;
  config?: any;
  traceId?: string;
}



