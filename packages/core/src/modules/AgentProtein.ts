/**
 * AgentProtein - Белковая система для SDK
 * Version: 0.3.6
 * Author: Lance (Александр Васильев)
 * Date: 2025-01-13
 * Philosophy: AI Gene Interface + 8DNA Architecture + Protein Command Architecture
 * 
 * Белковая система для запросов и получения сложных структур данных
 * Применяет ген: architecture.protein.universe.3d_fusion.gen2
 */

import { SimpleEventEmitter } from '../utils/event-emitter';
import { HTTPClient } from '../client/http-client';
import { AgentStackError } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ProteinRequest {
  uuid: string;
  command_type: string;
  target: {
    project_id: number;
    user_id: number;
  };
  data: Record<string, any>;
  config?: Record<string, any>;
  timestamp: string;
}

export interface ProteinResponse {
  status: 'success' | 'error';
  result: any;
  execution_time: number;
  protein_uuid: string;
  error?: string;
}

export interface PageCompositionRequest {
  page_type: 'profile' | 'dashboard' | 'shop' | 'game' | 'news' | 'custom';
  components: string[];
  user_context?: Record<string, any>;
  filters?: Record<string, any>;
  layout?: 'mobile' | 'desktop' | 'tablet';
}

export interface GameDataRequest {
  game_type: 'rpg' | 'strategy' | 'action' | 'puzzle' | 'custom';
  data_type: 'character' | 'inventory' | 'quest' | 'world' | 'script' | 'state';
  game_id?: string;
  character_id?: string;
  quest_id?: string;
  include_assets?: boolean;
}

export interface ProteinCommand {
  type: 'get_page_data' | 'get_inventory_data' | 'get_shop_data' | 
        'get_dashboard_data' | 'get_game_state' | 'get_character_data' |
        'get_quest_data' | 'get_world_data' | 'execute_script' | 'custom';
  name: string;
  payload: Record<string, any>;
  context?: Record<string, any>;
}

// ============================================================================
// AGENT PROTEIN CLASS
// ============================================================================

export class AgentProtein extends SimpleEventEmitter {
  private httpClient: HTTPClient;
  private proteinCache: Map<string, any> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  /** Lookups via `executeProteinRequest` (for `getCacheStats().hitRate`). */
  private _cacheStatLookups = 0;
  private _cacheStatHits = 0;

  constructor(httpClient: HTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  // ============================================================================
  // CORE PROTEIN METHODS
  // ============================================================================

  /**
   * Создание белкового запроса
   * Применяет ген: architecture.protein.universe.3d_fusion.gen2
   */
  private createProteinRequest(
    commandType: string,
    target: { project_id: number; user_id: number },
    data: Record<string, any>,
    config?: Record<string, any>
  ): ProteinRequest {
    return {
      uuid: `protein_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command_type: commandType,
      target,
      data,
      config,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Выполнение белкового запроса
   * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
   */
  async executeProteinRequest(request: ProteinRequest): Promise<ProteinResponse> {
    const cacheKey = this.generateCacheKey(request);
    this._cacheStatLookups += 1;

    // Проверка кэша
    if (this.proteinCache.has(cacheKey)) {
      this._cacheStatHits += 1;
      this.emit('protein:cache:hit', { request, cacheKey });
      return this.proteinCache.get(cacheKey);
    }

    // Проверка очереди запросов
    if (this.requestQueue.has(cacheKey)) {
      this.emit('protein:queue:waiting', { request, cacheKey });
      return this.requestQueue.get(cacheKey)!;
    }

    // Создание нового запроса
    const requestPromise = this.performProteinRequest(request);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Кэширование успешного ответа
      if (response.status === 'success') {
        this.proteinCache.set(cacheKey, response);
        this.emit('protein:cache:set', { request, response, cacheKey });
      }

      return response;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Выполнение HTTP запроса к белковому API
   */
  private async performProteinRequest(request: ProteinRequest): Promise<ProteinResponse> {
    try {
      this.emit('protein:request:start', { request });

      const response = await this.httpClient.post('/protein/execute', request);
      
      this.emit('protein:request:success', { request, response });
      
      return {
        status: 'success',
        result: response.data.result,
        execution_time: response.data.execution_time,
        protein_uuid: response.data.protein_uuid
      };
    } catch (error) {
      this.emit('protein:request:error', { request, error });
      
      return {
        status: 'error',
        result: null,
        execution_time: 0,
        protein_uuid: request.uuid,
        error: (error as Error).message
      };
    }
  }

  /**
   * Генерация ключа кэша
   */
  private generateCacheKey(request: ProteinRequest): string {
    const keyData = {
      command_type: request.command_type,
      target: request.target,
      data: request.data
    };
    return `protein_${btoa(JSON.stringify(keyData))}`;
  }

  // ============================================================================
  // PAGE COMPOSITION SYSTEM
  // ============================================================================

  /**
   * Получение данных для композиции страницы
   * Применяет ген: architecture.protein.universe.3d_fusion.gen2
   */
  async getPageData(
    projectId: number,
    userId: number,
    composition: PageCompositionRequest
  ): Promise<ProteinResponse> {
    const request = this.createProteinRequest(
      'get_page_data',
      { project_id: projectId, user_id: userId },
      {
        page_type: composition.page_type,
        components: composition.components,
        user_context: composition.user_context,
        filters: composition.filters,
        layout: composition.layout
      }
    );

    return this.executeProteinRequest(request);
  }

  /**
   * Получение данных профиля пользователя
   */
  async getProfileData(
    projectId: number,
    userId: number,
    includeStats: boolean = true,
    includePreferences: boolean = true
  ): Promise<ProteinResponse> {
    return this.getPageData(projectId, userId, {
      page_type: 'profile',
      components: [
        'user_info',
        'avatar',
        'stats',
        'achievements',
        'preferences',
        'activity_feed'
      ].filter(comp => {
        if (comp === 'stats' && !includeStats) return false;
        if (comp === 'preferences' && !includePreferences) return false;
        return true;
      })
    });
  }

  /**
   * Получение данных дашборда
   */
  async getDashboardData(
    projectId: number,
    userId: number,
    widgets: string[] = ['stats', 'recent_activity', 'notifications', 'quick_actions']
  ): Promise<ProteinResponse> {
    return this.getPageData(projectId, userId, {
      page_type: 'dashboard',
      components: widgets
    });
  }

  /**
   * Получение данных магазина
   */
  async getShopData(
    projectId: number,
    userId: number,
    category?: string,
    filters?: Record<string, any>
  ): Promise<ProteinResponse> {
    return this.getPageData(projectId, userId, {
      page_type: 'shop',
      components: ['products', 'categories', 'cart', 'recommendations'],
      filters: { category, ...filters }
    });
  }

  /**
   * Получение новостного блока
   */
  async getNewsData(
    projectId: number,
    userId: number,
    limit: number = 10,
    category?: string
  ): Promise<ProteinResponse> {
    return this.getPageData(projectId, userId, {
      page_type: 'news',
      components: ['articles', 'categories', 'trending'],
      filters: { limit, category }
    });
  }

  // ============================================================================
  // GAME DATA SYSTEM
  // ============================================================================

  /**
   * Получение игровых данных
   * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
   */
  async getGameData(
    projectId: number,
    userId: number,
    gameRequest: GameDataRequest
  ): Promise<ProteinResponse> {
    const request = this.createProteinRequest(
      'get_game_data',
      { project_id: projectId, user_id: userId },
      gameRequest
    );

    return this.executeProteinRequest(request);
  }

  /**
   * Получение данных персонажа
   */
  async getCharacterData(
    projectId: number,
    userId: number,
    characterId: string,
    includeInventory: boolean = true,
    includeSkills: boolean = true,
    includeStats: boolean = true
  ): Promise<ProteinResponse> {
    return this.getGameData(projectId, userId, {
      game_type: 'rpg',
      data_type: 'character',
      character_id: characterId,
      include_assets: true
    });
  }

  /**
   * Получение инвентаря
   */
  async getInventoryData(
    projectId: number,
    userId: number,
    characterId?: string,
    includeEquipped: boolean = true
  ): Promise<ProteinResponse> {
    return this.getGameData(projectId, userId, {
      game_type: 'rpg',
      data_type: 'inventory',
      character_id: characterId,
      include_assets: true
    });
  }

  /**
   * Получение данных квеста
   */
  async getQuestData(
    projectId: number,
    userId: number,
    questId: string,
    includeRewards: boolean = true,
    includeObjectives: boolean = true
  ): Promise<ProteinResponse> {
    return this.getGameData(projectId, userId, {
      game_type: 'rpg',
      data_type: 'quest',
      quest_id: questId,
      include_assets: true
    });
  }

  /**
   * Получение состояния игры
   */
  async getGameState(
    projectId: number,
    userId: number,
    gameId: string,
    includeWorld: boolean = true,
    includeCharacters: boolean = true
  ): Promise<ProteinResponse> {
    return this.getGameData(projectId, userId, {
      game_type: 'rpg',
      data_type: 'state',
      game_id: gameId,
      include_assets: true
    });
  }

  /**
   * Выполнение игрового скрипта
   */
  async executeGameScript(
    projectId: number,
    userId: number,
    scriptId: string,
    parameters?: Record<string, any>
  ): Promise<ProteinResponse> {
    const request = this.createProteinRequest(
      'execute_script',
      { project_id: projectId, user_id: userId },
      {
        script_id: scriptId,
        parameters: parameters || {}
      }
    );

    return this.executeProteinRequest(request);
  }

  // ============================================================================
  // ADVANCED PROTEIN FEATURES
  // ============================================================================

  /**
   * Пакетное выполнение белковых запросов
   * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
   */
  async executeBatchRequests(
    projectId: number,
    userId: number,
    commands: ProteinCommand[]
  ): Promise<ProteinResponse[]> {
    const batchRequest = this.createProteinRequest(
      'batch_execute',
      { project_id: projectId, user_id: userId },
      { commands }
    );

    const response = await this.executeProteinRequest(batchRequest);
    
    if (response.status === 'success') {
      return response.result.results;
    } else {
      throw new AgentStackError(`Batch execution failed: ${response.error}`);
    }
  }

  /**
   * Создание сложной структуры данных одним запросом
   */
  async getComplexDataStructure(
    projectId: number,
    userId: number,
    structure: {
      profile?: boolean;
      inventory?: boolean;
      quests?: boolean;
      world?: boolean;
      stats?: boolean;
      achievements?: boolean;
    }
  ): Promise<ProteinResponse> {
    const components = Object.entries(structure)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => key);

    return this.getPageData(projectId, userId, {
      page_type: 'custom',
      components,
      user_context: { complex_structure: true }
    });
  }

  /**
   * Получение разметки страницы
   */
  async getPageMarkup(
    projectId: number,
    userId: number,
    pageType: string,
    layout: 'mobile' | 'desktop' | 'tablet' = 'desktop'
  ): Promise<ProteinResponse> {
    return this.getPageData(projectId, userId, {
      page_type: pageType as any,
      components: ['markup', 'styles', 'scripts', 'assets'],
      layout
    });
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Очистка белкового кэша
   */
  clearProteinCache(): void {
    this.proteinCache.clear();
    this.emit('protein:cache:cleared');
  }

  /**
   * Удаление конкретного элемента из кэша
   */
  removeFromCache(cacheKey: string): void {
    if (this.proteinCache.has(cacheKey)) {
      this.proteinCache.delete(cacheKey);
      this.emit('protein:cache:removed', { cacheKey });
    }
  }

  /**
   * Получение статистики кэша
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    const lookups = this._cacheStatLookups;
    return {
      size: this.proteinCache.size,
      keys: Array.from(this.proteinCache.keys()),
      hitRate: lookups > 0 ? this._cacheStatHits / lookups : 0,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Проверка доступности белкового API
   */
  async isProteinApiAvailable(): Promise<boolean> {
    try {
      await this.httpClient.get('/protein/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получение информации о белковой системе
   */
  async getProteinSystemInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/protein/info');
      return response.data;
    } catch (error) {
      throw new AgentStackError(`Failed to get protein system info: ${(error as Error).message}`);
    }
  }

  /**
   * Валидация белкового запроса
   */
  validateProteinRequest(request: ProteinRequest): boolean {
    return !!(
      request.uuid &&
      request.command_type &&
      request.target &&
      request.target.project_id &&
      request.target.user_id &&
      request.timestamp
    );
  }
}

export default AgentProtein;



