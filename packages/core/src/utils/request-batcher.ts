/**
 * Request Batcher - автоматический батчинг HTTP запросов
 * 
 * Философия: Собираем все запросы со страницы и делаем 1 запрос и 1 ответ
 * - Автоматически собирает запросы в батч (debounce 50-100ms)
 * - Отправляет batch запрос на /api/batch
 * - Распределяет результаты обратно по запросам
 */

import { logger } from './logger';
import { BATCH_TRANSPORT_SHED_CODES } from './classifyAuthFailure';

/**
 * Ensure batch sub-request paths include ``/api`` (mirrors backend ``apply_batch_internal_api_prefix``).
 */
export function normalizeBatchSubUrl(url: string): string {
  if (!url.startsWith('/')) return url;
  if (
    url.startsWith('/api/') ||
    url === '/api' ||
    url.startsWith('/uploaded_files/') ||
    url.startsWith('/static/')
  ) {
    return url;
  }
  const prefixes = [
    '/agentnet',
    '/agents',
    '/support',
    '/agentcoin',
    '/auth',
    '/projects',
    '/billing',
    '/rbac',
    '/logic',
    '/diagnostics',
    '/profile',
    '/sessions',
    '/neural',
    '/dna',
    '/buffs',
    '/storage',
    '/rag',
    '/social',
    '/wallets',
    '/payments',
    '/commerce',
    '/integrations',
    '/hosting',
    '/generations',
    '/support',
    '/discovery',
    '/fabric',
    '/capabilities',
    '/cost',
    '/shell',
  ];
  for (const prefix of prefixes) {
    if (url === prefix || url.startsWith(`${prefix}/`)) {
      return `/api${url}`;
    }
  }
  return url;
}

function emitBatchTransportShedEvent(codes: string[], urls: string[] = []): void {
  if (typeof window === 'undefined' || codes.length === 0) return;
  try {
    const primary =
      codes.find((c) => c === 'dna_overloaded') ??
      codes.find((c) => c === 'batch_sub_timeout') ??
      codes[0];
    const url = urls.find((u) => u.includes('/projects')) ?? urls[0];
    window.dispatchEvent(
      new CustomEvent('agentstack.batch.sub_timeout', {
        detail: { codes, code: primary, url, urls },
      }),
    );
    if (codes.includes('dna_overloaded')) {
      window.dispatchEvent(
        new CustomEvent('agentstack.dna.degraded', {
          detail: { code: 'dna_overloaded' },
        }),
      );
    }
  } catch {
    /* ignore — never block batch fan-out */
  }
}

export function batchGetDedupeKey(
  method: string,
  url: string,
  params?: Record<string, unknown>,
): string | null {
  if (method !== 'GET') return null;
  return `GET|${url}|${stableSerializeParams(params)}`;
}

function stableSerializeParams(params?: Record<string, unknown>): string {
  if (params == null || typeof params !== 'object') return '';
  const keys = Object.keys(params as Record<string, unknown>).sort();
  try {
    return JSON.stringify(
      keys.map((k) => [k, (params as Record<string, unknown>)[k]]),
    );
  } catch {
    return '';
  }
}

export interface RequestConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  /** When aborted, queued batch sub-requests reject without waiting for flush. */
  signal?: AbortSignal;
}

export interface QueuedRequest {
  config: RequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export interface BatchRequest {
  requests: Array<{
    id: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
  }>;
  execute_parallel: boolean;
}

export interface BatchResponse {
  success: boolean;
  results: Array<{
    id: string;
    status: number;
    data: any;
    error?: string;
  }>;
  total: number;
  successful: number;
  failed: number;
}

export class RequestBatcher {
  private queue: Map<string, QueuedRequest> = new Map();
  private batchTimeout: number = 50; // ms
  /** Upper bound from first item in a burst: avoids starving the batch when GETs trickle in (mobile + busy pages). */
  private maxBatchWaitMs: number = 220;
  private maxBatchSize: number = 50;
  private timeoutId: NodeJS.Timeout | null = null;
  /** Absolute deadline (epoch ms) for the current burst; set when queue goes 0 → 1. */
  private burstDeadline: number | null = null;
  private baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor(
    baseUrl: string,
    getAuthHeaders: () => Record<string, string>,
    options?: {
      batchTimeout?: number;
      maxBatchSize?: number;
      /** Max time from first queued GET until a flush is forced (debounce-with-maxWait). */
      maxBatchWaitMs?: number;
    }
  ) {
    this.baseUrl = baseUrl;
    this.getAuthHeaders = getAuthHeaders;
    if (options?.batchTimeout) {
      this.batchTimeout = options.batchTimeout;
    }
    if (options?.maxBatchSize) {
      this.maxBatchSize = options.maxBatchSize;
    }
    if (options?.maxBatchWaitMs != null && options.maxBatchWaitMs >= 0) {
      this.maxBatchWaitMs = options.maxBatchWaitMs;
    }
  }

  /**
   * Добавить запрос в батч
   */
  async add<T = any>(config: RequestConfig): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const external = config.signal;
      if (external?.aborted) {
        reject(external.reason ?? new DOMException('Aborted', 'AbortError'));
        return;
      }

      const onAbort = () => {
        this.queue.delete(config.id);
        reject(external?.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      if (external) {
        external.addEventListener('abort', onAbort, { once: true });
      }

      const finish = (fn: () => void) => {
        if (external) {
          external.removeEventListener('abort', onAbort);
        }
        fn();
      };

      // Проверка на критичные запросы (не батчим)
      const isCritical = config.headers?.['X-No-Batch'] === 'true';
      
      if (isCritical) {
        // Выполнить сразу без батчинга
        this.executeImmediate(config)
          .then((v) => finish(() => resolve(v)))
          .catch((e) => finish(() => reject(e)));
        return;
      }

      const wasEmpty = this.queue.size === 0;
      // Добавить в очередь
      this.queue.set(config.id, {
        config,
        resolve: (value) => finish(() => resolve(value as T)),
        reject: (error) => finish(() => reject(error)),
        timestamp: Date.now()
      });

      if (wasEmpty) {
        this.burstDeadline = Date.now() + this.maxBatchWaitMs;
      }

      // Если очередь заполнена, отправить батч сразу
      if (this.queue.size >= this.maxBatchSize) {
        void this.flush();
        return;
      }

      // Запланировать отправку батча через debounce
      this.scheduleBatch();
    });
  }

  /**
   * Запланировать отправку батча
   */
  private scheduleBatch(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.size === 0) {
      return;
    }

    const now = Date.now();
    const maxWaitRemaining =
      this.burstDeadline != null ? this.burstDeadline - now : Infinity;
    if (maxWaitRemaining <= 0) {
      void this.flush();
      return;
    }

    const delay = Math.min(this.batchTimeout, maxWaitRemaining);
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      void this.flush();
    }, delay);
  }

  /**
   * Отправить батч запросов
   */
  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.queue.size === 0) {
      this.burstDeadline = null;
      return;
    }

    this.burstDeadline = null;

    // Собрать запросы из очереди
    const requests = Array.from(this.queue.values());
    this.queue.clear();

    const leaderIdByDedupeKey = new Map<string, string>();
    const batchPayload: BatchRequest['requests'] = [];
    let duplicateGetCount = 0;
    let batchHadSeoMeta = false;

    for (const req of requests) {
      const cfg = req.config;
      const batchUrl = normalizeBatchSubUrl(cfg.url);
      if (batchUrl.includes('/seo/meta') || batchUrl.includes('seo/meta')) {
        batchHadSeoMeta = true;
      }
      const dk = batchGetDedupeKey(cfg.method, batchUrl, cfg.params);
      if (!dk) {
        batchPayload.push({
          id: cfg.id,
          method: cfg.method,
          url: batchUrl,
          headers: cfg.headers,
          body: cfg.body,
          params: cfg.params,
        });
        continue;
      }
      const existing = leaderIdByDedupeKey.get(dk);
      if (!existing) {
        leaderIdByDedupeKey.set(dk, cfg.id);
        batchPayload.push({
          id: cfg.id,
          method: cfg.method,
          url: batchUrl,
          headers: cfg.headers,
          body: cfg.body,
          params: cfg.params,
        });
      } else {
        duplicateGetCount += 1;
      }
    }

    if (duplicateGetCount > 0) {
      logger.debug('[Batch] deduped identical GET sub-requests in flush', {
        duplicate_get_count: duplicateGetCount,
        original_queue_size: requests.length,
        batch_payload_size: batchPayload.length,
        had_seo_meta: batchHadSeoMeta,
      });
    }

    // Сформировать batch запрос
    const batchRequest: BatchRequest = {
      requests: batchPayload,
      execute_parallel: true
    };

    try {
      // Отправить batch запрос
      const authHeaders = this.getAuthHeaders();
      // Remove trailing slash and ensure /api/batch path (avoid /api/api/batch)
      const baseUrl = this.baseUrl.replace(/\/$/, '');
      const batchUrl = baseUrl.endsWith('/api') ? `${baseUrl}/batch` : `${baseUrl}/api/batch`;
      const timeoutHeader = batchPayload[0]?.headers?.['X-Request-Timeout-Ms'];
      const timeoutMs = timeoutHeader ? Number(timeoutHeader) : undefined;
      const batchSignal =
        timeoutMs && Number.isFinite(timeoutMs) && timeoutMs > 0
          ? AbortSignal.timeout(timeoutMs)
          : undefined;
      const response = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(batchRequest),
        signal: batchSignal,
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status} ${response.statusText}`);
      }

      const batchResponse: BatchResponse = await response.json();

      // Распределить результаты обратно по запросам
      const resultsMap = new Map(
        batchResponse.results.map(result => [result.id, result])
      );

      const shedCodes = new Set<string>();
      const shedUrls: string[] = [];
      const idToUrl = new Map(
        batchPayload.map((item) => [item.id, String(item.url || '')]),
      );
      for (const result of batchResponse.results) {
        const resultUrl =
          (result as { url?: string }).url || idToUrl.get(result.id) || '';
        if (result.error && BATCH_TRANSPORT_SHED_CODES.has(result.error)) {
          shedCodes.add(result.error);
          if (resultUrl) shedUrls.push(resultUrl);
        }
        const dataCode =
          result.data &&
          typeof result.data === 'object' &&
          'code' in (result.data as object)
            ? String((result.data as { code?: string }).code || '')
            : '';
        if (dataCode && BATCH_TRANSPORT_SHED_CODES.has(dataCode)) {
          shedCodes.add(dataCode);
          if (resultUrl) shedUrls.push(resultUrl);
        }
      }
      if (shedCodes.size > 0) {
        emitBatchTransportShedEvent([...shedCodes], shedUrls);
      }

      for (const queuedRequest of requests) {
        const cfg = queuedRequest.config;
        const dk = batchGetDedupeKey(cfg.method, cfg.url, cfg.params);
        const leaderId =
          dk != null ? (leaderIdByDedupeKey.get(dk) ?? cfg.id) : cfg.id;
        const result = resultsMap.get(leaderId);

        if (!result) {
          queuedRequest.reject(new Error(`No result for request ${leaderId}`));
          continue;
        }

        if (result.error || result.status >= 400) {
          const error = new Error(result.error || `Request failed with status ${result.status}`);
          (error as any).status = result.status;
          (error as any).apiCode = result.error;
          queuedRequest.reject(error);
        } else {
          queuedRequest.resolve(result.data);
        }
      }
    } catch (error) {
      // При ошибке батча, отклонить все запросы
      for (const queuedRequest of requests) {
        queuedRequest.reject(error);
      }
    }
  }

  /**
   * Выполнить запрос немедленно (без батчинга)
   */
  private async executeImmediate<T = any>(config: RequestConfig): Promise<T> {
    const authHeaders = this.getAuthHeaders();
    const url = new URL(config.url, this.baseUrl);
    
    // Добавить query параметры
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...config.headers
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: config.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Очистить очередь (для тестирования или cleanup)
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.burstDeadline = null;
    this.queue.clear();
  }
}

