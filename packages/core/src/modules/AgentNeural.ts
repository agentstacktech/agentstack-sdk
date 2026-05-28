/**
 * AgentNeural - Neural Architecture интеграция
 * Модуль для работы с Neural Architecture
 */

import { HTTPClient } from '../client/http-client';
import { NeuralCacheStats, PatternAnalysisResult } from '../types';
import { SimpleEventEmitter } from '../utils/event-emitter';

export interface NeuralStatus {
  status: string;
  components: {
    neural_router: {
      status: string;
      latency: string;
      throughput: string;
    };
    neural_cache: {
      status: string;
      hit_rate: string;
      size: string;
    };
    pattern_analyzer: {
      status: string;
      optimizations: number;
      predictions_accuracy: string;
    };
  };
  uptime: string;
  last_optimization: string;
}

export interface NeuralEvent {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  source: string;
  processed: boolean;
}


export class AgentNeural extends SimpleEventEmitter {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    super();
    this.client = client;
  }

  /**
   * Получение статуса Neural Architecture
   */
  async getStatus(): Promise<NeuralStatus> {
    const response = await this.client.get('/neural/status');
    return response.data;
  }

  /**
   * Получение событий Neural Architecture
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    processed?: boolean;
  }): Promise<{
    events: NeuralEvent[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get('/neural/events', params);
    return response.data;
  }

  /**
   * Отправка события в Neural Architecture
   */
  async emitEvent(eventType: string, eventData: any, source?: string): Promise<{
    event_id: string;
    status: 'queued' | 'processed';
    timestamp: string;
  }> {
    const response = await this.client.post('/neural/events', {
      type: eventType,
      data: eventData,
      source: source || 'sdk'
    });
    return response.data;
  }

  /**
   * Neural Cache операции
   */
  cache = {
    /**
     * Получение значения из кэша
     */
    get: async (key: string, cacheName: string = 'default'): Promise<any> => {
      const response = await this.client.get(`/neural/cache/${encodeURIComponent(key)}`, {
        params: { cache_name: cacheName }
      });
      return response.data?.value || null;
    },

    /**
     * Установка значения в кэш с опциональными тегами
     */
    set: async (key: string, value: any, ttl?: number, tags?: string[], cacheName: string = 'default'): Promise<boolean> => {
      const response = await this.client.post('/neural/cache/set', {
        key,
        value,
        ttl,
        tags,
        cache_name: cacheName
      });
      return response.data.success;
    },

    /**
     * Установка значения с тегами (алиас для set с тегами)
     */
    setWithTags: async (key: string, value: any, tags: string[], ttl?: number, cacheName: string = 'default'): Promise<boolean> => {
      return this.cache.set(key, value, ttl, tags, cacheName);
    },

    /**
     * Удаление значения из кэша
     */
    delete: async (key: string, cacheName: string = 'default'): Promise<boolean> => {
      const response = await this.client.delete(`/neural/cache/${encodeURIComponent(key)}`, {
        params: { cache_name: cacheName }
      });
      return response.data.success;
    },

    /**
     * Инвалидация по тегу
     */
    invalidateByTag: async (tag: string, cacheName: string = 'default'): Promise<number> => {
      const response = await this.client.post('/neural/cache/invalidate/tag', {
        tag,
        cache_name: cacheName
      });
      return response.data.invalidated_count;
    },

    /**
     * Инвалидация по паттерну
     */
    invalidateByPattern: async (pattern: string, cacheName: string = 'default'): Promise<number> => {
      const response = await this.client.post('/neural/cache/invalidate/pattern', {
        pattern,
        cache_name: cacheName
      });
      return response.data.invalidated_count;
    },

    /**
     * Получение статистики кэша
     */
    getStats: async (cacheName?: string): Promise<NeuralCacheStats> => {
      const params = cacheName ? { cache_name: cacheName } : undefined;
      const response = await this.client.get('/neural/cache/stats', params);
      return response.data;
    }
  };

  /**
   * Анализ паттернов
   */
  patterns = {
    /**
     * Анализ паттернов поведения
     */
    analyze: async (context: string, params: {
      user_id?: number;
      project_id?: number;
      period?: string;
      limit?: number;
    }): Promise<PatternAnalysisResult> => {
      const response = await this.client.post(`/neural/patterns/analyze/${context}`, params);
      return response.data;
    },

    /**
     * Предсказание на основе паттернов
     */
    predict: async (predictionType: string, params: {
      user_id?: number;
      project_id?: number;
      input_data: any;
    }): Promise<{
      prediction: any;
      confidence: number;
      factors: string[];
      timestamp: string;
    }> => {
      const response = await this.client.post(`/neural/patterns/predict/${predictionType}`, params);
      return response.data;
    },

    /**
     * Получение рекомендаций
     */
    getRecommendations: async (context: string, params?: {
      user_id?: number;
      project_id?: number;
      limit?: number;
    }): Promise<{
      recommendations: Array<{
        id: string;
        type: string;
        priority: 'low' | 'medium' | 'high';
        description: string;
        action_required: boolean;
        estimated_impact: number;
      }>;
    }> => {
      const response = await this.client.get(`/neural/patterns/recommendations/${context}`, params);
      return response.data;
    }
  };

  /**
   * Neural Router
   */
  router = {
    /**
     * Получение реестра роутера
     */
    getRegistry: async (): Promise<{
      routes: Array<{
        id: string;
        pattern: string;
        handler: string;
        priority: number;
        active: boolean;
        stats: {
          requests: number;
          avg_latency: number;
          success_rate: number;
        };
      }>;
    }> => {
      const response = await this.client.get('/neural/router/registry');
      return response.data;
    },

    /**
     * Добавление маршрута
     */
    addRoute: async (route: {
      pattern: string;
      handler: string;
      priority?: number;
    }): Promise<{ route_id: string; status: 'added' | 'updated' }> => {
      const response = await this.client.post('/neural/router/routes', route);
      return response.data;
    },

    /**
     * Удаление маршрута
     */
    removeRoute: async (routeId: string): Promise<boolean> => {
      const response = await this.client.delete(`/neural/router/routes/${routeId}`);
      return response.data.success;
    }
  };

  /**
   * Получение общих метрик Neural Architecture
   */
  async getMetrics(): Promise<{
    cache: NeuralCacheStats;
    events: {
      throughput: number;
      queue_size: number;
      processed_today: number;
    };
    patterns: {
      total_patterns: number;
      accuracy: number;
      predictions_today: number;
    };
    router: {
      total_routes: number;
      active_routes: number;
      avg_latency: number;
    };
  }> {
    const response = await this.client.get('/neural/metrics');
    return response.data;
  }
}



