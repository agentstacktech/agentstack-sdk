/**
 * AgentScheduler - Планировщик задач
 * Модуль для работы с планировщиком задач
 */

import { HTTPClient } from '../client/http-client';

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  task_type: 'http_request' | 'webhook' | 'script' | 'data_sync';
  schedule: string; // Cron expression
  payload: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_run?: string;
  next_run?: string;
  created_by: number;
  // Rules Engine integration - event generation
  event_trigger_key?: string;  // Unique key for triggering rules
  event_type?: string;  // Type of event to emit (e.g., "scheduler_task_completed")
  event_data_template?: Record<string, any>;  // Template for event data
}

export interface TaskExecution {
  id: string;
  task_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration?: number;
  result?: any;
  error_message?: string;
  logs: string[];
}

export interface TaskStats {
  total_tasks: number;
  active_tasks: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  average_execution_time: number;
  executions_by_hour: Array<{
    hour: string;
    count: number;
  }>;
}

export class AgentScheduler {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /**
   * Создание задачи
   */
  async createTask(task: {
    name: string;
    description?: string;
    task_type: 'http_request' | 'webhook' | 'script' | 'data_sync';
    schedule: string; // Cron expression
    payload: any;
    is_active?: boolean;
    // Rules Engine integration - event generation
    event_trigger_key?: string;  // Unique key for triggering rules
    event_type?: string;  // Type of event to emit (e.g., "scheduler_task_completed")
    event_data_template?: Record<string, any>;  // Template for event data
  }): Promise<ScheduledTask> {
    const response = await this.client.post('/scheduler/tasks', task);
    return response.data;
  }

  /**
   * Получение списка задач
   */
  async getTasks(params?: {
    is_active?: boolean;
    task_type?: string;
    limit?: number;
    offset?: number;
    project_id?: number;
  }): Promise<{
    tasks: ScheduledTask[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get('/scheduler/tasks', params);
    return response.data;
  }

  /**
   * Получение задачи по ID
   */
  async getTask(taskId: string): Promise<ScheduledTask> {
    const response = await this.client.get(`/scheduler/tasks/${taskId}`);
    return response.data;
  }

  /**
   * Обновление задачи
   */
  async updateTask(taskId: string, updates: {
    name?: string;
    description?: string;
    schedule?: string;
    payload?: any;
    is_active?: boolean;
  }, projectId?: number): Promise<ScheduledTask> {
    const project_id = projectId || this.client.getConfig().projectId;
    const response = await this.client.put(`/scheduler/tasks/${taskId}`, updates, { params: { project_id } });
    return response.data;
  }

  /**
   * Удаление задачи
   */
  async deleteTask(taskId: string, projectId?: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const project_id = projectId || this.client.getConfig().projectId;
    const response = await this.client.delete(`/scheduler/tasks/${taskId}`, { params: { project_id } });
    return response.data;
  }

  /**
   * Активация задачи
   */
  async activateTask(taskId: string): Promise<ScheduledTask> {
    return await this.updateTask(taskId, { is_active: true });
  }

  /**
   * Деактивация задачи
   */
  async deactivateTask(taskId: string): Promise<ScheduledTask> {
    return await this.updateTask(taskId, { is_active: false });
  }

  /**
   * Немедленное выполнение задачи
   */
  async executeTask(taskId: string, projectId?: number): Promise<{
    execution_id: string;
    status: 'started' | 'queued';
    message: string;
  }> {
    const project_id = projectId || this.client.getConfig().projectId;
    const response = await this.client.post(`/scheduler/tasks/${taskId}/execute`, {}, { params: { project_id } });
    return response.data;
  }

  /**
   * Получение выполнений задачи
   */
  async getTaskExecutions(taskId: string, params?: {
    status?: 'running' | 'completed' | 'failed' | 'cancelled';
    limit?: number;
    offset?: number;
  }): Promise<{
    executions: TaskExecution[];
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.get(`/scheduler/tasks/${taskId}/executions`, params);
    return response.data;
  }

  /**
   * Получение выполнения по ID
   */
  async getTaskExecution(executionId: string): Promise<TaskExecution> {
    const response = await this.client.get(`/scheduler/executions/${executionId}`);
    return response.data;
  }

  /**
   * Отмена выполнения задачи
   */
  async cancelTaskExecution(executionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.post(`/scheduler/executions/${executionId}/cancel`);
    return response.data;
  }

  /**
   * Получение статистики задач
   */
  async getTaskStats(params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<TaskStats> {
    const response = await this.client.get('/scheduler/stats', params);
    return response.data;
  }

  /**
   * Получение логов выполнения
   */
  async getExecutionLogs(executionId: string): Promise<{
    logs: Array<{
      timestamp: string;
      level: 'info' | 'warn' | 'error';
      message: string;
    }>;
  }> {
    const response = await this.client.get(`/scheduler/executions/${executionId}/logs`);
    return response.data;
  }

  /**
   * Получение статуса планировщика
   */
  async getSchedulerStatus(): Promise<{
    status: 'running' | 'stopped' | 'maintenance';
    uptime: number;
    active_workers: number;
    queue_size: number;
    next_execution?: string;
    last_heartbeat: string;
  }> {
    const response = await this.client.get('/scheduler/status');
    return response.data;
  }

  /**
   * Валидация cron выражения
   */
  async validateCronExpression(expression: string): Promise<{
    valid: boolean;
    error?: string;
    next_runs?: string[];
    description?: string;
  }> {
    const response = await this.client.post('/scheduler/validate-cron', {
      expression
    });
    return response.data;
  }

  /**
   * Получение шаблонов задач
   */
  async getTaskTemplates(): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string;
      task_type: string;
      payload_template: any;
      schedule_suggestions: string[];
    }>;
  }> {
    const response = await this.client.get('/scheduler/templates');
    return response.data;
  }

  /**
   * Создание задачи из шаблона
   */
  async createTaskFromTemplate(templateId: string, data: {
    name: string;
    description?: string;
    schedule: string;
    payload: any;
  }): Promise<ScheduledTask> {
    const response = await this.client.post(`/scheduler/templates/${templateId}/create`, data);
    return response.data;
  }

  /**
   * Массовое управление задачами
   */
  async bulkUpdateTasks(taskIds: string[], updates: {
    is_active?: boolean;
    schedule?: string;
  }): Promise<{
    updated_count: number;
    failed_count: number;
    updated_tasks: string[];
    failed_tasks: string[];
  }> {
    const response = await this.client.put('/scheduler/bulk', {
      task_ids: taskIds,
      updates
    });
    return response.data;
  }

  /**
   * Массовое удаление задач
   */
  async bulkDeleteTasks(taskIds: string[]): Promise<{
    deleted_count: number;
    failed_count: number;
    deleted_tasks: string[];
    failed_tasks: string[];
  }> {
    const response = await this.client.delete('/scheduler/bulk', {
      body: { task_ids: taskIds }
    });
    return response.data;
  }

  /**
   * Получение очереди выполнения
   */
  async getExecutionQueue(): Promise<{
    queue: Array<{
      task_id: string;
      task_name: string;
      scheduled_at: string;
      priority: number;
      attempts: number;
    }>;
    queue_size: number;
    estimated_wait_time: number;
  }> {
    const response = await this.client.get('/scheduler/queue');
    return response.data;
  }

  /**
   * Очистка старых выполнений
   */
  async cleanupExecutions(params?: {
    older_than_days?: number;
    status?: 'completed' | 'failed' | 'cancelled';
  }): Promise<{
    cleaned_count: number;
    message: string;
  }> {
    const response = await this.client.post('/scheduler/cleanup', params);
    return response.data;
  }
}



