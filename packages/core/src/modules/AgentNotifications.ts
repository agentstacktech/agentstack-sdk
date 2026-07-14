/**
 * AgentNotifications - Уведомления
 * Модуль для работы с уведомлениями системы
 *
 * {@link AgentWebPush} — браузерные Web Push подписки (`/api/push/*`), доступны как `sdk.webPush` и `sdk.notifications.webPush`.
 */

import { HTTPClient } from '../client/http-client';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';
import type { APIResponse } from '../types';
import { AgentWebPush, type PushSubscriptionJSON } from './AgentWebPush';

export interface Notification {
  id: string;
  user_id: number;
  project_id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  channel: 'email' | 'push' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  read_at?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string;
  title: string;
  message: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  in_app: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface CreateNotificationData {
  user_id: number;
  project_id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  channel: 'email' | 'push' | 'sms' | 'in_app';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export class AgentNotifications {
  /** Browser Web Push (VAPID); same instance as `sdk.webPush` when constructed from SDK. */
  public readonly webPush: AgentWebPush;

  constructor(client: HTTPClient, webPush?: AgentWebPush) {
    this.client = client;
    this.webPush = webPush ?? new AgentWebPush(client);
  }

  private client: HTTPClient;

  /**
   * Получение уведомлений
   */
  async getNotifications(projectId: number, params?: {
    user_id?: number;
    type?: string;
    channel?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: Notification[];
    total: number;
    unread_count: number;
  }> {
    const response = await this.client.get(`/notifications/${projectId}/`, params);
    return response.data;
  }

  /**
   * Получение всех уведомлений (для системной экосистемы AgentStack)
   */
  async getAllNotifications(params?: {
    user_id?: number;
    type?: string;
    channel?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: Notification[];
    total: number;
    unread_count: number;
  }> {
    // Используем проект 1 - системная экосистема AgentStack
    return this.getNotifications(1, params);
  }

  /**
   * Создание уведомления
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const response = await this.client.post(`/notifications/${data.project_id}/`, data);
    return response.data;
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await this.client.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  /** Mark project inbox row read (B50). */
  async markProjectNotificationAsRead(
    projectId: number,
    notificationId: string,
  ): Promise<Notification> {
    const id = encodeURIComponent(String(notificationId));
    const response = await this.client.patch(`/notifications/${projectId}/${id}/read`, {});
    return response.data;
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  async markAllAsRead(projectId: number, userId?: number): Promise<{
    updated_count: number;
    message: string;
  }> {
    const response = await this.client.patch(`/notifications/${projectId}/read-all`, {});
    const data = response.data as { updated_count?: number; message?: string };
    return {
      updated_count: Number(data.updated_count ?? 0),
      message: data.message ?? 'Marked notifications as read',
    };
  }

  /**
   * Удаление уведомления
   */
  async deleteNotification(notificationId: string): Promise<{
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/notifications/${notificationId}`)).data,
      { message: 'Notification already removed' }
    );
  }

  /**
   * Получение настроек уведомлений пользователя
   */
  async getNotificationSettings(userId: number): Promise<NotificationSettings> {
    const response = await this.client.get(`/notifications/users/${userId}/settings`);
    return response.data;
  }

  /**
   * Обновление настроек уведомлений
   */
  async updateNotificationSettings(userId: number, settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await this.client.put(`/notifications/users/${userId}/settings`, settings);
    return response.data;
  }

  /**
   * Получение шаблонов уведомлений
   */
  async getNotificationTemplates(projectId: number): Promise<{
    templates: NotificationTemplate[];
    total: number;
  }> {
    const response = await this.client.get(`/notifications/${projectId}/templates`);
    return response.data;
  }

  /**
   * Создание шаблона уведомления
   */
  async createNotificationTemplate(projectId: number, template: {
    name: string;
    type: string;
    channel: string;
    subject?: string;
    title: string;
    message: string;
    variables: string[];
  }): Promise<NotificationTemplate> {
    const response = await this.client.post(`/notifications/${projectId}/templates`, template);
    return response.data;
  }

  /**
   * Обновление шаблона уведомления
   */
  async updateNotificationTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await this.client.put(`/notifications/templates/${templateId}`, updates);
    return response.data;
  }

  /**
   * Удаление шаблона уведомления
   */
  async deleteNotificationTemplate(templateId: string): Promise<{
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/notifications/templates/${templateId}`)).data,
      { message: 'Template already removed' }
    );
  }

  /**
   * Отправка уведомления по шаблону
   */
  async sendNotificationFromTemplate(templateId: string, data: {
    user_id: number;
    project_id: number;
    variables: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<Notification> {
    const response = await this.client.post(`/notifications/templates/${templateId}/send`, data);
    return response.data;
  }

  /**
   * Получение статистики уведомлений
   */
  async getNotificationStats(projectId: number, params?: {
    start_date?: string;
    end_date?: string;
    channel?: string;
    type?: string;
  }): Promise<{
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    delivery_rate: number;
    by_channel: Record<string, number>;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const response = await this.client.get(`/notifications/${projectId}/stats`, params);
    return response.data;
  }

  /**
   * Получение логов уведомлений
   */
  async getNotificationLogs(projectId: number, params?: {
    user_id?: number;
    channel?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      notification_id: string;
      user_id: number;
      channel: string;
      status: string;
      error_message?: string;
      sent_at: string;
      delivered_at?: string;
    }>;
    total: number;
  }> {
    const response = await this.client.get(`/notifications/${projectId}/logs`, params);
    return response.data;
  }

  /**
   * Тестирование уведомления
   */
  async testNotification(data: {
    user_id: number;
    project_id: number;
    channel: 'email' | 'push' | 'sms' | 'in_app';
    test_data: Record<string, any>;
  }): Promise<{
    success: boolean;
    message: string;
    test_id: string;
  }> {
    const response = await this.client.post('/notifications/test', data);
    return response.data;
  }

  /**
   * Массовая отправка уведомлений
   */
  async bulkSendNotifications(data: {
    project_id: number;
    user_ids: number[];
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    channel: 'email' | 'push' | 'sms' | 'in_app';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: Record<string, any>;
  }): Promise<{
    sent_count: number;
    failed_count: number;
    batch_id: string;
    message: string;
  }> {
    const response = await this.client.post('/notifications/bulk-send', data);
    return response.data;
  }

  /**
   * Получение статуса массовой отправки
   */
  /** @see POST /api/push/subscribe — same as {@link AgentWebPush.registerSubscription} */
  async subscribePush(
    body: { subscription: PushSubscriptionJSON; user_agent?: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ) {
    return this.webPush.registerSubscription(body, opts);
  }

  /** @see POST /api/push/notify */
  async sendPush(
    body: {
      user_id: number;
      title: string;
      body?: string;
      url?: string;
      image?: string;
      tag?: string;
      actions?: Record<string, unknown>[];
      badge_count?: number;
      correlation_key?: string;
    },
    opts?: Parameters<HTTPClient['post']>[2]
  ) {
    return this.client.post('/api/push/notify', body, opts);
  }

  /** @see messenger prefs for push toggles */
  async listPushPrefs(opts?: Parameters<HTTPClient['get']>[2]) {
    return this.client.get('/api/social/messenger/prefs', undefined, opts);
  }

  async updatePushPrefs(
    body: Record<string, unknown>,
    opts?: Parameters<HTTPClient['put']>[2]
  ) {
    return this.client.put('/api/social/messenger/prefs', body, opts);
  }

  /**
   * Persist a logical push category under user messenger prefs (`push_notification_categories`).
   * @see PUT /api/social/messenger/prefs
   */
  async registerCategory(
    args: { id: string; title: string; default_prefs?: Record<string, unknown> },
    opts?: Parameters<HTTPClient['put']>[2]
  ): Promise<APIResponse<Record<string, unknown>>> {
    const id = String(args.id || '').trim();
    const title = String(args.title || '').trim();
    if (!id || !title) {
      throw new Error('registerCategory: id and title are required');
    }
    return this.client.put(
      '/api/social/messenger/prefs',
      {
        push_notification_categories: {
          [id]: { title, default_prefs: args.default_prefs ?? {} },
        },
      },
      opts
    );
  }

  /** Remove pending outbox web-push items for the session user by exact correlation_key. */
  async cancelPush(
    body: { correlation_key: string },
    opts?: Parameters<HTTPClient['post']>[2]
  ) {
    return this.client.post('/api/push/cancel', body, opts);
  }

  async getBulkSendStatus(batchId: string): Promise<{
    batch_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    sent_count: number;
    failed_count: number;
    total_count: number;
    created_at: string;
    completed_at?: string;
    error_message?: string;
  }> {
    const response = await this.client.get(`/notifications/bulk-send/${batchId}/status`);
    return response.data;
  }
}



