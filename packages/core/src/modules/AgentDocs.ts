/**
 * AgentDocs - Документация и справка
 * Модуль для получения документации и справки
 */

import { HTTPClient } from '../client/http-client';

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  last_updated: string;
  version: string;
}

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  examples: Array<{
    title: string;
    code: string;
    language: string;
  }>;
  related_topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface APIRef {
  endpoint: string;
  method: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }>;
  responses: Array<{
    status: number;
    description: string;
    schema: any;
  }>;
  examples: Array<{
    title: string;
    request: any;
    response: any;
  }>;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  relevance_score: number;
  matched_terms: string[];
}

export class AgentDocs {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /**
   * Получение справки по теме
   */
  async getHelp(topic: string): Promise<HelpTopic> {
    const response = await this.client.get(`/docs/help/${topic}`);
    return response.data;
  }

  /**
   * Получение документации по разделу
   */
  async getDocumentation(section: string): Promise<DocumentationSection> {
    const response = await this.client.get(`/docs/sections/${section}`);
    return response.data;
  }

  /**
   * Получение всех разделов документации
   */
  async getDocumentationSections(): Promise<{
    sections: Array<{
      id: string;
      title: string;
      category: string;
      description: string;
      last_updated: string;
    }>;
  }> {
    const response = await this.client.get('/docs/sections');
    return response.data;
  }

  /**
   * Получение справочника API
   */
  async getAPIReference(): Promise<{
    endpoints: APIRef[];
    categories: Array<{
      name: string;
      description: string;
      endpoints: string[];
    }>;
  }> {
    const response = await this.client.get('/docs/api-reference');
    return response.data;
  }

  /**
   * Получение справки по конкретному API endpoint
   */
  async getEndpointHelp(endpoint: string, method: string = 'GET'): Promise<APIRef> {
    const response = await this.client.get(`/docs/endpoints/${encodeURIComponent(endpoint)}`, {
      method: method.toUpperCase(),
    });
    return response.data;
  }

  /**
   * Поиск по документации
   */
  async search(query: string, params?: {
    category?: string;
    limit?: number;
    min_relevance?: number;
  }): Promise<{
    results: SearchResult[];
    total: number;
    query: string;
    search_time: number;
  }> {
    const response = await this.client.get('/docs/search', { q: query, ...params });
    return response.data;
  }

  /**
   * Получение примеров кода
   */
  async getCodeExamples(params?: {
    language?: string;
    category?: string;
    endpoint?: string;
    limit?: number;
  }): Promise<{
    examples: Array<{
      id: string;
      title: string;
      description: string;
      language: string;
      category: string;
      code: string;
      endpoint?: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
  }> {
    const response = await this.client.get('/docs/examples', params);
    return response.data;
  }

  /**
   * Получение FAQ
   */
  async getFAQ(category?: string): Promise<{
    faqs: Array<{
      id: string;
      question: string;
      answer: string;
      category: string;
      tags: string[];
      helpful_count: number;
      last_updated: string;
    }>;
  }> {
    const response = await this.client.get('/docs/faq', category ? { category } : {});
    return response.data;
  }

  /**
   * Получение руководства по миграции
   */
  async getMigrationGuide(fromVersion?: string, toVersion?: string): Promise<{
    guide: {
      from_version: string;
      to_version: string;
      breaking_changes: Array<{
        type: 'deprecated' | 'removed' | 'changed';
        description: string;
        impact: 'low' | 'medium' | 'high';
        migration_steps: string[];
      }>;
      new_features: Array<{
        name: string;
        description: string;
        documentation_url: string;
      }>;
      migration_steps: string[];
      estimated_time: string;
    };
  }> {
    const response = await this.client.get('/docs/migration-guide', {
      from_version: fromVersion,
      to_version: toVersion,
    });
    return response.data;
  }

  /**
   * Получение руководства по быстрому старту
   */
  async getQuickStart(language?: string): Promise<{
    guide: {
      language: string;
      title: string;
      description: string;
      prerequisites: string[];
      steps: Array<{
        title: string;
        description: string;
        code?: string;
        verification?: string;
      }>;
      next_steps: Array<{
        title: string;
        description: string;
        url: string;
      }>;
    };
  }> {
    const response = await this.client.get('/docs/quick-start', language ? { language } : {});
    return response.data;
  }

  /**
   * Получение изменений в версиях
   */
  async getChangelog(version?: string): Promise<{
    version: string;
    release_date: string;
    changes: {
      added: Array<{
        title: string;
        description: string;
        category: string;
      }>;
      changed: Array<{
        title: string;
        description: string;
        breaking: boolean;
        category: string;
      }>;
      fixed: Array<{
        title: string;
        description: string;
        category: string;
      }>;
      removed: Array<{
        title: string;
        description: string;
        category: string;
        migration_guide?: string;
      }>;
    };
  }> {
    const response = await this.client.get('/docs/changelog', version ? { version } : {});
    return response.data;
  }

  /**
   * Получение списка поддерживаемых языков
   */
  async getSupportedLanguages(): Promise<{
    languages: Array<{
      code: string;
      name: string;
      examples_available: boolean;
      documentation_completeness: number;
    }>;
  }> {
    const response = await this.client.get('/docs/languages');
    return response.data;
  }

  /**
   * Оценка полезности документации
   */
  async rateDocumentation(docId: string, rating: {
    helpful: boolean;
    clarity: number; // 1-5
    completeness: number; // 1-5
    comments?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.post(`/docs/rate/${docId}`, rating);
    return response.data;
  }

  /**
   * Получение статистики документации
   */
  async getDocumentationStats(): Promise<{
    stats: {
      total_sections: number;
      total_examples: number;
      total_faqs: number;
      most_viewed: Array<{
        id: string;
        title: string;
        views: number;
      }>;
      recent_updates: Array<{
        id: string;
        title: string;
        updated_at: string;
      }>;
      search_popularity: Array<{
        query: string;
        count: number;
      }>;
    };
  }> {
    const response = await this.client.get('/docs/stats');
    return response.data;
  }
}



