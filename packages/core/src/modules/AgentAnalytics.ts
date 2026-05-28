/**
 * AgentAnalytics - Аналитика и метрики
 * Модуль для работы с аналитикой и метриками системы
 */

import { HTTPClient } from '../client/http-client';
import { AgentsFleet } from './AgentsFleet';

export interface AnalyticsEvent {
  type: string;
  user_id?: number;
  project_id?: number;
  data?: Record<string, any>;
  timestamp?: string;
}

export interface DashboardMetrics {
  total_revenue: {
    value: number;
    change_percentage: number;
    period: string;
  };
  total_transactions: {
    value: number;
    change_percentage: number;
    period: string;
  };
  success_rate: {
    value: number;
    change_percentage: number;
    period: string;
  };
  active_customers: {
    value: number;
    change_percentage: number;
    period: string;
  };
}

export interface UsageStats {
  api_calls: {
    total: number;
    successful: number;
    failed: number;
    by_endpoint: Record<string, number>;
    by_hour: Array<{ hour: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    new_today: number;
    by_project: Array<{ project_id: number; count: number }>;
  };
  performance: {
    average_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
    error_rate: number;
  };
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  query: string;
  parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_run?: string;
}

export class AgentAnalytics {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /**
   * Отправка события аналитики
   */
  async trackEvent(event: AnalyticsEvent): Promise<{
    success: boolean;
    event_id: string;
    timestamp: string;
  }> {
    // Get project_id from config (stored in HTTPClient config)
    const projectId = (this.client as any).config?.projectId || 0;
    
    // Backend expects event_data in body, project_id in X-Project-ID header
    // Send the entire event as event_data
    const response = await this.client.post('/analytics/events', event, {
      headers: { 'X-Project-ID': projectId.toString() }
    });
    return response.data;
  }

  /**
   * Получение метрик дашборда
   */
  async getDashboardMetrics(params?: {
    project_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<DashboardMetrics> {
    // Get project_id from config (stored in HTTPClient config)
    const projectId = (this.client as any).config?.projectId || 0;
    const requestParams = {
      project_id: params?.project_id || projectId,
      period: params?.period || 'week'
    };
    const response = await this.client.get('/analytics/dashboard', requestParams);
    return response.data;
  }

  /**
   * Получение статистики использования API
   */
  async getUsageStats(params?: {
    project_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<UsageStats> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/usage', params);
    return response.data;
  }

  /**
   * Получение статистики платежей
   */
  async getPaymentStats(params?: {
    merchant_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_amount: number;
    total_transactions: number;
    success_rate: number;
    average_amount: number;
    currency_breakdown: Record<string, {
      amount: number;
      transactions: number;
    }>;
    status_breakdown: Record<string, number>;
    daily_stats: Array<{
      date: string;
      amount: number;
      transactions: number;
      success_rate: number;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/payments/stats', params);
    return response.data;
  }

  /**
   * Получение статистики пользователей
   */
  async getUserStats(params?: {
    project_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<{
    total_users: number;
    active_users: number;
    new_users: number;
    retention_rate: number;
    user_growth: Array<{
      date: string;
      new_users: number;
      active_users: number;
    }>;
    user_activity: Array<{
      date: string;
      logins: number;
      api_calls: number;
      unique_users: number;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/users/stats', params);
    return response.data;
  }

  /**
   * Получение статистики проектов
   */
  async getProjectStats(projectId?: number): Promise<{
    total_projects: number;
    active_projects: number;
    project_details: Array<{
      id: number;
      name: string;
      users_count: number;
      api_calls: number;
      last_activity: string;
      revenue: number;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const params = projectId ? { project_id: projectId } : undefined;
    const response = await this.client.get('/analytics/projects/stats', params);
    return response.data;
  }

  /**
   * Получение топ событий
   */
  async getTopEvents(params?: {
    project_id?: number;
    limit?: number;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<{
    events: Array<{
      event_type: string;
      count: number;
      unique_users: number;
      percentage: number;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/events/top', params);
    return response.data;
  }

  /**
   * Получение воронки конверсии
   */
  async getConversionFunnel(params?: {
    project_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
    steps?: string[];
  }): Promise<{
    funnel: Array<{
      step: string;
      users: number;
      conversion_rate: number;
      drop_off_rate: number;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/funnel', params);
    return response.data;
  }

  /**
   * Создание кастомного отчета
   */
  async createCustomReport(report: {
    name: string;
    description: string;
    query: string;
    parameters?: Record<string, any>;
  }): Promise<{
    report_id: string;
    name: string;
    status: 'created' | 'processing';
  }> {
    const response = await this.client.post('/analytics/reports', report);
    return response.data;
  }

  /**
   * Получение кастомных отчетов
   */
  async getCustomReports(): Promise<{
    reports: CustomReport[];
  }> {
    const response = await this.client.get('/analytics/reports');
    return response.data;
  }

  /**
   * Выполнение кастомного отчета
   */
  async runCustomReport(reportId: string, parameters?: Record<string, any>): Promise<{
    report_id: string;
    status: 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    execution_time?: number;
  }> {
    const response = await this.client.post(`/analytics/reports/${reportId}/run`, {
      parameters
    });
    return response.data;
  }

  /**
   * Получение результата отчета
   */
  async getReportResult(reportId: string): Promise<{
    report_id: string;
    status: 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    executed_at: string;
    execution_time: number;
  }> {
    const response = await this.client.get(`/analytics/reports/${reportId}/result`);
    return response.data;
  }

  /**
   * Удаление кастомного отчета
   */
  async deleteCustomReport(reportId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/analytics/reports/${reportId}`);
    return response.data;
  }

  /**
   * Экспорт данных аналитики
   */
  async exportAnalytics(data: {
    format: 'csv' | 'json' | 'xlsx';
    type: 'dashboard' | 'usage' | 'payments' | 'users' | 'custom';
    parameters?: Record<string, any>;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<{
    export_id: string;
    status: 'processing' | 'completed' | 'failed';
    download_url?: string;
    expires_at?: string;
  }> {
    const response = await this.client.post('/analytics/export', data);
    return response.data;
  }

  /**
   * Получение статуса экспорта
   */
  async getExportStatus(exportId: string): Promise<{
    export_id: string;
    status: 'processing' | 'completed' | 'failed';
    download_url?: string;
    expires_at?: string;
    file_size?: number;
    error?: string;
  }> {
    const response = await this.client.get(`/analytics/export/${exportId}`);
    return response.data;
  }

  /**
   * Получение реального времени метрик
   */
  async getRealTimeMetrics(project_id?: number): Promise<{
    active_users: number;
    api_calls_per_minute: number;
    response_time_avg: number;
    error_rate: number;
    last_updated: string;
  }> {
    // Get project_id from config (stored in HTTPClient config)
    const defaultProjectId = (this.client as any).config?.projectId || 0;
    const projectId = project_id || defaultProjectId;
    // Pass params directly, not wrapped in object - fix for params=%7B%22project_id%22%3A1%7D issue
    const response = await this.client.get('/analytics/realtime', projectId ? { project_id: projectId } : undefined);
    return response.data;
  }

  /**
   * Получение алертов и уведомлений
   */
  async getAlerts(params?: {
    status?: 'active' | 'resolved';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
  }): Promise<{
    alerts: Array<{
      id: string;
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      status: 'active' | 'resolved';
      created_at: string;
      resolved_at?: string;
      metadata?: any;
    }>;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get('/analytics/alerts', params);
    return response.data;
  }

  /**
   * Создание алерта
   */
  async createAlert(alert: {
    type: string;
    condition: string;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notification_channels: string[];
  }): Promise<{
    alert_id: string;
    status: 'created' | 'active';
  }> {
    const response = await this.client.post('/analytics/alerts', alert);
    return response.data;
  }

  /**
   * Создание метрики
   */
  async createMetric(projectId: number, metric: {
    name: string;
    description?: string;
    type: 'counter' | 'gauge' | 'histogram' | 'summary';
  }): Promise<{
    metric_id: string;
    name: string;
    type: string;
    status: 'created' | 'active';
    created_at: string;
  }> {
    const response = await this.client.post(`/analytics/projects/${projectId}/metrics`, metric);
    return response.data;
  }

  /**
   * Получение метрик проекта
   */
  async getMetrics(projectId: number, params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<{
    metrics: Array<{
      id: string;
      name: string;
      description?: string;
      type: string;
      value: number;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    const response = await this.client.get(`/analytics/projects/${projectId}/metrics`, params);
    return response.data;
  }

  /**
   * Получение всех метрик (для системной экосистемы AgentStack)
   */
  async getAllMetrics(params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<{
    metrics: Array<{
      id: string;
      name: string;
      description?: string;
      type: string;
      value: number;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
  }> {
    // Используем проект 1 - системная экосистема AgentStack
    return this.getMetrics(1, params);
  }

  /**
   * Обновление метрики
   */
  async updateMetric(metricId: string, updates: {
    name?: string;
    description?: string;
    type?: 'counter' | 'gauge' | 'histogram' | 'summary';
  }): Promise<{
    metric_id: string;
    name: string;
    type: string;
    status: 'updated';
    updated_at: string;
  }> {
    const response = await this.client.put(`/analytics/metrics/${metricId}`, updates);
    return response.data;
  }

  /**
   * Удаление метрики
   */
  async deleteMetric(metricId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/analytics/metrics/${metricId}`);
    return response.data;
  }

  /**
   * Получение списка агентов
   */
  async getAgentsList(params?: {
    project_id?: number;
    status?: 'active' | 'inactive' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{
    agents: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      last_active: string;
      project_id: number;
    }>;
    total: number;
  }> {
    // Get project_id from config (stored in HTTPClient config)
    const defaultProjectId = (this.client as any).config?.projectId || 0;
    const projectId = params?.project_id || defaultProjectId;
    const fleet = new AgentsFleet(this.client);
    const raw = await fleet.list(projectId);
    const rows = raw.agents || [];
    return {
      agents: rows.map((a) => ({
        id: String(a.uuid),
        name: String(a.agent_spec?.name ?? 'Agent'),
        type: 'fleet',
        status: String(a.agent_spec?.state ?? 'draft'),
        last_active: String(a.updated_at ?? ''),
        project_id: Number(a.project_id ?? projectId),
      })),
      total: rows.length,
    };
  }

  /**
   * Получение данных для графика выручки
   */
  async getRevenueChart(params?: {
    project_id?: number;
    period?: '7d' | '30d' | '90d';
    start_date?: string;
    end_date?: string;
  }): Promise<{
    daily: Array<{
      date: string;
      amount: number;
    }>;
    monthly: Array<{
      month: string;
      amount: number;
    }>;
    total: number;
  }> {
    // Get project_id from config (stored in HTTPClient config)
    const defaultProjectId = (this.client as any).config?.projectId || 0;
    const projectId = params?.project_id || defaultProjectId;
    const requestParams = {
      project_id: projectId,
      period: params?.period || '30d',
      ...(params?.start_date && { start_date: params.start_date }),
      ...(params?.end_date && { end_date: params.end_date })
    };
    
    try {
      // Try to get revenue data from analytics stats
      const response = await this.client.get('/analytics/stats', requestParams);
      const stats = response.data;
      
      // Transform stats to revenue chart format
      // If daily stats are available, use them; otherwise generate from total
      const daily = stats.daily_revenue || [];
      const monthly = stats.monthly_revenue || [];
      
      return {
        daily: daily.length > 0 ? daily : this._generateDefaultDailyData(params?.period || '30d'),
        monthly: monthly.length > 0 ? monthly : [],
        total: stats.total_revenue || 0
      };
    } catch (error) {
      // Return default empty data if endpoint fails
      return {
        daily: this._generateDefaultDailyData(params?.period || '30d'),
        monthly: [],
        total: 0
      };
    }
  }

  /**
   * Генерация данных по умолчанию для графика выручки
   */
  private _generateDefaultDailyData(period: '7d' | '30d' | '90d'): Array<{ date: string; amount: number }> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const data: Array<{ date: string; amount: number }> = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        amount: 0
      });
    }
    
    return data;
  }

  /**
   * Обновление статуса агента
   */
  async updateAgentStatus(agentId: string, status: 'active' | 'inactive' | 'pending'): Promise<{
    success: boolean;
    agent_id: string;
    status: string;
    message?: string;
  }> {
    const defaultProjectId = (this.client as any).config?.projectId || 0;
    const fleet = new AgentsFleet(this.client);
    const res = await fleet.get(defaultProjectId, agentId);
    const agent = res.agent;
    const spec = { ...(agent?.agent_spec || {}) };
    const map: Record<string, string> = { active: 'live', inactive: 'archived', pending: 'draft' };
    spec.state = map[status] || 'draft';
    await fleet.update(defaultProjectId, agentId, spec);
    return {
      success: true,
      agent_id: agentId,
      status,
    };
  }
}





