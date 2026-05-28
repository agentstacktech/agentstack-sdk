import { HTTPClient } from '../client/http-client'
import { SimpleEventEmitter } from '../utils/event-emitter'

export interface Buff {
  buff_id: string
  name: string
  type: string
  category: string
  is_active: boolean
  expires_at: string
  priority: number
  effects: Record<string, any> // Произвольные пути в формате "data.path.to.field"
  scope?: 'ecosystem' | 'project' | 'user_in_project'
}

export interface ActiveBuffsResponse {
  user_id?: number
  project_id?: number
  active_buffs: Buff[]
}

export interface BuffStatusResponse {
  user_id?: number
  project_id?: number
  has_active_buffs: boolean
  active_buffs: Buff[]
}

export interface EffectiveLimitsResponse {
  user_id?: number
  project_id?: number
  effective_limits: {
    limits: Record<string, number>
    features: Record<string, boolean>
  }
  contributing_buffs?: Array<{
    buff_id: string
    name: string
    scope: string
    priority: number
  }>
}

export interface CreateBuffRequest {
  entity_id: number
  entity_kind: 'user' | 'project'
  name: string
  type: string
  category: string
  duration_days: number
  priority?: number
  effects: Record<string, any> // Произвольные пути в формате "data.path.to.field"
  on_apply?: Array<{
    type: 'event' | 'command' | 'processor'
    [key: string]: any
  }>
  on_expire?: Array<{
    type: 'event' | 'command' | 'processor'
    [key: string]: any
  }>
  config?: {
    persistent?: boolean
    revert_on_expire?: boolean
    extends_on_reapply?: boolean
  }
  project_id?: number
}

export interface CreateBuffResponse {
  buff_id: string
  state: string
  created_at: string
}

export interface ApplyBuffResponse {
  buff_id: string
  state: string
  applied_at: string
  expires_at: string
}

export interface ExtendBuffResponse {
  buff_id: string
  state: string
  expires_at: string
}

export interface RevertBuffResponse {
  reverted: boolean
  buff_id: string
  deleted: boolean
}

export interface CancelBuffResponse {
  cancelled: boolean
  buff_id: string
  deleted: boolean
}

export interface RetryBuffResponse {
  buff_id: string
  state: string
  applied_at?: string
  expires_at?: string
  reverted?: boolean
  deleted?: boolean
}

export class AgentBuffs {
  private httpClient: HTTPClient
  private eventEmitter: SimpleEventEmitter

  constructor(httpClient: HTTPClient, eventEmitter: SimpleEventEmitter) {
    this.httpClient = httpClient
    this.eventEmitter = eventEmitter
  }

  /**
   * Получить список активных баффов
   */
  async getActiveBuffs(params: {
    entityId: number
    entityKind: 'user' | 'project'
    category?: string
  }): Promise<ActiveBuffsResponse> {
    const response = await this.httpClient.get<ActiveBuffsResponse>(
      `/buffs/${params.entityKind}/${params.entityId}/active`,
      params.category ? { category: params.category } : undefined
    )
    return response.data
  }

  /**
   * Получить статус баффов
   */
  async getBuffStatus(params: {
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<BuffStatusResponse> {
    const response = await this.httpClient.get<BuffStatusResponse>(
      `/buffs/${params.entityKind}/${params.entityId}/status`
    )
    return response.data
  }

  /**
   * Получить информацию о конкретном баффе
   */
  async getBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<Buff> {
    const response = await this.httpClient.get<Buff>(
      `/buffs/${params.buffId}`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind
      }
    )
    return response.data
  }

  /**
   * Получить все баффы проекта (включая шаблоны)
   */
  async getProjectAllBuffs(params: {
    projectId: number
    includeEcosystem?: boolean
    category?: string
  }): Promise<{
    project_id: number
    all_buffs: Array<Buff & { state?: string; created_at?: string; applied_at?: string }>
    templates: Array<Buff & { state?: string; created_at?: string }>
    active_buffs: Buff[]
  }> {
    const queryParams: Record<string, any> = {
      include_ecosystem: params.includeEcosystem ?? true
    }
    if (params.category) {
      queryParams.category = params.category
    }
    const response = await this.httpClient.get<{
      project_id: number
      all_buffs: Array<Buff & { state?: string; created_at?: string; applied_at?: string }>
      templates: Array<Buff & { state?: string; created_at?: string }>
      active_buffs: Buff[]
    }>(
      `/buffs/project/${params.projectId}/all`,
      queryParams
    )
    return response.data
  }

  /**
   * Получить активные баффы проекта
   */
  async getProjectActiveBuffs(params: {
    projectId: number
    includeEcosystem?: boolean
    category?: string
  }): Promise<ActiveBuffsResponse> {
    const queryParams: Record<string, any> = {
      include_ecosystem: params.includeEcosystem ?? true
    }
    if (params.category) {
      queryParams.category = params.category
    }
    const response = await this.httpClient.get<ActiveBuffsResponse>(
      `/buffs/project/${params.projectId}/active`,
      queryParams
    )
    return response.data
  }

  /**
   * Получить активные баффы пользователя в проекте
   */
  async getUserInProjectActiveBuffs(params: {
    projectId: number
    userId: number
    includeProjectBuffs?: boolean
    includeEcosystem?: boolean
    category?: string
  }): Promise<ActiveBuffsResponse> {
    const queryParams: Record<string, any> = {
      include_project_buffs: params.includeProjectBuffs ?? true,
      include_ecosystem: params.includeEcosystem ?? false
    }
    if (params.category) {
      queryParams.category = params.category
    }
    const response = await this.httpClient.get<ActiveBuffsResponse>(
      `/buffs/project/${params.projectId}/user/${params.userId}/active`,
      queryParams
    )
    return response.data
  }

  /**
   * Создать новый бафф
   */
  async createBuff(data: CreateBuffRequest): Promise<CreateBuffResponse> {
    const response = await this.httpClient.post<CreateBuffResponse>('/buffs', data)
    return response.data
  }

  /**
   * Обновить существующий бафф (только для шаблонов в состоянии PENDING)
   */
  async updateBuff(buffId: string, data: CreateBuffRequest): Promise<CreateBuffResponse> {
    const response = await this.httpClient.put<CreateBuffResponse>(`/buffs/${buffId}`, data)
    return response.data
  }

  /**
   * Применить бафф
   */
  async applyBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<ApplyBuffResponse> {
    const response = await this.httpClient.post<ApplyBuffResponse>(
      `/buffs/${params.buffId}/apply`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind
      }
    )
    return response.data
  }

  /**
   * Продлить бафф
   */
  async extendBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
    days?: number
  }): Promise<ExtendBuffResponse> {
    const response = await this.httpClient.post<ExtendBuffResponse>(
      `/buffs/${params.buffId}/extend`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind,
        additional_days: params.days
      }
    )
    return response.data
  }

  /**
   * Откатить бафф
   */
  async revertBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<RevertBuffResponse> {
    const response = await this.httpClient.post<RevertBuffResponse>(
      `/buffs/${params.buffId}/revert`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind
      }
    )
    return response.data
  }

  /**
   * Отменить бафф до применения
   */
  async cancelBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<CancelBuffResponse> {
    const response = await this.httpClient.post<CancelBuffResponse>(
      `/buffs/${params.buffId}/cancel`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind
      }
    )
    return response.data
  }

  /**
   * Повторить попытку применения/отката баффа после ошибки
   */
  async retryFailedBuff(params: {
    buffId: string
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<RetryBuffResponse> {
    const response = await this.httpClient.post<RetryBuffResponse>(
      `/buffs/${params.buffId}/retry`,
      {
        entity_id: params.entityId,
        entity_kind: params.entityKind
      }
    )
    return response.data
  }

  /**
   * Вычислить эффективные лимиты
   */
  async calculateEffectiveLimits(params: {
    entityId: number
    entityKind: 'user' | 'project'
  }): Promise<EffectiveLimitsResponse> {
    const response = await this.httpClient.get<EffectiveLimitsResponse>(
      `/buffs/${params.entityKind}/${params.entityId}/effective-limits`
    )
    return response.data
  }

  /**
   * Вычислить эффективные лимиты пользователя в проекте
   */
  async getUserInProjectEffectiveLimits(params: {
    projectId: number
    userId: number
  }): Promise<EffectiveLimitsResponse> {
    const response = await this.httpClient.get<EffectiveLimitsResponse>(
      `/buffs/project/${params.projectId}/user/${params.userId}/effective-limits`
    )
    return response.data
  }

  /**
   * Получить структуру данных entity в плоском формате
   */
  async getEntityData(params: {
    entityId: number
    entityKind: 'user' | 'project'
    projectId?: number
  }): Promise<{ data_paths: Record<string, any> }> {
    const queryParams: Record<string, any> = {
      entity_id: params.entityId,
      entity_kind: params.entityKind
    }
    if (params.projectId) {
      queryParams.project_id = params.projectId
    }
    const response = await this.httpClient.get<{ data_paths: Record<string, any> }>(
      '/buffs/entity-data',
      queryParams
    )
    return response.data
  }
}
