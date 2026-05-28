/**
 * AgentWebhooks - Webhook'и
 * Модуль для работы с webhook'ами
 */

import { HTTPClient } from '../client/http-client';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  retry_count: number;
  timeout: number;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
  error_message?: string;
  response_code?: number;
  response_body?: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'success' | 'failed';
  response_code?: number;
  response_body?: string;
  error_message?: string;
  triggered_at: string;
  processed_at: string;
  duration: number;
}

export class AgentWebhooks {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /**
   * Создание webhook'а
   */
  async createWebhook(data: {
    url: string;
    events: string[];
    secret: string;
    retry_count?: number;
    timeout?: number;
    is_active?: boolean;
  }): Promise<Webhook> {
    const response = await this.client.post('/webhooks', data);
    return response.data;
  }

  /**
   * Project-scoped webhook config (`/api/webhooks/projects/:id/webhooks`).
   */
  async listProjectWebhooks(projectId: number): Promise<{
    webhooks: Array<Record<string, unknown>>;
    total: number;
    project_id: number;
  }> {
    const response = await this.client.get(`/webhooks/projects/${projectId}/webhooks`);
    return response.data;
  }

  /**
   * Test one webhook by index in project config.
   */
  async testProjectWebhook(
    projectId: number,
    webhookIndex: number,
  ): Promise<Record<string, unknown>> {
    const response = await this.client.post(
      `/webhooks/projects/${projectId}/webhooks/${webhookIndex}/test`,
      {},
    );
    return response.data;
  }

  /**
   * Получение списка webhook'ов
   */
  async getWebhooks(params?: {
    is_active?: boolean;
    event_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    webhooks: Webhook[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get('/webhooks', params);
    return response.data;
  }

  /**
   * Получение webhook'а по ID
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    const response = await this.client.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Обновление webhook'а
   */
  async updateWebhook(webhookId: string, data: {
    url?: string;
    events?: string[];
    secret?: string;
    retry_count?: number;
    timeout?: number;
    is_active?: boolean;
  }): Promise<Webhook> {
    const response = await this.client.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  /**
   * Удаление webhook'а
   */
  async deleteWebhook(webhookId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Активация webhook'а
   */
  async activateWebhook(webhookId: string): Promise<Webhook> {
    return await this.updateWebhook(webhookId, { is_active: true });
  }

  /**
   * Деактивация webhook'а
   */
  async deactivateWebhook(webhookId: string): Promise<Webhook> {
    return await this.updateWebhook(webhookId, { is_active: false });
  }

  /**
   * Тестирование webhook'а
   */
  async testWebhook(webhookId: string, data?: {
    event_type?: string;
    payload?: any;
  }): Promise<{
    success: boolean;
    response_code: number;
    response_body: string;
    duration: number;
    error_message?: string;
  }> {
    const response = await this.client.post(`/webhooks/${webhookId}/test`, data);
    return response.data;
  }

  /**
   * Получение событий webhook'а
   */
  async getWebhookEvents(webhookId?: string, params?: {
    status?: 'pending' | 'processing' | 'delivered' | 'failed';
    event_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    events: WebhookEvent[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get('/webhooks/events', {
      params: webhookId ? { webhook_id: webhookId, ...params } : params
    });
    return response.data;
  }

  /**
   * Повторная отправка события
   */
  async retryWebhookEvent(eventId: string): Promise<{
    success: boolean;
    message: string;
    next_retry_at?: string;
  }> {
    const response = await this.client.post(`/webhooks/events/${eventId}/retry`);
    return response.data;
  }

  /**
   * Получение логов webhook'ов
   */
  async getWebhookLogs(params?: {
    webhook_id?: string;
    status?: 'success' | 'failed';
    event_type?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    logs: WebhookLog[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get('/webhooks/logs', params);
    return response.data;
  }

  /**
   * Получение статистики webhook'ов
   */
  async getWebhookStats(params?: {
    webhook_id?: string;
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<{
    stats: {
      total_webhooks: number;
      active_webhooks: number;
      total_events: number;
      successful_deliveries: number;
      failed_deliveries: number;
      success_rate: number;
      average_response_time: number;
      events_by_type: Record<string, number>;
      events_by_status: Record<string, number>;
      daily_stats: Array<{
        date: string;
        events: number;
        successful: number;
        failed: number;
        success_rate: number;
      }>;
    };
  }> {
    const response = await this.client.get('/webhooks/stats', params);
    return response.data;
  }

  /**
   * Получение доступных типов событий
   */
  async getAvailableEventTypes(): Promise<{
    event_types: Array<{
      name: string;
      description: string;
      category: string;
      payload_schema: any;
    }>;
  }> {
    const response = await this.client.get('/webhooks/event-types');
    return response.data;
  }

  /**
   * Валидация URL webhook'а
   */
  async validateWebhookUrl(url: string): Promise<{
    valid: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    const response = await this.client.post('/webhooks/validate-url', { url });
    return response.data;
  }

  /**
   * Получение секрета webhook'а
   */
  async getWebhookSecret(webhookId: string): Promise<{
    secret: string;
    created_at: string;
  }> {
    const response = await this.client.get(`/webhooks/${webhookId}/secret`);
    return response.data;
  }

  /**
   * Ротация секрета webhook'а
   */
  async rotateWebhookSecret(webhookId: string): Promise<{
    new_secret: string;
    created_at: string;
  }> {
    const response = await this.client.post(`/webhooks/${webhookId}/rotate-secret`);
    return response.data;
  }

  /**
   * Получение шаблонов webhook'ов
   */
  async getWebhookTemplates(): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string;
      events: string[];
      payload_template: any;
      configuration: Record<string, any>;
    }>;
  }> {
    const response = await this.client.get('/webhooks/templates');
    return response.data;
  }

  /**
   * Создание webhook'а из шаблона
   */
  async createWebhookFromTemplate(templateId: string, data: {
    url: string;
    secret: string;
    configuration?: Record<string, any>;
  }): Promise<Webhook> {
    const response = await this.client.post(`/webhooks/templates/${templateId}/create`, data);
    return response.data;
  }

  /**
   * Массовое управление webhook'ами
   */
  async bulkUpdateWebhooks(webhookIds: string[], updates: {
    is_active?: boolean;
    retry_count?: number;
    timeout?: number;
  }): Promise<{
    updated_count: number;
    failed_count: number;
    updated_webhooks: string[];
    failed_webhooks: string[];
  }> {
    const response = await this.client.put('/webhooks/bulk', {
      webhook_ids: webhookIds,
      updates
    });
    return response.data;
  }

  /**
   * Массовое удаление webhook'ов
   */
  async bulkDeleteWebhooks(webhookIds: string[]): Promise<{
    deleted_count: number;
    failed_count: number;
    deleted_webhooks: string[];
    failed_webhooks: string[];
  }> {
    const response = await this.client.delete('/webhooks/bulk', {
      body: { webhook_ids: webhookIds }
    });
    return response.data;
  }

  /**
   * Получение уведомлений проекта
   */
  async getNotifications(projectId: number, params?: {
    channel?: string;
    status?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      channel: string;
      status: 'sent' | 'pending' | 'failed';
      recipient: string;
      metadata?: any;
      created_at: string;
      sent_at?: string;
    }>;
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get(`/notifications/projects/${projectId}/notifications`, params);
    return response.data;
  }
}



