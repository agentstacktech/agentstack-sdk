/**
 * Modern HTTP Client for AgentStack SDK
 * Features: retry, caching, interceptors, metrics, error handling
 */

import { SimpleEventEmitter } from '../utils/event-emitter';
import { logger } from '../utils/logger';
import { getOrCreateCorrelationIds } from '../utils/optrace';
import {
  maskSecretForLog,
  maskBearerAuthorizationForLog,
  maskHeaderValueForLog
} from '../utils/maskSecretForLog';
import { CircuitBreakerManager } from '../utils/CircuitBreaker';
import { AuthStateStore } from '../utils/auth-state';
import { RequestBatcher } from '../utils/request-batcher';
import { ProteinCache } from '../storage/protein-cache';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/storage-utils';
import { AGENTSTACK_DEV_API_BASE } from '../config/agentstackEndpoints';
import {
  isTransientBrowserNetworkError,
  noteTransientNetworkError,
} from './networkErrors';
import { applyCsrfHeader, shouldIncludeCredentials } from '../security/csrf';
import { assertIntegratorMayCallAdminApi } from '../config/integratorScope';
import {
  normalizeProjectId,
  readProjectIdFromBrowserStorage,
  resolveEffectiveProjectId,
} from '../config/projectContext';
import {
  SDKConfig,
  RequestConfig,
  APIResponse,
  HTTPMethod,
  AgentStackError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  TimeoutError,
  DemoReadOnlyError,
  BudgetExceededError,
  RetryConfig,
  CacheEntry,
  CacheConfig,
  SDKMetrics
} from '../types';

/** Keys hoisted from the 2nd `get()` argument into {@link RequestConfig} (not query string). */
const HTTP_GET_OPTION_KEYS = new Set<string>([
  'skipBatching',
  'skipCache',
  'skipAuthStateCheck',
  'signal',
  'timeout',
  'retry',
  'headers',
  'body',
  'idempotencyKey',
  'fetchPriority',
]);

/**
 * Normalizes the second argument of {@link HTTPClient.get}.
 * SDK modules historically pass Axios-style `{ params: flatQuery }`; `HTTPClient.get`
 * expects the **flat** query object as the second argument. When the object has a
 * single key `params` whose value is a plain object, unwrap it.
 *
 * Also unwraps `{ params: flat, skipBatching, ... }` when every other key is a known
 * {@link RequestConfig} field (fixes AgentCoin and similar modules passing options inline).
 *
 * @see repo.platform.sdk.gen1 — single transport contract, observability-friendly URLs.
 */
export function normalizeGetQueryArg(
  arg?: Record<string, any>,
): Record<string, any> | undefined {
  if (arg == null || typeof arg !== 'object' || Array.isArray(arg)) {
    return arg as Record<string, any> | undefined;
  }
  const keys = Object.keys(arg);
  if (
    keys.length === 1 &&
    keys[0] === 'params' &&
    arg.params != null &&
    typeof arg.params === 'object' &&
    !Array.isArray(arg.params)
  ) {
    return arg.params as Record<string, any>;
  }
  if (
    keys.includes('params') &&
    arg.params != null &&
    typeof arg.params === 'object' &&
    !Array.isArray(arg.params)
  ) {
    const rest = keys.filter((k) => k !== 'params');
    if (rest.length === 0 || rest.every((k) => HTTP_GET_OPTION_KEYS.has(k))) {
      const inner = { ...(arg.params as Record<string, any>) };
      for (const k of Object.keys(inner)) {
        if (inner[k] === undefined) {
          delete inner[k];
        }
      }
      return Object.keys(inner).length ? inner : undefined;
    }
  }
  return arg;
}

export class HTTPClient extends SimpleEventEmitter {
  private config: Required<SDKConfig>;
  /** Max age for stale ETag entries kept for conditional GET (ms). */
  private static readonly STALE_ETAG_MAX_MS = 24 * 60 * 60 * 1000;

  private cache = new Map<string, CacheEntry<any>>();
  private metrics: SDKMetrics;
  private requestQueue = new Map<string, Promise<any>>();
  private requestQueueTimestamps = new Map<string, number>(); // ✅ MEMORY LEAK FIX: Время создания запросов в очереди
  private circuitBreakers: CircuitBreakerManager; // v0.1.39: Safe State Machines!
  private authToken: string | null = null;
  private apiKey: string | null = null;
  private authStateStore: AuthStateStore;
  private isRefreshingToken: boolean = false; // Предотвращает бесконечные циклы refresh
  private refreshAttempts: number = 0; // Счетчик попыток refresh
  private urlRetryCounts = new Map<string, number>(); // Счетчик retry по URL
  private urlRetryDelays = new Map<string, number>(); // Задержки retry по URL
  private lastRetryTime = new Map<string, number>(); // Время последнего retry по URL
  private refreshRetryDepth = new Map<string, number>(); // Глубина рекурсии после refresh по URL (защита от бесконечных циклов)
  private requestBatcher?: RequestBatcher; // Батчер запросов
  private proteinCache?: ProteinCache; // Кеш белков (8DNA формат)
  
  // ✅ MEMORY LEAK FIX: Глобальная защита от конкурентных refresh
  private globalRefreshAttempts: number = 0; // Глобальный счетчик попыток refresh
  private globalRefreshAttemptsResetTime: number = 0; // Время сброса глобального счетчика
  private pendingRequestsDuringRefresh: Array<{
    config: RequestConfig;
    resolve: (value: APIResponse<any>) => void;
    reject: (error: any) => void;
    startTime: number;
  }> = []; // Очередь запросов, ожидающих завершения refresh
  private refreshLock: Promise<boolean> | null = null; // Lock для предотвращения конкурентных refresh
  private cleanupInterval: NodeJS.Timeout | null = null; // Интервал для периодической очистки
  private lastRefreshTime: number = 0; // Время последнего refresh (для защиты от слишком частых попыток)
  private refreshBlockedUntil: number = 0; // Время до которого refresh заблокирован
  /** Suppress session_expired after login while stale in-flight 401s may still land. */
  private postLoginGraceUntil: number = 0;
  static readonly POST_LOGIN_GRACE_MS = 15_000;
  private globalRefreshDepth: number = 0; // ✅ MEMORY LEAK FIX: Глобальная глубина рекурсии refresh
  
  // ✅ MEMORY LEAK FIX: Константы для ограничения накопления запросов
  private static readonly MAX_PENDING_REQUESTS = 50; // Максимальный размер очереди ожидающих запросов
  private static readonly PENDING_REQUEST_TIMEOUT = 30 * 1000; // 30 секунд - таймаут для старых запросов
  private static readonly MAX_RETRY_RECURSION_DEPTH = 3; // Максимальная глубина рекурсии при retry
  private static readonly MAX_RETRY_MAP_SIZE = 1000; // Максимальный размер retry Maps перед принудительной очисткой
  
  // ✅ MEMORY LEAK FIX: Счетчик глубины рекурсии для retryPendingRequests
  private retryRecursionDepth: number = 0;

  constructor(config: SDKConfig, authStateStore?: AuthStateStore) {
    super();
    
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      enableMetrics: true,
      demoMode: false,
      defaultHeaders: {},
      requestInterceptor: (config: RequestConfig) => config,
      responseInterceptor: (response: any) => response,
      errorInterceptor: (error: any) => error,
      
      // Neural Architecture конфигурация
      neural: {
        cache: {
          enabled: true,
          ttl: 300,
          maxSize: 1000
        },
        events: {
          enabled: true,
          bufferSize: 10000
        }
      },
      
      // Retry конфигурация
      retry: {
        attempts: 3,
        delay: 1000,
        backoff: 'exponential'
      },
      
      // Cache конфигурация
      cache: {
        enabled: true,
        ttl: 300
      },
      
      // Logging конфигурация
      logging: {
        level: 'info',
        enabled: true
      },
      
      ...config,
      // Ensure baseUrl is set from apiBase with /api suffix
      // Add /api if not already present
      // ✅ CRITICAL FIX: In production, always use full URL with host and port
      baseUrl: (() => {
        const base = (config.apiBase || config.baseUrl || '').trim();
        if (!base) {
          if (typeof window !== 'undefined') {
            const isProduction = window.location.protocol === 'https:' ||
                                !window.location.hostname.includes('localhost');
            if (isProduction) {
              const finalBaseUrl = `${window.location.origin}/api`;
              logger.warn('⚠️ HTTPClient: apiBase is empty in production, using same-origin fallback:', {
                finalBaseUrl,
                origin: window.location.origin
              });
              return finalBaseUrl;
            }
          }
          return AGENTSTACK_DEV_API_BASE;
        }
        // Remove trailing slash
        const cleanBase = base.replace(/\/$/, '');
        // Check if /api is already present
        let finalBaseUrl: string;
        if (cleanBase.endsWith('/api')) {
          finalBaseUrl = cleanBase;
        } else {
          finalBaseUrl = `${cleanBase}/api`;
        }
        
        // Only restore port 8000 when the passed apiBase explicitly had :8000 (don't override same-origin)
        if (cleanBase.includes(':8000') && !finalBaseUrl.includes(':8000')) {
          try {
            const urlObj = new URL(finalBaseUrl);
            urlObj.port = '8000';
            finalBaseUrl = urlObj.toString().replace(/\/$/, '');
            logger.debug('🔍 HTTPClient: Port 8000 restored in baseUrl construction', {
              restored: finalBaseUrl
            });
          } catch (e) {
            if (finalBaseUrl.includes('://') && !finalBaseUrl.match(/:\d+/)) {
              finalBaseUrl = finalBaseUrl.replace(/(https?:\/\/[^\/]+)/, '$1:8000');
            }
          }
        }
        
        logger.debug('🔍 HTTPClient baseUrl construction:', {
          originalBase: base,
          cleanBase,
          finalBaseUrl,
          hasPort: finalBaseUrl.includes(':8000')
        });

        /** Same-origin and mobile WebViews: relative `/api` must become absolute for fetch(). */
        if (typeof window !== 'undefined' && finalBaseUrl.startsWith('/')) {
          try {
            return new URL(finalBaseUrl, window.location.origin).href.replace(/\/$/, '');
          } catch {
            /* keep finalBaseUrl */
          }
        }

        return finalBaseUrl;
      })(),
      apiBase: (() => {
        const base = (config.apiBase || config.baseUrl || '').trim();
        if (!base) {
          const rel = '/api';
          if (typeof window !== 'undefined') {
            try {
              return new URL(rel, window.location.origin).href.replace(/\/$/, '');
            } catch {
              return rel;
            }
          }
          return rel;
        }
        // Remove trailing slash
        const cleanBase = base.replace(/\/$/, '');
        let api: string;
        if (cleanBase.endsWith('/api')) {
          api = cleanBase;
        } else {
          api = `${cleanBase}/api`;
        }
        if (typeof window !== 'undefined' && api.startsWith('/')) {
          try {
            return new URL(api, window.location.origin).href.replace(/\/$/, '');
          } catch {
            return api;
          }
        }
        return api;
      })(),
      apiKey: config.apiKey || '',
      projectId: config.projectId || 0,
      modules: config.modules ?? {},
      // Batching defaults (host may omit these; Required<SDKConfig> needs concrete numbers)
      maxBatchWaitMs: config.maxBatchWaitMs ?? 220,
      batchTimeout: config.batchTimeout ?? 50,
      maxBatchSize: config.maxBatchSize ?? 50,
      enableBatching: config.enableBatching !== false,
      shouldDeferBatchUrl: config.shouldDeferBatchUrl ?? (() => false),
      sdkAudience: config.sdkAudience ?? 'integrator',
    };

    this.metrics = this.initializeMetrics();
    this.authStateStore = authStateStore || new AuthStateStore();

    // Initialize circuit breakers (v0.1.39!) - DISABLED FOR DEBUGGING
    this.circuitBreakers = new CircuitBreakerManager({
      maxFailures: 999999, // Disable circuit breaker
      resetTimeout: 1, // Very short timeout
      maxResetTimeout: 1 // Very short timeout
    });
    
    // Initialize request batcher (optional, enabled by default)
    if (this.config.enableBatching !== false) {
      this.requestBatcher = new RequestBatcher(
        this.config.baseUrl,
        () => this.buildHeaders({}),
        {
          batchTimeout: this.config.batchTimeout,
          maxBatchSize: this.config.maxBatchSize,
          maxBatchWaitMs: this.config.maxBatchWaitMs
        }
      );
    }
    
    // Initialize protein cache (optional, enabled by default)
    if ((this.config as any).enableProteinCache !== false) {
      this.proteinCache = new ProteinCache({
        defaultTTL: (this.config as any).proteinCacheTTL || 300000 // 5 минут по умолчанию
      });
    }
    
    // ✅ MEMORY LEAK FIX: Инициализация периодической очистки Maps
    this.startCleanupInterval();
    
    // ✅ CRITICAL FIX: Автоматически загружаем токены из localStorage при инициализации
    // Это критично для восстановления сессии после перезагрузки страницы
    if (typeof window !== 'undefined') {
      this.refreshTokensFromStorage();
      this.syncProjectIdFromConfigOrStorage();
    } else {
      const pid = normalizeProjectId(this.config.projectId);
      if (pid) this.config.projectId = pid;
    }
  }

  /** Align `config.projectId` with constructor value or persisted session. */
  private syncProjectIdFromConfigOrStorage(): void {
    const effective = resolveEffectiveProjectId(this.config.projectId);
    if (effective) {
      this.config.projectId = effective;
    }
  }
  
  // ✅ MEMORY LEAK FIX: Запуск периодической очистки
  private startCleanupInterval(): void {
    // Очистка каждые 5 минут
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanupStaleRetryEntries();
      }, 5 * 60 * 1000); // 5 минут
    }
  }
  
  // ✅ MEMORY LEAK FIX: Остановка периодической очистки
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('HTTPClient cleanup interval stopped');
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * GET with optional query string.
   * @param query Query parameters: either a **flat** object (`{ project_id: 1 }`) or
   *   Axios-style `{ params: { project_id: 1 } }` (normalized automatically).
   *   Request flags (`skipBatching`, `skipCache`, `signal`, …) may appear on this object;
   *   they are hoisted into the request config and never sent as query params.
   * @param options Extra request options (e.g. `skipCache`, `signal`). If `options.params`
   *   is set, it overrides `query` after normalization (legacy merge order).
   */
  async get<T = any>(
    url: string,
    query?: Record<string, any>,
    options?: Partial<RequestConfig>,
  ): Promise<APIResponse<T>> {
    const q: Record<string, any> =
      query != null && typeof query === 'object' && !Array.isArray(query) ? { ...query } : {};
    const hoisted: Partial<RequestConfig> = {};
    for (const k of HTTP_GET_OPTION_KEYS) {
      if (k in q) {
        (hoisted as any)[k] = (q as any)[k];
        delete (q as any)[k];
      }
    }
    const normalized = normalizeGetQueryArg(Object.keys(q).length ? q : undefined);
    return this.request<T>({
      url,
      method: HTTPMethod.GET,
      params: normalized,
      ...hoisted,
      ...options,
    });
  }

  async post<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: HTTPMethod.POST,
      body: data,
      ...options
    });
  }

  async put<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: HTTPMethod.PUT,
      body: data,
      ...options
    });
  }

  async patch<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: HTTPMethod.PATCH,
      body: data,
      ...options
    });
  }

  async delete<T = any>(url: string, options?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: HTTPMethod.DELETE,
      ...options
    });
  }

  // ============================================================================
  // Core Request Method
  // ============================================================================

  async request<T = any>(config: Partial<RequestConfig>): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const requestConfig = this.buildRequestConfig(config);
    const cacheKey = this.getCacheKey(requestConfig);

    const url = requestConfig.url || '';
    const pathOnly = url.split('?')[0] || '';
    assertIntegratorMayCallAdminApi(this.config, pathOnly);

    // ✅ Philosophy: No-cache for admin/builder settings and highly user-specific GETs
    const isSessionsPath =
      pathOnly === '/sessions' || pathOnly.startsWith('/sessions/');
    const isUserStorageGet =
      requestConfig.method === HTTPMethod.GET &&
      // Covers /storage/files, /storage/temp, /storage/quota, /admin/storage/*, etc.
      (pathOnly.includes('/storage/') || pathOnly.includes('/admin/storage/'));
    if (isUserStorageGet) {
      requestConfig.skipCache = true;
      requestConfig.skipBatching = true;
    }
    if (
      url.includes('/auth/settings') ||
      url.includes('/ai-builder/') ||
      url.includes('/projects/1') ||
      url.includes('/diagnostics/') ||
      // User-specific profile & profile-data (avatar, bio, etc.) must not be served stale
      // from in-memory ETag cache or ProteinCache after mutations (e.g. POST /profile/avatar).
      url.includes('/profile') ||
      // Project-scoped hubs: DNA/config writes must not read stale GET cache on refetch.
      pathOnly.includes('/hosting') ||
      url.includes('/hosting') ||
      pathOnly.includes('/integrations') ||
      url.includes('/integrations') ||
      pathOnly.includes('/support') ||
      url.includes('/support/inbox') ||
      pathOnly.includes('/generations') ||
      url.includes('/generations') ||
      pathOnly.includes('/webhooks') ||
      url.includes('/webhooks') ||
      (pathOnly.includes('/agents') && requestConfig.method === HTTPMethod.GET) ||
      (url.includes('/agents') && requestConfig.method === HTTPMethod.GET) ||
      url.includes('/auth/profile-data') ||
      url.includes('/auth/me') ||
      url.includes('/auth/2fa-status') ||
      isSessionsPath ||
      // Web Push readiness / VAPID key must never be stale (ops add keys; old null breaks subscribe).
      url.includes('/api/push/') ||
      pathOnly.includes('/dna/data_projects_8dna') ||
      pathOnly.includes('/dna/entities/stats') ||
      pathOnly.includes('/admin/data/')
    ) {
      requestConfig.skipCache = true;
    }
    if (
      pathOnly.includes('/dna/data_projects_8dna') ||
      pathOnly.includes('/dna/entities/stats') ||
      pathOnly.includes('/admin/data/')
    ) {
      requestConfig.skipBatching = true;
    }
    if (
      url.includes('/auth/me') ||
      url.includes('/auth/settings/get') ||
      url.includes('/diagnostics/')
    ) {
      requestConfig.skipBatching = true;
    }
    if (
      requestConfig.method === HTTPMethod.GET &&
      !requestConfig.skipBatching &&
      this.config.shouldDeferBatchUrl?.(pathOnly)
    ) {
      requestConfig.skipBatching = true;
    }

    // ✅ MEMORY LEAK FIX: Проверяем, не заблокирован ли refresh - если да, блокируем новые запросы
    const now = Date.now();
    if (this.refreshBlockedUntil > now && !requestConfig.skipAuthStateCheck) {
      const remainingMs = this.refreshBlockedUntil - now;
      logger.warn(`🚫 Request blocked: token refresh is blocked for ${remainingMs}ms more: ${requestConfig.url || 'unknown'}`);
      const error = new UnauthorizedError(`Token refresh blocked - too many failed attempts. Please try again in ${Math.ceil(remainingMs / 1000)} seconds`);
      this.emit('auth:blocked-request', { reason: 'refresh_blocked', config: requestConfig });
      throw error;
    }

    // Auth state guard: block requests when not authenticated (unless skipAuthStateCheck)
    const authState = this.authStateStore.getState();
    const hasToken = !!this.authToken;
    const hasApiKey = !!this.apiKey;
    
    logger.debug('🔍 HTTPClient.request - Auth check', {
      url: requestConfig.url,
      method: requestConfig.method,
      authState: authState,
      hasToken: hasToken,
      tokenLength: this.authToken?.length || 0,
      hasApiKey: hasApiKey,
      apiKeyLength: this.apiKey?.length || 0,
      skipAuthStateCheck: requestConfig.skipAuthStateCheck,
      refreshBlockedUntil: this.refreshBlockedUntil > now ? this.refreshBlockedUntil - now : 0
    });
    
    if (!requestConfig.skipAuthStateCheck) {
      if (authState !== 'authenticated') {
        logger.warn('❌ HTTPClient.request - Request blocked by auth state', {
          url: requestConfig.url,
          method: requestConfig.method,
          authState: authState,
          hasToken: hasToken,
          hasApiKey: hasApiKey
        });
        const error = new UnauthorizedError(`Request blocked: auth state = ${authState}`);
        this.emit('auth:blocked-request', { state: authState, config: requestConfig });
        throw error;
      }
    }

    // ✅ CRITICAL FIX: Check protein cache first (8DNA format) for GET requests
    if (requestConfig.method === HTTPMethod.GET && 
        this.config.enableCaching && 
        !requestConfig.skipCache &&
        this.proteinCache) {
      try {
        // Создать queryKey из URL и параметров
        const queryKey = this.buildQueryKey(requestConfig);
        const cached = await this.proteinCache.get<T>(queryKey);
        
        if (cached !== null) {
          // Преобразовать в APIResponse формат
          const response: APIResponse<T> = {
            data: cached,
            status: 200,
            headers: {},
            duration: Date.now() - startTime,
            timestamp: Date.now()
          };
          
          this.updateMetrics('cached', Date.now() - startTime);
          this.emit('request:cached', { config: requestConfig, data: response });
          return response;
        }
      } catch (error) {
        logger.warn('Error checking protein cache:', error);
        // Продолжить с обычным кешем
      }
    }

    // Check in-memory cache for GET requests (fallback)
    if (requestConfig.method === HTTPMethod.GET && this.config.enableCaching && !requestConfig.skipCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.updateMetrics('cached', Date.now() - startTime);
        this.emit('request:cached', { config: requestConfig, data: cached });
        return cached;
      }
    }

    // Check for duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }

    // ✅ CRITICAL FIX: Use request batcher if enabled and request is batchable
    // Never batch skipCache GETs (profile, /auth/me, sessions, etc.) — batch path must not
    // substitute or reorder user-specific responses.
    const hasAuth =
      Boolean(this.getAuthToken()) || Boolean(this.getApiKey());
    const isBatchable = requestConfig.method === HTTPMethod.GET &&
                       hasAuth &&
                       !requestConfig.skipCache &&
                       !requestConfig.skipBatching &&
                       this.requestBatcher &&
                       !requestConfig.headers?.['X-No-Batch'];
    
    if (isBatchable) {
      // Use batcher for GET requests
      const requestPromise = (async () => {
        try {
          const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const batcherConfig = {
            id: uniqueId,
            method: requestConfig.method,
            url: requestConfig.url,
            headers: requestConfig.headers,
            params: requestConfig.params
          };
          
          const batchedData = await this.requestBatcher!.add(batcherConfig);
          
          // Transform batched response to APIResponse format
          return {
            data: batchedData,
            status: 200,
            headers: {},
            duration: Date.now() - startTime,
            timestamp: Date.now()
          } as APIResponse<T>;
        } catch (error) {
          // Fallback to normal request if batching fails (404 on /api/batch, rate limits, etc.)
          logger.debug('Batch request failed, falling back to normal request', error);
          return this.executeRequest<T>(requestConfig, startTime);
        }
      })();
      
      // ✅ MEMORY LEAK FIX: Сохраняем время создания запроса
      this.requestQueue.set(cacheKey, requestPromise);
      this.requestQueueTimestamps.set(cacheKey, Date.now());
      
      try {
        const response = await requestPromise;
        
      // Cache successful GET responses
      if (requestConfig.method === HTTPMethod.GET && this.config.enableCaching && !requestConfig.skipCache) {
        this.setCache(cacheKey, response);
        // ✅ CRITICAL FIX: Also save to protein cache
        await this.saveToProteinCache(requestConfig, response);
      }
        
      return response;
    } finally {
      // ✅ MEMORY LEAK FIX: Удаляем запрос и его timestamp
      this.requestQueue.delete(cacheKey);
      this.requestQueueTimestamps.delete(cacheKey);
    }
  }

  // Create request promise (normal flow)
    const requestPromise = this.executeRequest<T>(requestConfig, startTime);
    // ✅ MEMORY LEAK FIX: Сохраняем время создания запроса
    this.requestQueue.set(cacheKey, requestPromise);
    this.requestQueueTimestamps.set(cacheKey, Date.now());

    try {
      const response = await requestPromise;
      
      // Cache successful GET responses
      if (requestConfig.method === HTTPMethod.GET && this.config.enableCaching && !requestConfig.skipCache) {
        this.setCache(cacheKey, response);
      // ✅ CRITICAL FIX: Also save to protein cache
      await this.saveToProteinCache(requestConfig, response);
      }

      return response;
    } finally {
      // ✅ MEMORY LEAK FIX: Удаляем запрос и его timestamp
      this.requestQueue.delete(cacheKey);
      this.requestQueueTimestamps.delete(cacheKey);
    }
  }

  // ============================================================================
  // Request Execution
  // ============================================================================

  private async executeRequest<T>(config: RequestConfig, startTime: number): Promise<APIResponse<T>> {
    const retryConfig = this.buildRetryConfig(config.retry);
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const response = await this.makeHTTPRequest<T>(config);
        const duration = Date.now() - startTime;

        this.updateMetrics('successful', duration);
        this.emit('request:success', { config, response, duration });

        return {
          ...response,
          duration,
          timestamp: Date.now()
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry certain errors
        if (
          this.shouldNotRetry(error as AgentStackError, config) ||
          attempt === retryConfig.maxAttempts
        ) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        await this.delay(delay);

        this.emit('request:retry', { config, attempt: attempt + 1, delay, error });
      }
    }

    const duration = Date.now() - startTime;
    this.updateMetrics('failed', duration);
    this.emit('request:error', { config, error: lastError || new Error('Unknown error'), duration });

    throw lastError || new Error('Unknown error');
  }

  private async makeHTTPRequest<T>(config: RequestConfig): Promise<APIResponse<T>> {
    /**
     * Philosophy v0.1.40: Horizontal Gene Transfer!
     * Philosophy v0.1.39: Circuit Breaker protection!
     * 
     * Gene Source: Industry best practices
     * Adaptation: Integrated seamlessly!
     */
    
    // Apply request interceptor
    const interceptedConfig = this.config.requestInterceptor 
      ? await this.config.requestInterceptor(config)
      : config;

    // Build URL with query parameters
    const url = this.buildURL(interceptedConfig.url, interceptedConfig.params);
    
    // Build headers
    const headers = this.buildHeaders(interceptedConfig.headers, url);

    if (
      interceptedConfig.method === HTTPMethod.GET &&
      this.config.enableCaching &&
      !interceptedConfig.skipCache
    ) {
      const cacheKey = this.getCacheKey(interceptedConfig);
      const entry = this.cache.get(cacheKey);
      if (entry?.etag) {
        headers['If-None-Match'] = entry.etag;
      }
    }
    
    // Circuit breaker key (v0.1.39: Per-endpoint isolation!)
    const circuitKey = `${interceptedConfig.method}:${url}`;
    
    // Execute through circuit breaker! (v0.1.40: Gene acquired!)
    return this.circuitBreakers.execute(circuitKey, async () => {
      return this._executeRequest(url, headers, interceptedConfig);
    });
  }
  
  public setAuthToken(token: string | null): void {
    // Validate and clean token
    let cleanToken: string | null = null;
    if (token && typeof token === 'string') {
      cleanToken = token.trim()
        .replace(/^[,\s\n\r]+/g, '') // Remove leading commas, spaces, newlines
        .replace(/[,\s\n\r]+$/g, '')  // Remove trailing commas, spaces, newlines
        .replace(/\s+/g, '');         // Remove all internal whitespace
      
      // ✅ CRITICAL: Remove prefix pattern "number:number:" if present (e.g., "4:1:eyJ...")
      // Tokens should be pure JWT format without prefixes
      cleanToken = cleanToken.replace(/^\d+:\d+:/, '');
    }
    
    const isValidToken = cleanToken && cleanToken.length > 0;

    // ✅ CRITICAL: Check if token changed - if so, clear cache to prevent loading wrong user's data
    const tokenChanged = this.authToken !== (isValidToken ? cleanToken : null);
    
    if (tokenChanged) {
      logger.debug('🔄 Auth token changed, clearing HTTPClient cache to prevent loading wrong user data');
      this.clearCache();
    }

    logger.debug('🔑 SDK setAuthToken called:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      cleanTokenLength: cleanToken?.length || 0,
      isValidToken: isValidToken,
      tokenChanged: tokenChanged,
      tokenPreview: token ? maskSecretForLog(token) : 'null',
      cleanTokenPreview: cleanToken ? maskSecretForLog(cleanToken) : 'null'
    });

    this.authToken = isValidToken ? cleanToken : null;

    // If we acquired a token, align SDK auth state so skipAuthStateCheck:false requests
    // (non-social paths) are not stuck after session_expired until the SPA calls login().
    if (isValidToken) {
      const state = this.authStateStore.getState();
      if (
        state === 'unauthenticated' ||
        state === 'authenticating' ||
        state === 'session_expired'
      ) {
        this.authStateStore.setState({
          state: 'authenticated',
          reason: 'refresh_success', // token present at bootstrap / recovery
          tokens: {
            accessToken: this.authToken,
            apiKey: this.apiKey,
            projectId: this.config.projectId
          }
        });
      }
    }
  }


  public getAuthToken(): string | null {
    return this.authToken;
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public setApiKey(apiKey: string | null): void {
    // Validate and clean API key
    const cleanApiKey = apiKey ? apiKey.trim() : null;
    const isValidApiKey = cleanApiKey && cleanApiKey.length > 0;
    
    // ✅ CRITICAL: Check if API key changed - if so, clear cache to prevent loading wrong user's data
    const apiKeyChanged = this.apiKey !== (isValidApiKey ? cleanApiKey : null);
    
    if (apiKeyChanged) {
      logger.debug('🔄 API key changed, clearing HTTPClient cache to prevent loading wrong user data');
      this.clearCache();
    }
    
    logger.debug('🔑 SDK setApiKey called:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      cleanApiKeyLength: cleanApiKey?.length || 0,
      isValidApiKey: isValidApiKey,
      apiKeyChanged: apiKeyChanged,
      apiKeyPreview: apiKey ? maskSecretForLog(apiKey) : 'null'
    });
    
    this.apiKey = isValidApiKey ? cleanApiKey : null;

    if (isValidApiKey) {
      const state = this.authStateStore.getState();
      if (
        state === 'unauthenticated' ||
        state === 'authenticating' ||
        state === 'session_expired'
      ) {
        this.authStateStore.setState({
          state: 'authenticated',
          reason: 'refresh_success',
          tokens: {
            accessToken: this.authToken,
            apiKey: this.apiKey,
            projectId: this.config.projectId,
          },
        });
      }
    }
  }

  /**
   * After successful login, ignore transient 401s that would mark session_expired.
   * Mirrors the SPA grace window in auth.tsx refreshUser.
   */
  public markRecentLoginSuccess(): void {
    this.postLoginGraceUntil = Date.now() + HTTPClient.POST_LOGIN_GRACE_MS;
    logger.debug('Post-login grace window started', {
      graceMs: HTTPClient.POST_LOGIN_GRACE_MS,
    });
  }

  public isInPostLoginGrace(): boolean {
    return Date.now() < this.postLoginGraceUntil;
  }

  /**
   * Force refresh tokens from localStorage
   * ✅ CRITICAL FIX: Read tokens directly from localStorage WITHOUT prefix first
   * This ensures tokens are always found after page reload
   */
  public refreshTokensFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // ✅ CRITICAL: Read directly from localStorage first (no prefix)
      // This ensures tokens saved by setTokens() are always found
      const accessToken = localStorage.getItem('access_token') || getStorageItem('access_token');
      const apiKey = localStorage.getItem('api_key') || getStorageItem('api_key');
      
      // ✅ CRITICAL: Log for debugging
      if (accessToken || apiKey) {
        logger.debug('🔄 HTTPClient.refreshTokensFromStorage: Tokens found', {
          hasAccessToken: !!accessToken,
          hasApiKey: !!apiKey,
          accessTokenLength: accessToken?.length || 0,
          apiKeyLength: apiKey?.length || 0
        });
      }
      
      if (accessToken) {
        this.setAuthToken(accessToken);
      }
      if (apiKey) {
        this.setApiKey(apiKey);
      }
      const storedPid = readProjectIdFromBrowserStorage();
      if (storedPid) {
        this.config.projectId = storedPid;
      }
    }
  }

  private async _executeRequest<T>(url: string, headers: Record<string, string>, config: RequestConfig): Promise<APIResponse<T>> {
    /**
     * Actual HTTP request execution
     * Wrapped by circuit breaker for safety! (v0.1.39!)
     */
    
    // Log request
    logger.debug(`HTTP ${config.method} ${url}`, {
      headers: Object.keys(headers),
      hasBody: !!config.body
    });

    const headerSnapshot = Object.entries(headers).reduce(
      (acc, [key, value]) => {
        acc[key] = maskHeaderValueForLog(key, value);
        return acc;
      },
      {} as Record<string, string>
    );
    logger.debug('🔍 SDK _executeRequest', {
      url: url,
      method: config.method,
      hasAuthorization: !!headers['Authorization'],
      Authorization: headers['Authorization']
        ? maskBearerAuthorizationForLog(headers['Authorization'])
        : 'null',
      hasXApiKey: !!headers['X-API-Key'],
      'X-API-Key': headers['X-API-Key'] ? maskSecretForLog(headers['X-API-Key']) : 'null',
      allHeaders: Object.keys(headers),
      headerSnapshot
    });

    // Create AbortController for timeout; link external signal (e.g. React Query) so both abort fetch.
    const controller = new AbortController();
    // Track whether the timer fired so AbortError from React Query cancellation
    // is not logged as "HTTP Timeout" (they share the same AbortError name).
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.timeout || this.config.timeout);
    const external = config.signal;
    if (external) {
      if (external.aborted) {
        clearTimeout(timeoutId);
        controller.abort();
      } else {
        external.addEventListener(
          'abort',
          () => {
            clearTimeout(timeoutId);
            controller.abort();
          },
          { once: true }
        );
      }
    }

    try {
      const fetchInit: RequestInit = {
        method: config.method,
        headers,
        body: config.body instanceof FormData ? config.body : (config.body ? JSON.stringify(config.body) : undefined),
        signal: controller.signal,
      };
      if (shouldIncludeCredentials(config.method, headers)) {
        fetchInit.credentials = 'include';
      }
      if (config.fetchPriority != null) {
        Object.assign(fetchInit, { priority: config.fetchPriority });
      }
      const response = await fetch(url, fetchInit);

      clearTimeout(timeoutId);
      
      // Log response
      logger.debug(`HTTP ${response.status} ${config.method} ${url}`, {
        status: response.status,
        statusText: response.statusText
      });

      // Handle 304 Not Modified (before body parse; skipCache callers rely on status + headers).
      if (response.status === 304) {
        const cacheKey = this.getCacheKey(config);
        const entry = this.cache.get(cacheKey);
        if (entry?.data) {
          entry.timestamp = Date.now();
          return entry.data as APIResponse<T>;
        }
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          return cached;
        }
        const api304: APIResponse<T> = {
          data: null as T,
          status: 304,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers),
          config: config,
          duration: 0,
          timestamp: Date.now(),
          traceId: response.headers.get('X-Trace-Id') || undefined
        };
        return this.config.responseInterceptor
          ? await this.config.responseInterceptor(api304)
          : api304;
      }

      // ✅ CRITICAL FIX: Clone response BEFORE reading to handle Content-Length errors
      // When response is compressed, browser auto-decompresses but Content-Length
      // header may refer to compressed size, causing "Content-Length exceeds Body" error
      // Solution: Clone response before reading so we can retry if needed
      const clonedResponse = response.clone();
      
      let responseData: T;
      try {
        responseData = await this.parseResponse<T>(response);
      } catch (error: any) {
        // If Content-Length error, try to read from cloned response
        if (error?.message?.includes('Content-Length') || 
            (error?.name === 'TypeError' && error?.message?.includes('exceeds')) ||
            (error?.message?.includes('Body has already been consumed'))) {
          logger.warn('Content-Length error in parseResponse, attempting recovery with cloned response', {
            url,
            error: error.message
          });
          // Try to read from cloned response which hasn't been consumed
          try {
            responseData = await this.parseResponse<T>(clonedResponse);
          } catch (cloneError: any) {
            // If cloned response also fails, try text() as last resort
            logger.warn('Cloned response parse also failed, trying text() as fallback', {
              error: cloneError.message
            });
            try {
              const text = await clonedResponse.text();
              try {
                responseData = JSON.parse(text) as T;
              } catch {
                // If not JSON, return as text
                responseData = text as any;
              }
            } catch (textError: any) {
              logger.error('All recovery methods failed for Content-Length error', {
                originalError: error.message,
                cloneError: cloneError.message,
                textError: textError.message
              });
              throw error; // Throw original error
            }
          }
        } else {
          // Re-throw if it's not a Content-Length error
          throw error;
        }
      }
      
      if (!response.ok) {
        // 412 on chat index: optimistic concurrency — detail logged at throw site in catch.
        const isAuthMeSessionProbe =
          response.status === 401 &&
          (url.includes('/auth/me') || url.endsWith('/auth/me'));
        if (!(response.status === 412 && url.includes('/social/chat/index'))) {
          const isExpectedAgentnet404 =
            response.status === 404 &&
            (url.includes('/agentnet/') || url.includes('/agentcoin/')) &&
            (() => {
              const raw = (responseData as { detail?: unknown })?.detail;
              let detail = '';
              if (typeof raw === 'object' && raw != null) {
                const o = raw as { message?: string; code?: string };
                detail = String(o.message ?? o.code ?? '');
              } else {
                detail = String(
                  raw ??
                    (responseData as { message?: string })?.message ??
                    '',
                );
              }
              const d = detail.toLowerCase();
              return (
                d.includes('batch not found') ||
                d.includes('no checkpoint covers') ||
                d.includes('not_found') ||
                d.includes('batch_not_found') ||
                d.includes('checkpoint_no_cover')
              );
            })();
          if (isAuthMeSessionProbe || isExpectedAgentnet404) {
            logger.debug(
              `HTTP ${response.status} ${config.method} ${url}${
                isAuthMeSessionProbe ? ' (session probe — stale token)' : ' (expected agentnet 404)'
              }`,
            );
          } else {
            logger.warn(`HTTP Error ${response.status} ${config.method} ${url}`, responseData);
          }
        }
        // ✅ CRITICAL: For 401 errors on public pages, return immediately without processing
        // This prevents any redirect logic from executing
        if (response.status === 401 && typeof window !== 'undefined' && config.method === HTTPMethod.GET) {
          const currentPath = window.location.pathname;
          const publicRoutes = ['/', '/login', '/register', '/pricing', '/faq', '/api-docs', '/webhook-docs', '/oauth/callback'];
          const isPublicRoute = publicRoutes.some(route => 
            currentPath === route || currentPath.startsWith(route + '/')
          );
          if (isPublicRoute) {
            // On public pages, return error response immediately - NO PROCESSING, NO REDIRECT
            if (isAuthMeSessionProbe) {
              logger.debug(
                `Session probe 401 on public page ${currentPath} for ${url} — no redirect`,
              );
            } else {
              logger.warn(
                `🚫 BLOCKED: Returning 401 error on public page ${currentPath} for ${url} - NO PROCESSING, NO REDIRECT`,
              );
            }
            const detail = (responseData as any)?.error?.detail || (responseData as any)?.detail || 'Unauthorized';
            const error = new UnauthorizedError(detail);
            return {
              data: null as any,
              status: 401,
              statusText: response.statusText,
              headers: this.parseHeaders(response.headers),
              duration: 0,
              timestamp: Date.now(),
              config,
              traceId: response.headers.get('X-Trace-Id') || undefined
            };
          }
        }
        // For non-public pages or non-401 errors, process normally (will throw)
        await this.handleErrorResponse(response, responseData, config);
      }

      const apiResponse: APIResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        config: config,
        duration: 0, // Will be set by caller
        timestamp: 0, // Will be set by caller
        traceId: response.headers.get('X-Trace-Id') || undefined
      };

      // Сбрасываем счетчики retry для успешного URL
      if (response.ok) {
        this.urlRetryCounts.delete(url);
        this.urlRetryDelays.delete(url);
        this.lastRetryTime.delete(url);
        this.refreshRetryDepth.delete(url); // ✅ CRITICAL FIX: Очищаем счетчик глубины рекурсии
        
        // ✅ MEMORY LEAK FIX: Периодическая очистка устаревших записей после успешных запросов
        if (this.urlRetryCounts.size > 50 || this.lastRetryTime.size > 50) {
          this.cleanupStaleRetryEntries();
        }
      }

      // Apply response interceptor
      return this.config.responseInterceptor
        ? await this.config.responseInterceptor(apiResponse)
        : apiResponse;

    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as any)?.name === 'AbortError') {
        if (timedOut) {
          // Timer fired — genuine request timeout
          logger.error(`HTTP Timeout ${config.method} ${url}`, { timeout: config.timeout || this.config.timeout });
          throw new TimeoutError('Request timeout');
        } else {
          // External signal abort (React Query component unmount / query key change).
          // Suppress error noise — React Query handles this silently by design.
          logger.debug(`HTTP Request cancelled ${config.method} ${url}`);
          throw error; // rethrow original AbortError so React Query recognises the cancellation
        }
      }

      // Typed HTTP errors from handleErrorResponse must propagate (412 ConflictError, 404, …).
      // Wrapping them in ServerError broke callers (e.g. chat-index 412 retry) and logged false "Network error".
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof RateLimitError ||
        error instanceof TimeoutError ||
        error instanceof DemoReadOnlyError ||
        error instanceof BudgetExceededError ||
        error instanceof ServerError
      ) {
        if (
          error instanceof ConflictError &&
          error.response?.status === 412 &&
          typeof url === 'string' &&
          url.includes('/social/chat/index')
        ) {
          const det = (error.response?.data as any)?.detail;
          const code =
            det && typeof det === 'object' && typeof det.code === 'string' ? det.code : undefined;
          if (code === 'chat_index_precondition_failed') {
            logger.debug(`HTTP 412 chat_index_precondition_failed ${config.method} ${url}`);
          } else {
            logger.warn(`HTTP 412 ${config.method} ${url}`, error.message);
          }
        }
        throw error;
      }

      if (isTransientBrowserNetworkError(error)) {
        noteTransientNetworkError();
        logger.debug(`HTTP transient network ${config.method} ${url}`, {
          message: (error as Error)?.message,
        });
        throw new ServerError('Network error');
      }

      logger.error(`HTTP Network Error ${config.method} ${url}`, error);
      throw new ServerError('Network error');
    }
  }

  // ============================================================================
  // Token Refresh
  // ============================================================================

  // ✅ MEMORY LEAK FIX: Глобальная защита от конкурентных refresh
  private async attemptTokenRefresh(): Promise<boolean> {
    // Проверяем, не заблокирован ли refresh
    const now = Date.now();
    if (this.refreshBlockedUntil > now) {
      const remainingMs = this.refreshBlockedUntil - now;
      logger.warn(`Token refresh blocked for ${remainingMs}ms more`);
      return false;
    }

    // ✅ MEMORY LEAK FIX: Проверяем глобальную глубину рекурсии (максимум 3 уровня)
    const MAX_GLOBAL_REFRESH_DEPTH = 3;
    if (this.globalRefreshDepth >= MAX_GLOBAL_REFRESH_DEPTH) {
      logger.warn(`Global refresh depth (${this.globalRefreshDepth}) exceeded limit (${MAX_GLOBAL_REFRESH_DEPTH}), blocking refresh`);
      // Блокируем refresh на 30 секунд
      this.refreshBlockedUntil = now + 30000;
      return false;
    }

    // Проверяем глобальный лимит refresh-попыток (5 попыток за 5 минут)
    const GLOBAL_REFRESH_LIMIT = 5;
    const GLOBAL_REFRESH_WINDOW = 5 * 60 * 1000; // 5 минут
    
    if (now - this.globalRefreshAttemptsResetTime > GLOBAL_REFRESH_WINDOW) {
      // Сбрасываем счетчик если прошло больше 5 минут
      this.globalRefreshAttempts = 0;
      this.globalRefreshAttemptsResetTime = now;
    }
    
    if (this.globalRefreshAttempts >= GLOBAL_REFRESH_LIMIT) {
      logger.warn(`Global refresh limit (${GLOBAL_REFRESH_LIMIT} attempts per ${GLOBAL_REFRESH_WINDOW}ms) reached, blocking refresh`);
      // Блокируем refresh на 30 секунд
      this.refreshBlockedUntil = now + 30000;
      return false;
    }

    // Проверяем, не слишком ли часто пытаемся обновить (минимум 1 секунда между попытками)
    const MIN_REFRESH_INTERVAL = 1000; // 1 секунда
    if (this.lastRefreshTime > 0 && now - this.lastRefreshTime < MIN_REFRESH_INTERVAL) {
      logger.warn(`Token refresh too frequent, waiting ${MIN_REFRESH_INTERVAL - (now - this.lastRefreshTime)}ms`);
      return false;
    }

    // Если уже идет refresh, возвращаем существующий промис
    if (this.refreshLock !== null) {
      logger.debug('Token refresh already in progress, waiting for completion');
      return this.refreshLock;
    }

    // Ограничиваем количество попыток refresh (максимум 3 попытки)
    if (this.refreshAttempts >= 3) {
      logger.warn('Maximum refresh attempts reached, giving up');
      // Блокируем refresh на 30 секунд после 3 неудачных попыток
      this.refreshBlockedUntil = now + 30000;
      return false;
    }

    // Создаем новый lock для refresh
    this.refreshLock = (async () => {
      try {
        this.refreshAttempts++;
        this.globalRefreshAttempts++;
        this.globalRefreshDepth++; // ✅ MEMORY LEAK FIX: Увеличиваем глобальную глубину
        this.lastRefreshTime = now;
        logger.debug(`Token refresh attempt ${this.refreshAttempts}/3 (global: ${this.globalRefreshAttempts}/${GLOBAL_REFRESH_LIMIT}, depth: ${this.globalRefreshDepth})`);

        // ✅ Fix: Check if we're on login page - don't attempt auto-login
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath.includes('/login')) {
            logger.debug('🚫 Skipping token refresh on login page');
            return false;
          }
        }

        // Сбрасываем URL-специфичные счетчики при попытке refresh
        this.urlRetryCounts.clear();
        this.urlRetryDelays.clear();
        this.lastRetryTime.clear();
        this.refreshRetryDepth.clear(); // ✅ CRITICAL FIX: Очищаем счетчик глубины рекурсии
        
        // Сначала пытаемся найти сохраненные credentials для перелогинивания
        // Note: login_email, login_password, login_project_id are not stored in storage-utils for security
        // These are only in sessionStorage for auto-login fallback
        const savedEmail = sessionStorage.getItem('login_email');
        const savedPassword = sessionStorage.getItem('login_password');
        const savedProjectId = sessionStorage.getItem('login_project_id') || '1';

        // ✅ Fix: Don't attempt auto-login if credentials are missing
        if (!savedEmail || !savedPassword) {
          logger.debug('🚫 No saved credentials found, skipping auto-login');
          return false;
        }

        if (savedEmail && savedPassword) {
          logger.debug('Attempting automatic re-login with saved credentials...');

          // Импортируем AgentAuth для перелогинивания
          const { AgentAuth } = await import('../modules/AgentAuth');
          const auth = new AgentAuth(this);

          const loginResult = await auth.login({
            email: savedEmail,
            password: savedPassword,
            project_id: parseInt(savedProjectId)
          });

          if (loginResult && loginResult.access_token) {
            logger.info('Automatic re-login successful');

            // CRITICAL: Обновляем токены в httpClient после успешного логина
            this.setAuthToken(loginResult.access_token);

            // API key должен быть получен из ответа, используем refresh_token как API key (согласно логике SDK)
            const apiKeyFromResponse = loginResult.refresh_token || loginResult.access_token;
            this.setApiKey(apiKeyFromResponse);

            // Также обновляем storage для консистентности
            if (typeof window !== 'undefined') {
              setStorageItem('access_token', loginResult.access_token);
              setStorageItem('refresh_token', loginResult.refresh_token || '');
              setStorageItem('api_key', apiKeyFromResponse);
            }

            // CRITICAL: Полностью сбрасываем все retry счетчики после успешного перелогинивания
            logger.debug('🔄 Resetting all retry counters after successful re-login');
            this.urlRetryCounts.clear();
            this.urlRetryDelays.clear();
            this.lastRetryTime.clear();
            this.refreshRetryDepth.clear(); // ✅ CRITICAL FIX: Очищаем счетчик глубины рекурсии
            this.refreshAttempts = 0; // Сбрасываем счетчик при успехе
            this.globalRefreshAttempts = 0; // ✅ MEMORY LEAK FIX: Сбрасываем глобальный счетчик при успехе
            this.globalRefreshAttemptsResetTime = Date.now();
            this.globalRefreshDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем глобальную глубину при успехе
            this.retryRecursionDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем счетчик глубины retry при успехе

            // ✅ MEMORY LEAK FIX: Повторяем все ожидающие запросы после успешного refresh
            this.retryPendingRequests(true);

            return true;
          }
        }

        // Если credentials не найдены, пытаемся использовать refresh token (fallback)
        const refreshToken = getStorageItem('refresh_token') || sessionStorage.getItem('refresh_token');
        if (!refreshToken) {
          return false;
        }

        const response = await fetch(`${this.config.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Обновляем токены в storage
          if (getStorageItem('access_token')) {
            setStorageItem('access_token', data.access_token);
            setStorageItem('refresh_token', data.refresh_token);
            setStorageItem('api_key', data.access_token);
          } else {
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('refresh_token', data.refresh_token);
            sessionStorage.setItem('api_key', data.access_token);
          }

          // Обновляем токены в SDK
          this.setAuthToken(data.access_token);
          this.setApiKey(data.access_token);

          // ✅ CRITICAL FIX: Сбрасываем счетчик попыток refresh при успехе
          this.refreshAttempts = 0;
          this.globalRefreshAttempts = 0; // ✅ MEMORY LEAK FIX: Сбрасываем глобальный счетчик при успехе
          this.globalRefreshAttemptsResetTime = Date.now();
          this.globalRefreshDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем глобальную глубину при успехе
          this.retryRecursionDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем счетчик глубины retry при успехе
          // ✅ CRITICAL FIX: Очищаем все счетчики retry
          this.urlRetryCounts.clear();
          this.urlRetryDelays.clear();
          this.lastRetryTime.clear();
          this.refreshRetryDepth.clear();

          // ✅ MEMORY LEAK FIX: Повторяем все ожидающие запросы после успешного refresh
          this.retryPendingRequests(true);

          return true;
        }
      } catch (error) {
        logger.error('Token refresh failed:', error);
      } finally {
        // ✅ MEMORY LEAK FIX: Сбрасываем глобальную глубину и освобождаем lock
        // Сбрасываем только если это был последний уровень (глубина вернется к 0)
        // Если это вложенный вызов, глубина уменьшится при возврате
        if (this.globalRefreshDepth > 0) {
          this.globalRefreshDepth--;
        }
        this.refreshLock = null;
      }

      // Если refresh не удался, очищаем токены и отправляем событие только после 3 попыток
      if (this.refreshAttempts >= 3) {
        removeStorageItem('access_token');
        removeStorageItem('refresh_token');
        removeStorageItem('api_key');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('api_key');

        // ✅ MEMORY LEAK FIX: Очищаем кэш и proteinCache при критической ошибке
        this.clearCache();
        if (this.proteinCache) {
          try {
            (this.proteinCache as any).clear?.();
            logger.debug('Cleared proteinCache after critical refresh failure');
          } catch (e) {
            // Игнорируем ошибки
          }
        }

        // Блокируем refresh на 30 секунд
        this.refreshBlockedUntil = Date.now() + 30000;

        // Отправляем событие об истечении токена
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // Список публичных путей, которые не требуют авторизации
          const publicRoutes = ['/', '/login', '/register', '/pricing', '/faq', '/api-docs', '/webhook-docs', '/oauth/callback'];
          const isPublicRoute = publicRoutes.some(route => 
            currentPath === route || currentPath.startsWith(route + '/')
          );
          
          // Отправляем событие только если не на публичной странице
          if (!isPublicRoute) {
            window.dispatchEvent(new Event('auth:expired'));
            
            // Перенаправляем на страницу логина только если мы не на публичной странице
            logger.warn('Token refresh failed after 3 attempts, redirecting to login page');
            window.location.href = '/login';
          } else {
            logger.debug(`Token refresh failed but on public route ${currentPath}, skipping redirect and event`);
          }
        }

        logger.warn('Token refresh failed after 3 attempts, user needs to re-login manually');
      }

      // ✅ MEMORY LEAK FIX: Отклоняем все ожидающие запросы при неудачном refresh
      this.retryPendingRequests(false);

      return false;
    })();

    return this.refreshLock;
  }

  // ✅ MEMORY LEAK FIX: Повторение или отклонение ожидающих запросов
  private retryPendingRequests(success: boolean): void {
    // ✅ MEMORY LEAK FIX: Проверяем глубину рекурсии для предотвращения бесконечных циклов
    if (this.retryRecursionDepth >= HTTPClient.MAX_RETRY_RECURSION_DEPTH) {
      logger.error(`🚫 Max retry recursion depth (${this.retryRecursionDepth}) reached, rejecting all pending requests to prevent infinite loop`);
      const pending = [...this.pendingRequestsDuringRefresh];
      this.pendingRequestsDuringRefresh = [];
      const error = new UnauthorizedError('Max retry recursion depth exceeded - possible infinite loop detected');
      pending.forEach(({ reject }) => {
        reject(error);
      });
      // Сбрасываем счетчик после отклонения всех запросов
      this.retryRecursionDepth = 0;
      return;
    }
    
    this.retryRecursionDepth++;
    
    try {
      const now = Date.now();
      
      // ✅ MEMORY LEAK FIX: Фильтруем устаревшие запросы перед обработкой
      const validPending = this.pendingRequestsDuringRefresh.filter(({ startTime }) => {
        return now - startTime < HTTPClient.PENDING_REQUEST_TIMEOUT;
      });
      
      // Отклоняем устаревшие запросы
      const expiredCount = this.pendingRequestsDuringRefresh.length - validPending.length;
      if (expiredCount > 0) {
        logger.warn(`Rejecting ${expiredCount} expired pending requests (older than ${HTTPClient.PENDING_REQUEST_TIMEOUT}ms)`);
        const expired = this.pendingRequestsDuringRefresh.filter(({ startTime }) => {
          return now - startTime >= HTTPClient.PENDING_REQUEST_TIMEOUT;
        });
        const timeoutError = new TimeoutError('Request timeout while waiting for token refresh');
        expired.forEach(({ reject }) => {
          reject(timeoutError);
        });
      }
      
      const pending = [...validPending];
      this.pendingRequestsDuringRefresh = [];

      if (success) {
        // Повторяем все валидные ожидающие запросы
        logger.debug(`Retrying ${pending.length} pending requests after successful token refresh (recursion depth: ${this.retryRecursionDepth})`);
        pending.forEach(({ config, resolve, reject, startTime }) => {
          // Повторяем запрос через makeHTTPRequest
          // ✅ MEMORY LEAK FIX: Обрабатываем ошибки чтобы предотвратить накопление промисов
          this.makeHTTPRequest(config)
            .then((response) => {
              this.retryRecursionDepth = 0; // Сбрасываем при успехе
              resolve(response);
            })
            .catch((error) => {
              // ✅ MEMORY LEAK FIX: Если снова получили 401, не увеличиваем глубину рекурсии
              // Просто отклоняем запрос чтобы избежать бесконечного цикла
              if (error instanceof UnauthorizedError && this.retryRecursionDepth >= HTTPClient.MAX_RETRY_RECURSION_DEPTH - 1) {
                logger.warn(`🚫 Rejecting request after 401 to prevent recursion: ${config.url || 'unknown'}`);
                reject(new UnauthorizedError('Token refresh failed - max retry depth reached'));
              } else {
                reject(error);
              }
            });
        });
      } else {
        // Отклоняем все ожидающие запросы
        logger.debug(`Rejecting ${pending.length} pending requests after failed token refresh (recursion depth: ${this.retryRecursionDepth})`);
        const error = new UnauthorizedError('Token refresh failed');
        pending.forEach(({ reject }) => {
          reject(error);
        });
        // Сбрасываем счетчик после отклонения
        this.retryRecursionDepth = 0;
      }
    } finally {
      // ✅ MEMORY LEAK FIX: Уменьшаем счетчик глубины только если это был последний уровень
      // Если запросы успешно обработаны, счетчик уже сброшен в обработчиках
      if (this.retryRecursionDepth > 0 && !success) {
        this.retryRecursionDepth = 0;
      }
    }
  }
  
  // ✅ MEMORY LEAK FIX: Добавление запроса в очередь с проверкой размера и очисткой старых
  private addPendingRequest(request: {
    config: RequestConfig;
    resolve: (value: APIResponse<any>) => void;
    reject: (error: any) => void;
    startTime: number;
  }): void {
    const now = Date.now();
    
    // ✅ MEMORY LEAK FIX: Очищаем устаревшие запросы перед добавлением нового
    this.pendingRequestsDuringRefresh = this.pendingRequestsDuringRefresh.filter(({ startTime }) => {
      return now - startTime < HTTPClient.PENDING_REQUEST_TIMEOUT;
    });
    
    // ✅ MEMORY LEAK FIX: Проверяем максимальный размер очереди
    if (this.pendingRequestsDuringRefresh.length >= HTTPClient.MAX_PENDING_REQUESTS) {
      // Удаляем самый старый запрос
      const oldest = this.pendingRequestsDuringRefresh.shift();
      if (oldest) {
        logger.warn(`Pending requests queue is full (${HTTPClient.MAX_PENDING_REQUESTS}), rejecting oldest request: ${oldest.config.url || 'unknown'}`);
        const error = new UnauthorizedError('Too many pending requests, request rejected');
        oldest.reject(error);
      }
    }
    
    this.pendingRequestsDuringRefresh.push(request);
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /** FastAPI may return detail as a string or as { message, code, details }. */
  private static normalizeApiErrorMessage(errorData: any, data: any): string {
    const rawDetail = errorData?.detail ?? data?.detail;
    if (typeof rawDetail === 'string') {
      return rawDetail;
    }
    if (rawDetail && typeof rawDetail === 'object' && typeof rawDetail.message === 'string') {
      return rawDetail.message;
    }
    if (typeof errorData?.message === 'string') {
      return errorData.message;
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
    return '';
  }

  /** FastAPI session probe: ``detail: { code: 'token_expired', ... }``. */
  private static isTokenExpiredDetail(rawDetail: unknown): boolean {
    if (rawDetail && typeof rawDetail === 'object' && !Array.isArray(rawDetail)) {
      return (rawDetail as { code?: string }).code === 'token_expired';
    }
    if (typeof rawDetail === 'string') {
      const lowered = rawDetail.toLowerCase();
      return lowered.includes('token_expired') || lowered.includes('session expired');
    }
    return false;
  }

  private static dispatchAuthExpiredOnProtectedPage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const currentPath = window.location.pathname;
    const publicRoutes = [
      '/',
      '/login',
      '/register',
      '/pricing',
      '/faq',
      '/api-docs',
      '/webhook-docs',
      '/oauth/callback',
    ];
    const isPublicRoute = publicRoutes.some((route) => {
      const normalizedRoute = route === '/' ? '/' : route;
      const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');
      return normalizedPath === normalizedRoute || normalizedPath.startsWith(`${normalizedRoute}/`);
    });
    if (!isPublicRoute) {
      window.dispatchEvent(new Event('auth:expired'));
    }
  }

  private async handleErrorResponse(response: Response, data: any, config?: RequestConfig): Promise<APIResponse<any> | never> {
    // ✅ CRITICAL: FastAPI returns errors directly in data, not in data.error
    // Structure: { detail: "error message" } for HTTPException
    const errorData = data?.error || data;
    const rawDetail = errorData?.detail ?? data?.detail;
    const message = HTTPClient.normalizeApiErrorMessage(errorData, data);
    const sessionExpiredByCode = HTTPClient.isTokenExpiredDetail(rawDetail);
    const { code, details } = errorData;
    const traceId = response.headers.get('X-Trace-Id') || undefined;

    // ✅ CRITICAL: Check if we're on a public page BEFORE processing any errors
    // This prevents any redirect logic from executing on public pages
    if (typeof window !== 'undefined' && response.status === 401) {
      const currentPath = window.location.pathname;
      const publicRoutes = ['/', '/login', '/register', '/pricing', '/faq', '/api-docs', '/webhook-docs', '/oauth/callback'];
      const isPublicRoute = publicRoutes.some(route => {
        const normalizedRoute = route === '/' ? '/' : route;
        const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');
        return normalizedPath === normalizedRoute || normalizedPath.startsWith(normalizedRoute + '/');
      });
      
      if (isPublicRoute && config?.method === HTTPMethod.GET) {
        const url = config?.url || 'unknown';
        const isAuthMeProbe = url.includes('/auth/me');
        // On public pages, just return the error without any redirect logic
        if (isAuthMeProbe) {
          logger.debug(
            `Session probe 401 on public page "${currentPath}" for ${url} — no redirect`,
          );
        } else {
          logger.warn(
            `🚫 BLOCKED: Ignoring 401 error on public page "${currentPath}" for ${url} - NO REDIRECT`,
          );
        }
        const error = new UnauthorizedError(message || 'Unauthorized');
        // ✅ CRITICAL: Return immediately - don't process error further
        return {
          data: null as any,
          status: 401,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers),
          duration: 0,
          timestamp: Date.now(),
          config,
          traceId
        } as APIResponse<any>;
      } else {
        logger.debug(`✅ Processing 401 error on protected page "${currentPath}" for ${config?.url || 'unknown'}`);
      }
    }

    let error: AgentStackError;

    switch (response.status) {
      case 400:
        error = new BadRequestError(message || 'Bad Request');
        break;
      case 401: {
        const url = config?.url || 'unknown';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/me');
        const isSettingsFieldGet = url.includes('/auth/settings/get');
        const shouldMarkSessionExpired =
          !config?.skipAuthStateCheck &&
          !isAuthEndpoint &&
          !isSettingsFieldGet &&
          !this.isInPostLoginGrace();

        if (shouldMarkSessionExpired) {
          this.authStateStore.setState({
            state: 'session_expired',
            reason: 'session_expired',
            tokens: {
              accessToken: this.getAuthToken(),
              apiKey: this.getApiKey()
            }
          });
        }

        // ✅ Fix: Don't attempt token refresh for login/auth endpoints to prevent infinite loops
        // Check this FIRST before any retry logic
        if (isAuthEndpoint) {
          logger.debug(`🚫 Skipping token refresh for auth endpoint: ${url}`);
          error = new UnauthorizedError(message || 'Unauthorized');
          break;
        }

        if (isSettingsFieldGet) {
          logger.debug(
            `Settings field GET returned 401 for ${url} — not marking session_expired (best-effort read)`,
          );
          error = new UnauthorizedError(message || 'Unauthorized');
          break;
        }

        if (this.isInPostLoginGrace() && !isAuthEndpoint) {
          this.refreshTokensFromStorage();
          logger.debug(`Post-login grace: refreshed tokens from storage after 401 on ${url}`);
        }

        if (sessionExpiredByCode) {
          logger.debug(`Session expired (token_expired) for ${url} — clearing auth without retry storm`);
          HTTPClient.dispatchAuthExpiredOnProtectedPage();
          error = new UnauthorizedError(message || 'Session expired');
          break;
        }
        
        // ✅ CRITICAL FIX: Проверяем глубину рекурсии после refresh (защита от бесконечных циклов)
        const refreshDepth = this.refreshRetryDepth.get(url) || 0;
        const MAX_REFRESH_RETRY_DEPTH = 2; // Максимум 2 уровня рекурсии после refresh
        
        if (refreshDepth >= MAX_REFRESH_RETRY_DEPTH) {
          logger.warn(`🚫 Max refresh retry depth (${refreshDepth}) reached for ${url}, giving up to prevent infinite loop`);
          // Очищаем счетчик глубины для этого URL
          this.refreshRetryDepth.delete(url);
          error = new UnauthorizedError(message || 'Unauthorized (max refresh retries exceeded)');
          break;
        }
        
        const retryCount = this.urlRetryCounts.get(url) || 0;
        const lastRetry = this.lastRetryTime.get(url) || 0;
        const now = Date.now();

         // Максимум 3 попытки для одного URL (уменьшаем для предотвращения спама)
         if (retryCount >= 3) {
           logger.warn(`🚫 Max retry attempts (${retryCount}) reached for ${url}, giving up`);
           
           // ✅ MEMORY LEAK FIX: Очищаем кэш при множественных 401 ошибках
           // Это предотвращает накопление устаревших данных в кэше
           this.clearCache();
           if (this.proteinCache) {
             try {
               (this.proteinCache as any).clear?.();
               logger.debug('Cleared cache after multiple 401 errors');
             } catch (e) {
               // Игнорируем ошибки
             }
           }
           
           // Очищаем счетчики для предотвращения утечек памяти
           this.urlRetryCounts.delete(url);
           this.urlRetryDelays.delete(url);
           this.lastRetryTime.delete(url);
           this.refreshRetryDepth.delete(url);
           
           // Если достигнут лимит попыток и refresh не удался, перенаправляем на login
           // Но только если мы не на публичной странице
           if (this.refreshAttempts >= 3 && typeof window !== 'undefined') {
             const currentPath = window.location.pathname;
             // Список публичных путей, которые не требуют авторизации
             const publicRoutes = ['/', '/login', '/register', '/pricing', '/faq', '/api-docs', '/webhook-docs', '/oauth/callback'];
             const isPublicRoute = publicRoutes.some(route => 
               currentPath === route || currentPath.startsWith(route + '/')
             );
             if (!isPublicRoute) {
               logger.warn('Max retry attempts reached and token refresh failed, redirecting to login page');
               window.location.href = '/login';
             } else {
               logger.debug(`Max retry attempts reached but on public route ${currentPath}, skipping redirect`);
             }
           }
           
           error = new UnauthorizedError(message || 'Unauthorized (max retries exceeded)');
           break;
         }

        // Прогрессивная задержка: уменьшаем для критических endpoints (projects, auth)
        const isCriticalEndpoint = url.includes('/projects') || url.includes('/auth/');
        const baseDelay = isCriticalEndpoint ? 200 : 1000; // 200ms для critical, 1s для others
        const delayMs = Math.min(baseDelay * Math.pow(2, retryCount), isCriticalEndpoint ? 2000 : 10000); // max 2s for critical, 10s for others
        const timeSinceLastRetry = now - lastRetry;

        if (timeSinceLastRetry < delayMs) {
          logger.warn(`⏳ Too soon for retry ${url}, waiting ${delayMs - timeSinceLastRetry}ms more`);
          error = new UnauthorizedError(message || 'Unauthorized (rate limited)');
          break;
        }

        // Обновляем счетчики
        this.urlRetryCounts.set(url, retryCount + 1);
        this.urlRetryDelays.set(url, delayMs);
        this.lastRetryTime.set(url, now);

        logger.debug(`🔄 Attempting retry ${retryCount + 1}/3 for ${url} after ${delayMs}ms delay`);

        // ✅ Fix: Check if we're on public pages before attempting refresh
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // Список публичных путей, которые не требуют авторизации
          const publicRoutes = ['/', '/login', '/register', '/pricing', '/faq', '/api-docs', '/webhook-docs', '/oauth/callback'];
          const isPublicRoute = publicRoutes.some(route => 
            currentPath === route || currentPath.startsWith(route + '/')
          );
          if (isPublicRoute) {
            logger.debug(`🚫 Skipping token refresh on public page ${currentPath} for ${url}`);
            // Очищаем счетчики
            this.urlRetryCounts.delete(url);
            this.urlRetryDelays.delete(url);
            this.lastRetryTime.delete(url);
            this.refreshRetryDepth.delete(url);
            error = new UnauthorizedError(message || 'Unauthorized');
            break;
          }
        }

        // ✅ MEMORY LEAK FIX: Проверяем, не заблокирован ли refresh перед добавлением в очередь
        if (this.refreshBlockedUntil > Date.now()) {
          const remainingMs = this.refreshBlockedUntil - Date.now();
          logger.warn(`🚫 Request rejected: token refresh is blocked for ${remainingMs}ms more: ${url}`);
          // Очищаем счетчики для предотвращения утечек памяти
          this.urlRetryCounts.delete(url);
          this.urlRetryDelays.delete(url);
          this.lastRetryTime.delete(url);
          this.refreshRetryDepth.delete(url);
          error = new UnauthorizedError(`Token refresh blocked - too many failed attempts. Please try again in ${Math.ceil(remainingMs / 1000)} seconds`);
          break;
        }

        // ✅ MEMORY LEAK FIX: Если refresh уже идет, добавляем запрос в очередь ожидания
        if (this.refreshLock !== null) {
          logger.debug(`Token refresh in progress, adding request to queue: ${url}`);
          return new Promise((resolve, reject) => {
            this.addPendingRequest({
              config: config!,
              resolve,
              reject,
              startTime: Date.now()
            });
          });
        }

        // ✅ MEMORY LEAK FIX: Запускаем refresh и добавляем текущий запрос в очередь
        try {
          // Добавляем текущий запрос в очередь перед запуском refresh
          const requestPromise = new Promise<APIResponse<any>>((resolve, reject) => {
            this.addPendingRequest({
              config: config!,
              resolve,
              reject,
              startTime: Date.now()
            });
          });

          // Запускаем refresh (он обработает очередь после завершения)
          const refreshResult = await this.attemptTokenRefresh();
          
          if (refreshResult) {
            logger.debug(`✅ Token refreshed for ${url}, request will be retried from queue`);
            // Запрос будет повторен из очереди в retryPendingRequests
            return requestPromise;
          } else {
            // Если refresh не удался, удаляем запрос из очереди и выбрасываем ошибку
            const index = this.pendingRequestsDuringRefresh.findIndex(
              p => p.config === config
            );
            if (index >= 0) {
              this.pendingRequestsDuringRefresh.splice(index, 1);
            }
            // Очищаем счетчики для предотвращения утечек памяти
            this.urlRetryCounts.delete(url);
            this.urlRetryDelays.delete(url);
            this.lastRetryTime.delete(url);
            this.refreshRetryDepth.delete(url);
          }
        } catch (refreshError) {
          // Если refresh выбросил ошибку, удаляем запрос из очереди
          const index = this.pendingRequestsDuringRefresh.findIndex(
            p => p.config === config
          );
          if (index >= 0) {
            this.pendingRequestsDuringRefresh.splice(index, 1);
          }
          // Очищаем счетчики
          this.urlRetryCounts.delete(url);
          this.urlRetryDelays.delete(url);
          this.lastRetryTime.delete(url);
          this.refreshRetryDepth.delete(url);
        }

        error = new UnauthorizedError(message || 'Unauthorized');
        break;
      }
      case 402: {
        const detailObj =
          rawDetail && typeof rawDetail === 'object' ? rawDetail : null;
        const budgetCode =
          typeof detailObj?.code === 'string'
            ? detailObj.code
            : typeof code === 'string'
              ? code
              : undefined;
        error = new BudgetExceededError(message || 'Budget Exceeded', {
          code: budgetCode,
          response: {
            status: response.status,
            data,
            statusText: response.statusText,
          },
        });
        break;
      }
      case 403:
        if (code === 'demo_readonly') {
          error = new DemoReadOnlyError(message || 'Demo Read Only');
        } else {
          error = new ForbiddenError(message || 'Forbidden');
        }
        break;
      case 404:
        error = new NotFoundError(message || 'Not Found');
        break;
      case 408:
        error = new TimeoutError(message || 'Request Timeout');
        break;
      case 409:
        // ✅ CRITICAL: Сохраняем полную структуру данных для правильного извлечения сообщения
        // FastAPI возвращает { detail: "..." } в корне объекта
        const conflictData = errorData || data || { detail: message };
        error = new ConflictError(message || 'Conflict', {
          status: response.status,
          data: conflictData, // Сохраняем полную структуру данных
          statusText: response.statusText
        });
        break;
      case 412:
        error = new ConflictError(message || 'Precondition Failed', {
          status: response.status,
          data: errorData || data || { detail: message },
          statusText: response.statusText
        });
        break;
      case 422:
        // FastAPI validation errors — client/query/body shape; not a transport failure.
        error = new BadRequestError(message || 'Validation failed');
        break;
      case 423:
        error = new DemoReadOnlyError(message || 'Demo Read Only');
        break;
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        error = new RateLimitError(message || 'Rate Limit Exceeded');
        break;
      case 500:
      case 502:
      case 503:
      case 504: {
        const root = (data && typeof data === 'object' ? data : null) as Record<string, unknown> | null;
        const apiCode =
          typeof root?.error === 'string'
            ? root.error
            : typeof (errorData as any)?.error === 'string'
              ? (errorData as any).error
              : undefined;
        const requestId =
          typeof root?.request_id === 'string'
            ? root.request_id
            : typeof (errorData as any)?.request_id === 'string'
              ? (errorData as any).request_id
              : undefined;
        if (response.status === 503 && apiCode === 'AgentCoinSchemaMissing') {
          logger.warn(
            `HTTP 503 (AgentCoin L0 schema missing) ${config?.method || ''} ${config?.url || ''}`.trim(),
            { requestId, message: message?.slice(0, 200) },
          );
        }
        error = new ServerError(message || 'Server Error', response.status, {
          apiCode,
          requestId,
        });
        break;
      }
      default:
        error = new ServerError(message || `HTTP ${response.status}`, response.status);
    }

    // Apply error interceptor
    if (this.config.errorInterceptor) {
      throw await this.config.errorInterceptor(error);
    }

    throw error;
  }

  private shouldNotRetry(error: AgentStackError, config?: RequestConfig): boolean {
    if (
      error instanceof ServerError &&
      config?.method &&
      config.method !== HTTPMethod.GET
    ) {
      return true;
    }
    if (
      error instanceof ServerError &&
      error.status === 503 &&
      error.apiCode === 'AgentCoinSchemaMissing'
    ) {
      return true;
    }
    return error instanceof BadRequestError ||
           error instanceof UnauthorizedError ||
           error instanceof ForbiddenError ||
           error instanceof NotFoundError ||
           error instanceof DemoReadOnlyError ||
           error instanceof BudgetExceededError;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getCacheKey(config: RequestConfig): string {
    const params = config.params ? `?${new URLSearchParams(config.params).toString()}` : '';
    return `${config.method}:${config.url}${params}`;
  }

  /**
   * Построить queryKey из requestConfig для protein cache
   */
  private buildQueryKey(config: RequestConfig): string[] {
    const parts = [config.method, config.url];
    
    // Добавить параметры если есть
    if (config.params) {
      const sortedParams = Object.keys(config.params)
        .sort()
        .map(key => `${key}=${config.params![key]}`);
      parts.push(...sortedParams);
    }
    
    // Добавить project_id если есть
    if (this.config.projectId) {
      parts.push(`project_id=${this.config.projectId}`);
    }
    
    return parts;
  }

  /**
   * Сохранить ответ в protein cache
   */
  private async saveToProteinCache<T>(
    config: RequestConfig,
    response: APIResponse<T>
  ): Promise<void> {
    if (!this.proteinCache || config.method !== HTTPMethod.GET) {
      return;
    }

    try {
      const queryKey = this.buildQueryKey(config);
      
      // Извлечь project_id и user_id из headers если есть
      const projectId = this.config.projectId 
        ? (typeof this.config.projectId === 'number' ? this.config.projectId : parseInt(this.config.projectId))
        : undefined;
      
      // Попытаться извлечь user_id из токена
      let userId: number | undefined;
      if (this.authToken) {
        try {
          const tokenParts = this.authToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.user_id) {
              userId = payload.user_id;
            }
          }
        } catch (error) {
          // Игнорировать ошибки парсинга токена
        }
      }

      await this.proteinCache.set(
        queryKey,
        response.data,
        {
          ttl: (this.config as any).proteinCacheTTL || 300000,
          project_id: projectId,
          user_id: userId
        }
      );
    } catch (error) {
      logger.warn('Error saving to protein cache:', error);
      // Не прерывать выполнение при ошибке кеширования
    }
  }

  private getFromCache<T>(key: string): APIResponse<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const maxAge = entry.ttl + HTTPClient.STALE_ETAG_MAX_MS;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }
    if (age > entry.ttl) {
      return null;
    }

    return entry.data as APIResponse<T>;
  }

  private setCache<T>(key: string, response: APIResponse<T>): void {
    const etag =
      response.headers['etag'] ??
      response.headers['ETag'] ??
      (response.headers as Record<string, string>)['etag'];
    if (!etag) return;

    this.cache.set(key, {
      data: response,
      etag: String(etag),
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  }

  public clearCache(): void {
    this.cache.clear();
    // Clear the persistent ProteinCache (IndexedDB) so a newly-logged-in user
    // never sees a previous user's cached responses during the 5-minute TTL window.
    if (this.proteinCache) {
      this.proteinCache.clear().catch((e) => {
        // Best-effort: log but don't block the caller
        console.warn('[HTTPClient] Failed to clear ProteinCache:', e);
      });
    }
  }

  /**
   * Evict all cached responses whose URL contains the given substring from both
   * the in-memory ETag cache and the persistent ProteinCache (IndexedDB).
   *
   * Use after mutations that affect a specific endpoint (e.g. connect/disconnect OAuth
   * provider) so that the next React Query refetch hits the network, not a stale cache.
   *
   * @param urlSubstring - A substring of the URL to match (e.g. '/api/oauth2/connected-providers')
   */
  public async evictCacheByUrl(urlSubstring: string): Promise<void> {
    // 1. Remove matching entries from the in-memory ETag cache.
    //    Cache keys have the format "METHOD:URL?params", so a plain includes() check works.
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(urlSubstring)) {
        this.cache.delete(key);
      }
    }

    // 2. Remove from ProteinCache (IndexedDB).
    //    ProteinCache keys are string[] built by buildQueryKey: ['METHOD', 'URL', ...params].
    //    Delete the two most common GET variants (with and without trailing slash).
    //    Must await so the next GET cannot read stale IndexedDB before delete completes.
    if (this.proteinCache) {
      const url = urlSubstring;
      const urlSlash = urlSubstring.endsWith('/') ? urlSubstring : urlSubstring + '/';
      const pid = this.config.projectId;
      try {
        await Promise.all([
          this.proteinCache.delete(['GET', url]).catch(() => {}),
          this.proteinCache.delete(['GET', urlSlash]).catch(() => {}),
          ...(pid
            ? [
                this.proteinCache
                  .delete(['GET', url, `project_id=${pid}`])
                  .catch(() => {}),
                this.proteinCache
                  .delete(['GET', urlSlash, `project_id=${pid}`])
                  .catch(() => {}),
              ]
            : []),
        ]);
      } catch (e) {
        console.warn('[HTTPClient] evictCacheByUrl: ProteinCache delete failed', e);
      }
    }

    // 3. Cancel any in-flight requests for the same URL so they don't
    //    re-populate the cache with stale data after we've evicted it.
    for (const key of Array.from(this.requestQueue.keys())) {
      if (key.includes(urlSubstring)) {
        this.requestQueue.delete(key);
        this.requestQueueTimestamps.delete(key);
      }
    }
  }

  public cancelPendingRequests(): void {
    // ✅ MEMORY LEAK FIX: Очищаем и очередь, и timestamps
    this.requestQueue.clear();
    this.requestQueueTimestamps.clear();
  }

  // ✅ MEMORY LEAK FIX: Очистка устаревших записей из Maps
  private cleanupStaleRetryEntries(): void {
    const now = Date.now();
    const MAX_AGE = 10 * 60 * 1000; // 10 минут
    const MAX_SIZE = HTTPClient.MAX_RETRY_MAP_SIZE; // Используем константу

    let cleanedCount = 0;

    // Очистка lastRetryTime (удаляем записи старше MAX_AGE) - это основной источник устаревших данных
    const staleUrls: string[] = [];
    this.lastRetryTime.forEach((timestamp, url) => {
      if (now - timestamp > MAX_AGE) {
        staleUrls.push(url);
      }
    });
    staleUrls.forEach(url => {
      this.urlRetryCounts.delete(url);
      this.urlRetryDelays.delete(url);
      this.lastRetryTime.delete(url);
      this.refreshRetryDepth.delete(url);
      cleanedCount++;
    });
    if (staleUrls.length > 0) {
      logger.debug(`Cleaned up ${staleUrls.length} expired retry entries (older than ${MAX_AGE}ms)`);
    }

    // ✅ MEMORY LEAK FIX: Очистка по размеру (если Maps все еще слишком большие после очистки по времени)
    const mapsToCheck = [
      { map: this.urlRetryCounts, name: 'urlRetryCounts' },
      { map: this.urlRetryDelays, name: 'urlRetryDelays' },
      { map: this.lastRetryTime, name: 'lastRetryTime' },
      { map: this.refreshRetryDepth, name: 'refreshRetryDepth' }
    ];

    mapsToCheck.forEach(({ map, name }) => {
      if (map.size > MAX_SIZE) {
        // Удаляем самые старые записи до достижения MAX_SIZE
        // Используем lastRetryTime как источник приоритета (удаляем самые старые)
        const entries = Array.from(this.lastRetryTime.entries())
          .sort((a, b) => a[1] - b[1]) // Сортируем по времени (старые первыми)
          .slice(0, map.size - MAX_SIZE);
        
        entries.forEach(([url]) => {
          this.urlRetryCounts.delete(url);
          this.urlRetryDelays.delete(url);
          this.lastRetryTime.delete(url);
          this.refreshRetryDepth.delete(url);
          cleanedCount++;
        });
        logger.debug(`Cleaned up ${entries.length} entries from ${name} (size limit: ${MAX_SIZE})`);
      }
    });

    // ✅ MEMORY LEAK FIX: Очистка requestQueue от устаревших запросов (старше 30 секунд)
    const REQUEST_QUEUE_TIMEOUT = 30 * 1000; // 30 секунд
    const staleQueueKeys: string[] = [];
    this.requestQueueTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > REQUEST_QUEUE_TIMEOUT) {
        staleQueueKeys.push(key);
      }
    });
    if (staleQueueKeys.length > 0) {
      staleQueueKeys.forEach(key => {
        this.requestQueue.delete(key);
        this.requestQueueTimestamps.delete(key);
      });
      logger.debug(`Cleaned up ${staleQueueKeys.length} expired requests from queue (older than ${REQUEST_QUEUE_TIMEOUT}ms)`);
    }
    
    // Также очищаем если очередь слишком большая (более 50 запросов)
    if (this.requestQueue.size > 50) {
      // Удаляем самые старые запросы
      const entries = Array.from(this.requestQueueTimestamps.entries())
        .sort((a, b) => a[1] - b[1]) // Сортируем по времени (старые первыми)
        .slice(0, Math.floor(this.requestQueue.size / 2));
      
      entries.forEach(([key]) => {
        this.requestQueue.delete(key);
        this.requestQueueTimestamps.delete(key);
      });
      logger.debug(`Cleaned up ${entries.length} oldest requests from queue (size limit: 50)`);
    }

    // Очистка очереди ожидающих запросов (удаляем запросы старше 30 секунд)
    const REQUEST_TIMEOUT = 30 * 1000; // 30 секунд
    const validPendingRequests = this.pendingRequestsDuringRefresh.filter(({ startTime }) => {
      return now - startTime < REQUEST_TIMEOUT;
    });
    const removedPendingCount = this.pendingRequestsDuringRefresh.length - validPendingRequests.length;
    if (removedPendingCount > 0) {
      // Отклоняем устаревшие запросы
      const removed = this.pendingRequestsDuringRefresh.filter(({ startTime }) => {
        return now - startTime >= REQUEST_TIMEOUT;
      });
      removed.forEach(({ reject }) => {
        reject(new TimeoutError('Request timeout while waiting for token refresh'));
      });
      this.pendingRequestsDuringRefresh = validPendingRequests;
      logger.debug(`Cleaned up ${removedPendingCount} expired pending requests`);
    }

    if (cleanedCount > 0) {
      logger.debug(`Total cleaned up: ${cleanedCount} stale entries from retry Maps`);
    }
  }

  // ✅ MEMORY LEAK FIX: Полная очистка состояния HTTPClient
  public cleanup(): void {
    logger.debug('Cleaning up HTTPClient state...');

    // ✅ MEMORY LEAK FIX: Останавливаем cleanupInterval
    this.stopCleanupInterval();

    // Очистка всех Maps
    this.urlRetryCounts.clear();
    this.urlRetryDelays.clear();
    this.lastRetryTime.clear();
    this.refreshRetryDepth.clear();
    this.requestQueue.clear();
    this.requestQueueTimestamps.clear(); // ✅ MEMORY LEAK FIX: Очищаем timestamps

    // Сброс счетчиков
    this.refreshAttempts = 0;
    this.globalRefreshAttempts = 0;
    this.globalRefreshAttemptsResetTime = 0;
    this.lastRefreshTime = 0;
    this.refreshBlockedUntil = 0;
    this.globalRefreshDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем глобальную глубину
    this.retryRecursionDepth = 0; // ✅ MEMORY LEAK FIX: Сбрасываем счетчик глубины retry

    // Очистка очереди ожидающих запросов
    const pending = [...this.pendingRequestsDuringRefresh];
    this.pendingRequestsDuringRefresh = [];
    const error = new UnauthorizedError('Session expired - cleanup called');
    pending.forEach(({ reject }) => {
      reject(error);
    });

    // Освобождение lock
    this.refreshLock = null;
    this.isRefreshingToken = false;

    // Очистка кэша
    this.clearCache();

    // Очистка proteinCache
    if (this.proteinCache) {
      // Если есть метод clear в proteinCache
      try {
        (this.proteinCache as any).clear?.();
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    logger.debug('HTTPClient state cleaned up');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private buildRequestConfig(config: Partial<RequestConfig>): RequestConfig {
    const isFormData = config.body instanceof FormData;
    const defaultHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': this.config.apiKey,
      ...this.config.defaultHeaders,
      ...config.headers
    };

    // Don't set Content-Type for FormData, let browser set it with boundary
    if (!isFormData) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    return {
      url: config.url || '',
      method: config.method || HTTPMethod.GET,
      headers: defaultHeaders,
      body: config.body,
      params: config.params,
      timeout: config.timeout || this.config.timeout,
      retry: config.retry,
      idempotencyKey: config.idempotencyKey || this.generateIdempotencyKey(),
      skipCache: config.skipCache || false,
      skipAuthStateCheck: config.skipAuthStateCheck || false,
      skipBatching: config.skipBatching,
      signal: config.signal,
      fetchPriority: config.fetchPriority,
    };
  }

  private buildRetryConfig(config?: Partial<RetryConfig>): RetryConfig {
    return {
      maxAttempts: config?.maxAttempts || this.config.retryAttempts,
      delay: config?.delay || this.config.retryDelay,
      baseDelay: config?.baseDelay || this.config.retryDelay,
      maxDelay: config?.maxDelay || 30000,
      backoffMultiplier: config?.backoffMultiplier || 2,
      jitter: config?.jitter !== false
    };
  }

  private buildURL(url: string, params?: Record<string, any>): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');

    // ✅ CRITICAL FIX: Log baseUrl to debug production issues
    if (!baseUrl || baseUrl === '/api' || baseUrl === '') {
      logger.error('❌ CRITICAL: HTTPClient baseUrl is empty or invalid!', {
        baseUrl,
        configBaseUrl: this.config.baseUrl,
        apiBase: this.config.apiBase,
        url
      });
    }

    // Philosophy v0.2.11: URL Minimalism - Apply baseUrl prefix to all relative URLs
    // baseUrl already contains /api prefix from constructor
    // ✅ CRITICAL: Remove trailing slash from url to prevent double slashes
    let cleanUrl = url.replace(/\/$/, '');
    // ✅ Avoid double /api/: if baseUrl ends with /api and path starts with /api/, use path without leading /api
    if (baseUrl.endsWith('/api') && (cleanUrl.startsWith('/api/') || cleanUrl === '/api')) {
      cleanUrl = cleanUrl.replace(/^\/api/, '') || '/';
    }

    // ✅ CRITICAL FIX: Handle absolute URLs (starting with http/https) vs relative URLs
    let fullUrl: string;
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      // Absolute URL - use as-is (but ensure it has /api/ prefix if needed)
      fullUrl = cleanUrl;
    } else {
      // Relative URL - combine with baseUrl
      // ✅ CRITICAL FIX: baseUrl should already contain /api/ prefix from constructor
      // If url starts with /, it's already absolute path, just combine
      if (!baseUrl || baseUrl === '/api' || baseUrl === '') {
        let fallbackBaseUrl = '/api';
        if (typeof window !== 'undefined') {
          const isProduction = window.location.protocol === 'https:' ||
                              !window.location.hostname.includes('localhost');
          fallbackBaseUrl = isProduction
            ? `${window.location.origin}/api`
            : AGENTSTACK_DEV_API_BASE;
        }
        logger.warn('⚠️ HTTPClient baseUrl is empty, using fallback:', {
          originalBaseUrl: baseUrl,
          fallbackBaseUrl,
          url
        });
        fullUrl = `${fallbackBaseUrl}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
      } else {
        fullUrl = `${baseUrl}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
      }
    }

    // ✅ CRITICAL FIX: Ensure port 8000 is preserved if baseUrl contains it
    // This is critical for production where API runs on port 8000
    if (baseUrl.includes(':8000') && !fullUrl.includes(':8000') && fullUrl.startsWith('http')) {
      try {
        const urlObj = new URL(fullUrl);
        urlObj.port = '8000';
        fullUrl = urlObj.toString();
        logger.debug('🔍 SDK buildURL: Port 8000 restored', { original: fullUrl, restored: urlObj.toString() });
      } catch (e) {
        // If URL parsing fails, try to add port manually
        const hostMatch = fullUrl.match(/(https?:\/\/[^\/:]+)/);
        if (hostMatch && !fullUrl.includes(':')) {
          fullUrl = fullUrl.replace(hostMatch[1], `${hostMatch[1]}:8000`);
        }
      }
    }

    // ✅ Logger автоматически отключает debug логи в production
    logger.debug('🔍 SDK buildURL:', { url, baseUrl, fullUrl, hasParams: !!params, params });

    // Fix: Don't add ? if params is empty or undefined
    if (!params || Object.keys(params).length === 0) {
      logger.debug('🔍 SDK buildURL: No params, returning URL without query string');
      return fullUrl;
    }

    // ✅ FIX: For relative URLs in browser, don't use URL constructor
    // Just append query parameters manually
    logger.debug('🔍 SDK buildURL: Processing params', { params, paramsType: typeof params, paramsKeys: Object.keys(params || {}) });
    const queryString = Object.entries(params)
      .filter(([key, value]) => {
        // ✅ CRITICAL FIX: Filter out undefined, null, and objects
        if (value === undefined || value === null) {
          logger.debug(`🔍 SDK buildURL: Skipping ${key} (undefined/null)`);
          return false;
        }
        if (typeof AbortSignal !== 'undefined' && value instanceof AbortSignal) {
          logger.debug(`🔍 SDK buildURL: Skipping ${key} (AbortSignal — pass via fetch options, not query string)`);
          return false;
        }
        // Skip objects and arrays - these should not be in query params
        if (typeof value === 'object' && !Array.isArray(value)) {
          logger.warn(`⚠️ Skipping object parameter in query string. Objects should be flattened.`, { 
            key, 
            valueType: typeof value,
            value 
          });
          return false;
        }
        logger.debug(`🔍 SDK buildURL: Including param ${key}=${value} (type: ${typeof value})`);
        return true;
      })
      .map(([key, value]) => {
        // Don't serialize objects to JSON - use direct string conversion
        // Objects should be flattened or passed as individual parameters
        const stringValue = String(value);
        return `${encodeURIComponent(key)}=${encodeURIComponent(stringValue)}`;
      })
      .join('&');
    
    logger.debug('🔍 SDK buildURL: Query string built', { queryString, queryStringLength: queryString.length });

    // ✅ CRITICAL: Don't add ? if queryString is empty
    if (!queryString || queryString.length === 0) {
      return fullUrl;
    }

    const separator = fullUrl.includes('?') ? '&' : '?';
    const finalUrl = `${fullUrl}${separator}${queryString}`;

    // ✅ Logger автоматически отключает debug логи в production
    logger.debug('✅ SDK buildURL final:', { finalUrl });

    return finalUrl;
  }

  /**
   * Resolve a relative API path to an absolute URL (query params optional).
   * Use for streaming/SSE with `fetch` where the standard `get/post` helpers are not suitable.
   */
  public resolveApiUrl(path: string, params?: Record<string, any>): string {
    return this.buildURL(path, params);
  }

  /**
   * Headers for a browser `fetch`, matching auth/api-key behavior of the HTTP client.
   */
  public buildFetchHeaders(extra: Record<string, string> = {}, url?: string): Record<string, string> {
    return this.buildHeaders(extra, url);
  }

  private buildHeaders(customHeaders: Record<string, string>, url?: string): Record<string, string> {
    // ✅ CRITICAL FIX: Загружаем токены из localStorage, если они отсутствуют
    // Это критично для восстановления сессии после перезагрузки страницы
    // (дополнительная проверка на случай, если токены не были загружены при инициализации)
    if (typeof window !== 'undefined' && (!this.authToken || !this.apiKey)) {
      this.refreshTokensFromStorage();
    }
    
    // Clean customHeaders to remove any malformed values
    // ✅ CRITICAL: Remove Authorization header from customHeaders - it should only be set from authToken
    // This prevents "Bearer " (with space but no token) from being set incorrectly
    const cleanCustomHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(customHeaders)) {
      // Skip Authorization header - it will be set from authToken below
      if (key.toLowerCase() === 'authorization') {
        continue;
      }
      if (value && typeof value === 'string') {
        // Remove any leading commas or spaces from header values
        const cleanValue = value.replace(/^[,\s]+/, '').trim();
        if (cleanValue.length > 0) {
          cleanCustomHeaders[key] = cleanValue;
        }
      }
    }
    
    const headers: Record<string, string> = { ...cleanCustomHeaders };

    // Debug logging (logger automatically disables in production)
    logger.debug('SDK buildHeaders debug', {
      hasAuthToken: !!this.authToken,
      authTokenLength: this.authToken?.length || 0,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      url: url,
      authTokenPreview: this.authToken ? maskSecretForLog(this.authToken) : 'null',
      apiKeyPreview: this.apiKey ? maskSecretForLog(this.apiKey) : 'null',
      customHeadersKeys: Object.keys(customHeaders)
    });

    // Add Authorization header if token exists and is valid
    if (this.authToken && typeof this.authToken === 'string' && this.authToken.trim().length > 0) {
      // Remove any leading/trailing whitespace, newlines, and invalid characters
      let cleanToken = this.authToken.trim()
        .replace(/^[,\s\n\r]+/g, '') // Remove leading commas, spaces, newlines
        .replace(/[,\s\n\r]+$/g, '')  // Remove trailing commas, spaces, newlines
        .replace(/\s+/g, '');         // Remove all internal whitespace
      
      // ✅ CRITICAL: Remove prefix pattern "number:number:" if present (e.g., "4:1:eyJ...")
      // Tokens should be pure JWT format without prefixes
      cleanToken = cleanToken.replace(/^\d+:\d+:/, '');
      
      // Validate JWT format (should have 3 parts separated by dots)
      const jwtParts = cleanToken.split('.');
      if (jwtParts.length === 3 && cleanToken.length > 0) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
        logger.debug('✅ Authorization header set', {
          url,
          tokenLength: cleanToken.length,
          tokenPreview: maskSecretForLog(cleanToken),
          jwtParts: jwtParts.length,
          format: 'jwt'
        });
      } else if (cleanToken.length > 0) {
        // If not a JWT, still set it (might be a different format like hybrid_key)
        headers['Authorization'] = `Bearer ${cleanToken}`;
        logger.debug('⚠️ Authorization header set (non-JWT format)', {
          url,
          tokenLength: cleanToken.length,
          tokenPreview: maskSecretForLog(cleanToken),
          jwtParts: jwtParts.length
        });
      } else {
        // ✅ CRITICAL: Remove Authorization header if token is empty after cleaning
        // This prevents "Bearer " (with space but no token) from being sent
        delete headers['Authorization'];
        logger.warn('❌ Authorization header NOT set - token is empty after cleaning', {
          url,
          originalTokenLength: this.authToken.length,
          originalTokenPreview: maskSecretForLog(this.authToken)
        });
      }
    } else {
      // ✅ CRITICAL: Remove Authorization header if no token exists
      // This prevents "Bearer " (with space but no token) from being sent
      delete headers['Authorization'];
      // Anonymous / API-key-only / post-logout: missing Bearer is expected — avoid WARN spam in console.
      logger.debug('Authorization header not set (no bearer token)', {
        url,
        hasAuthToken: !!this.authToken,
        authTokenType: typeof this.authToken,
        authTokenLength: this.authToken?.length || 0
      });
    }


    // ✅ Fix: Add API key header - API key is REQUIRED for /auth/login to validate project
    // Only skip for /auth/refresh (uses token refresh, not API key)
    const isRefreshEndpoint = url ? url.includes('/auth/refresh') : false;
    if (this.apiKey && typeof this.apiKey === 'string' && this.apiKey.trim().length > 0 && !isRefreshEndpoint) {
      // Remove any leading/trailing whitespace, newlines, and invalid characters
      let cleanApiKey = this.apiKey.trim()
        .replace(/^[,\s\n\r]+/g, '') // Remove leading commas, spaces, newlines
        .replace(/[,\s\n\r]+$/g, '')  // Remove trailing commas, spaces, newlines
        .replace(/\s+/g, '');         // Remove all internal whitespace
      
      if (cleanApiKey.length > 0) {
        // ✅ Fix: Use X-API-Key (with capital I) to match server expectation
        headers['X-API-Key'] = cleanApiKey;
        logger.debug('✅ X-API-Key header set', {
          url,
          apiKeyLength: cleanApiKey.length,
          apiKeyPreview: maskSecretForLog(cleanApiKey)
        });
      } else {
        logger.warn('❌ X-API-Key header NOT set - API key is empty after cleaning', {
          url,
          originalApiKeyLength: this.apiKey.length,
          originalApiKeyPreview: maskSecretForLog(this.apiKey)
        });
      }
    } else {
      // Session/JWT-only browser clients often have no API key; public routes need neither — debug only.
      logger.debug('X-API-Key header not set', {
        url,
        hasApiKey: !!this.apiKey,
        apiKeyType: typeof this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        isRefreshEndpoint
      });
    }

    // Add project context
    // ✅ CRITICAL: For login endpoint, always use project_id=1 (ecosystem)
    // Authorization is always through ecosystem, then session is created for target project based on API key
    const isAuthEndpoint = url ? (url.includes('/auth/login') || url.includes('/auth/me')) : false;
    const hasProjectIdHeader = Boolean(headers['X-Project-ID'] || headers['x-project-id']);

    // Storage routes often pass explicit project_id in the query (e.g. ecosystem PID for messenger).
    // Align X-Project-ID with that param — otherwise this block would overwrite any caller header
    // with config.projectId (selected UI project), breaking ecosystem-scoped listings.
    let storageUrlProjectId: string | undefined;
    if (url && !isAuthEndpoint) {
      const lower = url.toLowerCase();
      if (lower.includes('/storage/') || lower.includes('/admin/storage/')) {
        const m = url.match(/[?&]project_id=(\d+)/i);
        if (m?.[1]) {
          storageUrlProjectId = m[1];
        }
      }
    }

    if (isAuthEndpoint && url && url.includes('/auth/login')) {
      // Always use ecosystem project_id=1 for authentication
      headers['X-Project-ID'] = '1';
    } else if (storageUrlProjectId) {
      headers['X-Project-ID'] = storageUrlProjectId;
    } else if (!hasProjectIdHeader && this.config.projectId) {
      headers['X-Project-ID'] = String(this.config.projectId);
    }

    // Add user context for authenticated requests (skip for auth endpoints)
    if (this.authToken && this.authToken.trim().length > 0 && !isAuthEndpoint) {
      // Extract user_id from JWT token (simple decode without validation for header)
      try {
        const tokenParts = this.authToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.user_id) {
            headers['X-User-ID'] = String(payload.user_id);
          }
        }
      } catch (error) {
        // Silently ignore JWT decode errors
        logger.warn('Failed to extract user_id from token for X-User-ID header');
      }
    }

    // Add demo context
    if (this.config.demoMode) {
      headers['X-AS-Demo'] = '1';
      headers['X-AS-Demo-Mode'] = this.config.demoMode;
      if (this.config.projectId) {
        headers['X-AS-Demo-Id'] = String(this.config.projectId);
      }
    }

    const { requestId, traceId } = getOrCreateCorrelationIds(headers);
    if (!headers['X-Request-Id'] && !headers['x-request-id']) {
      headers['X-Request-Id'] = requestId;
    }
    if (!headers['X-Trace-Id'] && !headers['x-trace-id']) {
      headers['X-Trace-Id'] = traceId;
    }

    applyCsrfHeader(headers);

    return headers;
  }

  private getAuthTokenFromStorage(): string | null {
    // Try to get token from browser storage (for frontend)
    if (typeof window !== 'undefined') {
      return getStorageItem('access_token') || 
             sessionStorage.getItem('access_token') || 
             getStorageItem('api_key') ||
             sessionStorage.getItem('api_key');
    }
    
    // For Node.js environments, return null (tokens should be passed explicitly)
    return null;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    try {
    if (contentType?.includes('application/json')) {
        // ✅ CRITICAL FIX: Try json() first - if Content-Length error occurs,
        // _executeRequest will handle it with cloned response
      return await response.json();
    }
    
    return await response.text() as any;
    } catch (error: any) {
      // Re-throw error - _executeRequest will handle Content-Length errors with cloned response
      throw error;
    }
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = (config.baseDelay || 1000) * Math.pow(config.backoffMultiplier || 2, attempt);
    delay = Math.min(delay, config.maxDelay || 30000);
    
    if (config.jitter) {
      delay += Math.random() * 1000; // Add up to 1 second of jitter
    }
    
    return delay;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateIdempotencyKey(): string {
    return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  private initializeMetrics(): SDKMetrics {
    return {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      latency: { min: Infinity, max: 0, avg: 0 },
      errors: {},
      cache: { hits: 0, misses: 0, evictions: 0 }
    };
  }

  private updateMetrics(type: 'successful' | 'failed' | 'cached', duration: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.requests.total++;
    this.metrics.requests[type]++;

    if (type !== 'cached') {
      this.metrics.latency.min = Math.min(this.metrics.latency.min, duration);
      this.metrics.latency.max = Math.max(this.metrics.latency.max, duration);
      this.metrics.latency.avg = (this.metrics.latency.avg + duration) / 2;
    }
  }

  public getMetrics(): SDKMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  public updateConfig(newConfig: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): Required<SDKConfig> {
    return { ...this.config };
  }
}



