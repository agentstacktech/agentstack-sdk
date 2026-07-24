/**
 * AgentLogic - Logic Engine
 * Модуль для работы с логикой бизнес-правил (JSON Logic Engine)
 * Philosophy: v0.2.1: 8DNA Architecture + Minimal API
 */

import { HTTPClient } from '../client/http-client';

export interface Logic {
  id: string;
  name: string;
  description?: string;
  do?: Array<{
    processor: string;
    action: string;
    parameters: Record<string, any>;
  }>;
  triggers?: Array<any>;
  commands?: Array<CommandHandler>;  // NEW: Command handlers
  config: {
    enabled: boolean;
    priority: number;
    tags?: string[];
  };
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CommandHandler {
  trigger: string;  // e.g., "check.daily_reward" or "action.*" (wildcard)
  do: Array<{
    processor: string;
    action: string;
    parameters: Record<string, any>;
  }>;
  when?: Record<string, any>;  // Optional condition
}

export interface LogicTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  category: string;
  json_rules: {
    when: Record<string, any>;
    do: Array<{
      processor: string;
      action: string;
      parameters: Record<string, any>;
    }>;
  };
  tags: string[];
}

export interface CreateLogicRequest {
  name: string;
  description?: string;
  /** @deprecated Prefer triggers/space (RuleDocumentV1). */
  json_rules?: {
    when: Record<string, any>;
    do: Array<{
      processor: string;
      action: string;
      parameters: Record<string, any>;
    }>;
  };
  triggers?: Array<Record<string, any>>;
  schedulers?: Array<Record<string, any>>;
  space?: Array<Record<string, any>>;
  editor_metadata?: Record<string, any>;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateLogicRequest {
  name?: string;
  description?: string;
  json_rules?: {
    when: Record<string, any>;
    do: Array<{
      processor: string;
      action: string;
      parameters: Record<string, any>;
    }>;
  };
  triggers?: Array<Record<string, any>>;
  schedulers?: Array<Record<string, any>>;
  space?: Array<Record<string, any>>;
  editor_metadata?: Record<string, any>;
  enabled?: boolean;
  priority?: number;
  /** PathAtom patches (`space{uid}.*`) — server `logic_path_atom_updates`. */
  path_updates?: Record<string, unknown>;
}

export interface ExecuteLogicRequest {
  event_data: Record<string, any>;
  context?: Record<string, any>;
  json_logic?: Record<string, any>;  // КРИТИЧЕСКИ ВАЖНО: Опциональная актуальная логика из nodes
}

export interface ExecuteLogicResponse {
  success: boolean;
  logic_id: string;
  result?: {
    condition_met?: boolean;
    actions_executed?: Array<{
      processor: string;
      success: boolean;
      result?: any;
      error?: string;
    }>;
    execution_time_ms?: number;
    execution_trace?: Record<string, any>; // КРИТИЧЕСКИ ВАЖНО: Трассировка выполнения всех блоков
    blocks_executed?: number; // Количество выполненных блоков
    [key: string]: any; // Дополнительные поля результата
  };
  execution_id?: string;
  execution_time_ms?: number;
  error?: string;
  message?: string;
}

export interface LogicExecution {
  id: string;
  rule_id: string;
  executed_at: string;
  executed_by: number;
  input_data: Record<string, any>;
  result?: any;
  success: boolean;
  error?: string;
  execution_time_ms?: number;
}

export interface SuggestedParams {
  success: boolean;
  rule_id: string;
  suggested_params: Record<string, any>;
  last_executed_at?: string;
  message?: string;
}

export class AgentLogic {
  constructor(private client: HTTPClient) {}

  /**
   * Создание нового правила
   */
  async createLogic(data: CreateLogicRequest): Promise<{
    success: boolean;
    logic: Logic;
  }> {
    const response = await this.client.post('/logic', data);
    return response.data;
  }

  /**
   * Получение списка правил
   */
  async getRules(params?: {
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    logic: Logic[];
    count: number;
  }> {
    const response = await this.client.get('/logic', params);
    return response.data;
  }

  /**
   * Получение логики по ID
   */
  async getLogicById(logicId: string): Promise<{
    success: boolean;
    logic: Logic;
  }> {
    const response = await this.client.get(`/logic/${logicId}`);
    return response.data;
  }

  /**
   * Обновление правила
   */
  async updateLogic(logicId: string, data: UpdateLogicRequest): Promise<{
    success: boolean;
    logic: Logic;
    message: string;
  }> {
    // Validate logicId
    if (!logicId || logicId.trim() === '' || logicId === '/') {
      throw new Error('Invalid logicId: logicId cannot be empty');
    }
    // Remove leading/trailing slashes
    const cleanLogicId = logicId.replace(/^\/+|\/+$/g, '');
    if (!cleanLogicId) {
      throw new Error('Invalid logicId: logicId cannot be empty after cleaning');
    }
    const response = await this.client.put(`/logic/${cleanLogicId}`, data);
    return response.data;
  }

  /**
   * Удаление правила
   */
  async deleteLogic(logicId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/logic/${logicId}`);
    return response.data;
  }

  /**
   * Выполнение правила
   */
  async executeLogic(logicId: string, data: ExecuteLogicRequest): Promise<ExecuteLogicResponse> {
    const response = await this.client.post(`/logic/${logicId}/execute`, data);
    return response.data;
  }

  /**
   * Получение шаблонов правил
   */
  async getTemplates(params?: {
    project_type?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<LogicTemplate[]> {
    const response = await this.client.get('/logic/templates', params);
    // Endpoint возвращает { success: true, templates: [...], count: ..., filters: {...} }
    // Нужно вернуть массив templates
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && response.data.templates && Array.isArray(response.data.templates)) {
      return response.data.templates;
    }
    // Fallback: возвращаем пустой массив, если формат неожиданный
    return [];
  }

  /**
   * Получение шаблона по ID
   */
  async getTemplate(templateId: string): Promise<LogicTemplate> {
    const response = await this.client.get(`/logic/templates/${templateId}`);
    return response.data;
  }

  /**
   * Создание правила из шаблона
   */
  async createRuleFromTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
      enabled?: boolean;
      priority?: number;
      context?: Record<string, any>;
      projectId: number;
      fieldValues?: Record<string, any>;
    },
  ): Promise<{
    success: boolean;
    logic: Logic;
  }> {
    const installed = await this.installBlueprint(data.projectId, templateId, {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      priority: data.priority,
      fieldValues: data.fieldValues ?? data.context,
    });
    return { success: true, logic: installed.logic };
  }

  async listBlueprints(params?: {
    project_type?: string;
    category?: string;
    kind?: string;
  }): Promise<{ blueprints: LogicTemplate[]; structures: Array<Record<string, unknown>> }> {
    const response = await this.client.get('/logic/blueprints', params);
    const body = response.data as {
      blueprints?: LogicTemplate[];
      structures?: Array<Record<string, unknown>>;
    };
    return {
      blueprints: body.blueprints ?? [],
      structures: body.structures ?? [],
    };
  }

  async getBlueprint(blueprintId: string): Promise<LogicTemplate> {
    const response = await this.client.get(`/logic/blueprints/${blueprintId}`);
    const body = response.data as { blueprint?: LogicTemplate };
    if (!body.blueprint) {
      throw new Error('Blueprint not found');
    }
    return body.blueprint;
  }

  async previewBlueprint(
    projectId: number,
    blueprintId: string,
    fieldValues?: Record<string, any>,
  ): Promise<{ valid: boolean; errors: string[]; document?: Record<string, unknown> }> {
    const response = await this.client.post(`/logic/projects/${projectId}/preview-blueprint`, {
      blueprint_id: blueprintId,
      field_values: fieldValues ?? {},
    });
    return response.data;
  }

  async installBlueprint(
    projectId: number,
    blueprintId: string,
    draft: {
      name?: string;
      description?: string;
      enabled?: boolean;
      priority?: number;
      fieldValues?: Record<string, any>;
    },
  ): Promise<{
    success: boolean;
    logic: Logic;
    blueprint_id?: string;
    integration_hints?: string[];
  }> {
    const response = await this.client.post(`/logic/projects/${projectId}/install-blueprint`, {
      blueprint_id: blueprintId,
      name: draft.name,
      description: draft.description,
      enabled: draft.enabled ?? true,
      priority: draft.priority ?? 5,
      field_values: draft.fieldValues ?? {},
    });
    const body = response.data as {
      logic: Logic;
      blueprint_id?: string;
      integration_hints?: string[];
    };
    return {
      success: true,
      logic: body.logic,
      blueprint_id: body.blueprint_id,
      integration_hints: body.integration_hints,
    };
  }

  async installStructure(
    projectId: number,
    structureId: string,
    fieldValues?: Record<string, any>,
    enabled = true,
    options?: { idempotencyKey?: string },
  ): Promise<{ structure_id: string; logic_ids: string[]; integration_hints?: string[] }> {
    const response = await this.client.post(
      `/logic/projects/${projectId}/install-structure`,
      {
        structure_id: structureId,
        field_values: fieldValues ?? {},
        enabled,
      },
      options?.idempotencyKey
        ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
        : undefined,
    );
    return response.data;
  }

  /**
   * Получение истории выполнения правила
   */
  async getExecutionHistory(logicId: string, limit: number = 10): Promise<LogicExecution[]> {
    const response = await this.client.get(`/logic/${logicId}/executions`, { limit });
    if (response.data && response.data.executions) {
      return response.data.executions;
    }
    return [];
  }

  /** Alias for run console UI (`frontend.logic.run_console.gen1`). */
  async listExecutions(logicId: string, limit: number = 10): Promise<LogicExecution[]> {
    return this.getExecutionHistory(logicId, limit);
  }

  /**
   * Batch recent executions for up to 20 rules (single request).
   */
  async getRecentExecutionsBatch(
    projectId: number,
    logicIds: string[],
    limitPerRule: number = 1,
  ): Promise<{
    success: boolean;
    project_id: number;
    executions_by_rule: Record<string, LogicExecution[]>;
    logic_ids: string[];
  }> {
    const response = await this.client.get(
      `/projects/${projectId}/logic/executions/recent`,
      {
        ids: logicIds.slice(0, 20).join(','),
        limit: limitPerRule,
      },
    );
    return response.data;
  }

  /** Dry-run alias for simulate UI (`frontend.logic.run_console.gen1`). */
  async dryRun(logicId: string, data: ExecuteLogicRequest): Promise<ExecuteLogicResponse> {
    return this.executeLogic(logicId, {
      ...data,
      context: { ...(data.context ?? {}), dry_run: true },
    });
  }

  /**
   * Получение scheduler блоков правила
   */
  async getSchedulers(ruleId: string): Promise<{
    success: boolean;
    schedulers: any[];
  }> {
    const response = await this.client.get(`/logic/${ruleId}/schedulers`);
    return response.data;
  }

  /**
   * Создание scheduler блока для правила
   */
  async createScheduler(ruleId: string, data: {
    schedule: {
      interval?: string;
      specific_times?: string[];
      min_interval_seconds?: number;
    };
    next?: any;
  }): Promise<{
    success: boolean;
    scheduler: any;
  }> {
    const response = await this.client.post(`/logic/${ruleId}/schedulers`, data);
    return response.data;
  }

  /**
   * Обновление scheduler блока
   */
  async updateScheduler(
    ruleId: string,
    schedulerId: string,
    data: {
      schedule?: {
        interval?: string;
        specific_times?: string[];
        min_interval_seconds?: number;
      };
      next?: any;
    }
  ): Promise<{
    success: boolean;
    scheduler: any;
  }> {
    const response = await this.client.put(`/logic/${ruleId}/schedulers/${schedulerId}`, data);
    return response.data;
  }

  /**
   * Удаление scheduler блока
   */
  async deleteScheduler(ruleId: string, schedulerId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/logic/${ruleId}/schedulers/${schedulerId}`);
    return response.data;
  }

  /**
   * Получение предложенных параметров на основе последнего успешного выполнения
   */
  async getSuggestedParams(ruleId: string): Promise<SuggestedParams> {
    const response = await this.client.get(`/logic/${ruleId}/suggest-params`);
    return response.data;
  }

  /**
   * Включение/выключение логики
   */
  async toggleLogic(logicId: string, enabled: boolean): Promise<{
    success: boolean;
    logic: Logic;
    message: string;
  }> {
    return await this.updateLogic(logicId, { enabled });
  }

  /**
   * Массовое обновление правил
   */
  async bulkUpdateLogic(logicIds: string[], updates: {
    enabled?: boolean;
    priority?: number;
  }): Promise<{
    updated_count: number;
    failed_count: number;
    updated_logic: string[];
    failed_logic: string[];
  }> {
    const results = {
      updated_count: 0,
      failed_count: 0,
      updated_logic: [] as string[],
      failed_logic: [] as string[]
    };

    for (const logicId of logicIds) {
      try {
        await this.updateLogic(logicId, updates);
        results.updated_count++;
        results.updated_logic.push(logicId);
      } catch (error) {
        results.failed_count++;
        results.failed_logic.push(logicId);
      }
    }

    return results;
  }

  /**
   * Получение списка доступных процессоров с метаданными
   */
  async getProcessors(): Promise<{
    success: boolean;
    processors: Array<{
      name: string;
      display_name: string;
      version: string;
      description: string;
      category: string;
      function: string;
      capabilities: string[];
      input_schema: Record<string, any>;
      output_schema: Record<string, any>;
    }>;
  }> {
    const response = await this.client.get('/logic/processors');
    return response.data;
  }

  /**
   * Валидация JSON правил
   */
  async validateRules(jsonRules: {
    when: Record<string, any>;
    do: Array<{
      processor: string;
      action: string;
      parameters: Record<string, any>;
    }>;
  }): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    // Базовая валидация на клиенте
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!jsonRules.when) {
      errors.push('Missing "when" condition');
    }

    if (!jsonRules.do || !Array.isArray(jsonRules.do) || jsonRules.do.length === 0) {
      errors.push('Missing or empty "do" actions array');
    }

    if (jsonRules.do) {
      jsonRules.do.forEach((action, index) => {
        if (!action.processor) {
          errors.push(`Action ${index}: Missing "processor"`);
        }
        if (!action.action) {
          errors.push(`Action ${index}: Missing "action"`);
        }
        if (!action.parameters) {
          warnings.push(`Action ${index}: Missing "parameters"`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // ==========================================
  // Node System Methods (JSON-First Architecture)
  // ==========================================

  /**
   * Конвертирует JSON правило в визуальные ноды
   * JSON-First: JSON - источник истины, визуальный редактор - представление
   * @param rule - JSON правило из backend
   * @returns результат конвертации с нодами и edges или ошибками
   */
  async convertJsonLogicToNodes(logic: Logic): Promise<{
    success: boolean;
    data?: { nodes: any[]; edges: any[] };
    errors?: string[];
    warnings?: string[];
  }> {
    return import('./logic/converters/RuleConverter').then(({ RuleConverter }) => {
      return RuleConverter.convertJsonRuleToNodes(logic);
    });
  }

  /**
   * Конвертирует визуальные ноды в JSON правило
   * JSON-First: визуальный редактор → JSON структура
   * @param nodes - массив FlowNode
   * @param edges - массив FlowEdge
   * @param ruleMetadata - метаданные правила (name, description, etc.)
   * @returns результат конвертации с JSON правилом или ошибками
   */
  async convertNodesToJsonLogic(
    nodes: any[],
    edges: any[],
    logicMetadata: {
      name: string;
      description?: string;
      enabled?: boolean;
      priority?: number;
    }
  ): Promise<{
    success: boolean;
    data?: {
      name: string;
      description?: string;
      json_rules: any;
      enabled?: boolean;
      priority?: number;
    };
    errors?: string[];
    warnings?: string[];
  }> {
    return import('./logic/converters/RuleConverter').then(({ RuleConverter }) => {
      return RuleConverter.convertNodesToJsonRule(nodes, edges, logicMetadata);
    });
  }

  /**
   * Конвертирует JSON блок в ноды (для вложенных структур)
   * @param block - JSON блок
   * @param startPosition - начальная позиция
   * @returns результат конвертации с нодами и edges или ошибками
   */
  convertJsonBlockToNodes(
    block: any,
    startPosition: { x: number; y: number }
  ): Promise<{
    success: boolean;
    data?: { nodes: any[]; edges: any[] };
    errors?: string[];
    warnings?: string[];
  }> {
    return import('./logic/converters/NodeConverter').then(({ NodeConverter }) => {
      return NodeConverter.convertJsonToNodes(block, startPosition);
    });
  }

  /**
   * Конвертирует ноды в JSON блок (для вложенных структур)
   * @param nodes - массив FlowNode
   * @param edges - массив FlowEdge
   * @param startNodeId - ID начальной ноды
   * @returns результат конвертации с JSON блоком или ошибками
   */
  convertNodesToJsonBlock(
    nodes: any[],
    edges: any[],
    startNodeId: string
  ): Promise<{
    success: boolean;
    data?: any;
    errors?: string[];
    warnings?: string[];
  }> {
    return import('./logic/converters/NodeConverter').then(({ NodeConverter }) => {
      return NodeConverter.convertNodesToJson(nodes, edges, startNodeId);
    });
  }

  /**
   * Валидирует ноду
   * @param node - FlowNode для валидации
   * @returns результат валидации
   */
  validateNode(node: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return import('./logic/validators/NodeValidator').then(({ NodeValidator }) => {
      return NodeValidator.validateNode(node);
    });
  }

  /**
   * Валидирует JSON правило
   * @param jsonRule - JSON правило
   * @returns результат валидации
   */
  validateJsonRule(jsonRule: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return import('./logic/validators/RuleValidator').then(({ RuleValidator }) => {
      return RuleValidator.validateJsonRule(jsonRule);
    });
  }

  /**
   * Валидирует правило (набор нод и edges)
   * @param nodes - массив FlowNode
   * @param edges - массив FlowEdge
   * @returns результат валидации
   */
  validateRule(nodes: any[], edges: any[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return import('./logic/validators/NodeValidator').then(({ NodeValidator }) => {
      return NodeValidator.validateRule(nodes, edges);
    });
  }
}

