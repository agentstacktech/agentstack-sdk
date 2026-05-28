/**
 * GameDataSystem - Система игровых данных
 * Version: 0.3.6
 * Author: Lance (Александр Васильев)
 * Date: 2025-01-13
 * Philosophy: AI Gene Interface + 8DNA Architecture + Processing Universal Ecosystem
 * 
 * Система управления игровыми данными через белковую архитектуру
 * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
 */

import { SimpleEventEmitter } from '../utils/event-emitter';
import { AgentProtein, GameDataRequest, ProteinResponse } from './AgentProtein';
import { ProteinResponseProcessor, ProcessedGameData } from './ProteinResponseProcessor';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GameSession {
  id: string;
  game_id: string;
  user_id: number;
  project_id: number;
  character_id?: string;
  world_id?: string;
  state: 'active' | 'paused' | 'completed' | 'abandoned';
  start_time: string;
  last_activity: string;
  total_play_time: number;
  metadata: Record<string, any>;
}

export interface CharacterData {
  id: string;
  name: string;
  level: number;
  class: string;
  race: string;
  experience: number;
  stats: {
    health: number;
    max_health: number;
    mana: number;
    max_mana: number;
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
    luck: number;
  };
  skills: CharacterSkill[];
  equipment: CharacterEquipment;
  inventory: InventoryItem[];
  quests: {
    active: QuestData[];
    completed: QuestData[];
    available: QuestData[];
  };
  achievements: AchievementData[];
  location: {
    world_id: string;
    area_id: string;
    coordinates: { x: number; y: number; z: number };
  };
  metadata: Record<string, any>;
}

export interface CharacterSkill {
  id: string;
  name: string;
  type: 'combat' | 'magic' | 'crafting' | 'social' | 'survival';
  level: number;
  experience: number;
  max_level: number;
  cooldown?: number;
  mana_cost?: number;
  effects: SkillEffect[];
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility';
  value: number;
  duration?: number;
  target: 'self' | 'enemy' | 'ally' | 'area';
}

export interface CharacterEquipment {
  weapon?: EquipmentItem;
  armor?: EquipmentItem;
  helmet?: EquipmentItem;
  boots?: EquipmentItem;
  gloves?: EquipmentItem;
  accessories: EquipmentItem[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'helmet' | 'boots' | 'gloves' | 'accessory';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level_requirement: number;
  stats: Record<string, number>;
  durability: {
    current: number;
    maximum: number;
  };
  enchantments: Enchantment[];
}

export interface Enchantment {
  id: string;
  name: string;
  type: 'damage' | 'defense' | 'utility' | 'special';
  level: number;
  effects: Record<string, number>;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'consumable' | 'material' | 'tool' | 'quest' | 'misc';
  quantity: number;
  max_stack: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon_url: string;
  stats?: Record<string, number>;
  effects?: ItemEffect[];
  metadata: Record<string, any>;
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'damage' | 'utility';
  value: number;
  duration?: number;
  conditions?: string[];
}

export interface QuestData {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'daily' | 'weekly' | 'event';
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  level_requirement: number;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  time_limit?: number;
  prerequisites: string[];
  status: 'available' | 'active' | 'completed' | 'failed';
  progress: number;
  start_time?: string;
  completion_time?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'deliver' | 'explore' | 'craft' | 'talk';
  target: string;
  quantity: number;
  current: number;
  completed: boolean;
  location?: string;
  metadata: Record<string, any>;
}

export interface QuestReward {
  type: 'experience' | 'gold' | 'item' | 'skill_point' | 'reputation';
  value: number;
  item_id?: string;
  metadata: Record<string, any>;
}

export interface AchievementData {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'exploration' | 'crafting' | 'social' | 'collection' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  icon_url: string;
  unlocked_at: string;
  progress?: {
    current: number;
    target: number;
  };
  rewards: AchievementReward[];
}

export interface AchievementReward {
  type: 'title' | 'item' | 'experience' | 'gold' | 'special';
  value: string | number;
  metadata: Record<string, any>;
}

export interface WorldData {
  id: string;
  name: string;
  description: string;
  type: 'overworld' | 'dungeon' | 'city' | 'wilderness' | 'special';
  level_range: { min: number; max: number };
  areas: WorldArea[];
  events: WorldEvent[];
  weather: {
    current: string;
    forecast: Array<{ time: string; weather: string; }>;
  };
  time: {
    current: string;
    cycle: 'day' | 'night' | 'dawn' | 'dusk';
    season: 'spring' | 'summer' | 'autumn' | 'winter';
  };
}

export interface WorldArea {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  level_range: { min: number; max: number };
  enemies: string[];
  resources: string[];
  npcs: string[];
  connections: string[];
  special_features: string[];
}

export interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: 'boss' | 'treasure' | 'quest' | 'weather' | 'special';
  start_time: string;
  end_time?: string;
  location: string;
  participants: string[];
  rewards: QuestReward[];
  requirements: string[];
}

export interface GameScript {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'dialogue' | 'cutscene' | 'interaction' | 'custom';
  version: string;
  parameters: Record<string, any>;
  code: string;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface GameState {
  session: GameSession;
  character: CharacterData;
  world: WorldData;
  inventory: InventoryItem[];
  active_quests: QuestData[];
  recent_achievements: AchievementData[];
  game_settings: {
    graphics: Record<string, any>;
    audio: Record<string, any>;
    controls: Record<string, any>;
    ui: Record<string, any>;
  };
  statistics: {
    total_play_time: number;
    enemies_defeated: number;
    quests_completed: number;
    items_collected: number;
    achievements_unlocked: number;
  };
}

// ============================================================================
// GAME DATA SYSTEM CLASS
// ============================================================================

export class GameDataSystem extends SimpleEventEmitter {
  private proteinClient: AgentProtein;
  private responseProcessor: ProteinResponseProcessor;
  private gameCache: Map<string, any> = new Map();
  private sessionCache: Map<string, GameSession> = new Map();
  private scriptCache: Map<string, GameScript> = new Map();

  constructor(proteinClient: AgentProtein, responseProcessor: ProteinResponseProcessor) {
    super();
    this.proteinClient = proteinClient;
    this.responseProcessor = responseProcessor;
  }

  // ============================================================================
  // GAME SESSION MANAGEMENT
  // ============================================================================

  /**
   * Создание игровой сессии
   * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
   */
  async createGameSession(
    projectId: number,
    userId: number,
    gameId: string,
    characterId?: string,
    worldId?: string
  ): Promise<GameSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: GameSession = {
      id: sessionId,
      game_id: gameId,
      user_id: userId,
      project_id: projectId,
      character_id: characterId,
      world_id: worldId,
      state: 'active',
      start_time: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      total_play_time: 0,
      metadata: {}
    };

    this.sessionCache.set(sessionId, session);
    this.emit('session:created', { session });

    return session;
  }

  /**
   * Получение игровой сессии
   */
  async getGameSession(sessionId: string): Promise<GameSession | null> {
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    // Загрузка сессии через белковый API
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `session_${Date.now()}`,
        command_type: 'get_game_session',
        target: { project_id: 0, user_id: 0 }, // Будет заполнено сервером
        data: { session_id: sessionId },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        const session = response.result as GameSession;
        this.sessionCache.set(sessionId, session);
        return session;
      }
    } catch (error) {
      this.emit('session:error', { sessionId, error });
    }

    return null;
  }

  /**
   * Обновление игровой сессии
   */
  async updateGameSession(sessionId: string, updates: Partial<GameSession>): Promise<boolean> {
    const session = await this.getGameSession(sessionId);
    if (!session) return false;

    const updatedSession = { ...session, ...updates, last_activity: new Date().toISOString() };
    this.sessionCache.set(sessionId, updatedSession);

    this.emit('session:updated', { session: updatedSession, updates });

    return true;
  }

  /**
   * Завершение игровой сессии
   */
  async endGameSession(sessionId: string, reason: 'completed' | 'abandoned' | 'error'): Promise<boolean> {
    const session = await this.getGameSession(sessionId);
    if (!session) return false;

    const endTime = new Date();
    const startTime = new Date(session.start_time);
    const totalPlayTime = endTime.getTime() - startTime.getTime();

    const updatedSession: GameSession = {
      ...session,
      state: reason === 'completed' ? 'completed' : 'abandoned',
      total_play_time: totalPlayTime,
      last_activity: endTime.toISOString(),
      metadata: {
        ...session.metadata,
        end_reason: reason,
        end_time: endTime.toISOString()
      }
    };

    this.sessionCache.set(sessionId, updatedSession);
    this.emit('session:ended', { session: updatedSession, reason });

    return true;
  }

  // ============================================================================
  // CHARACTER DATA MANAGEMENT
  // ============================================================================

  /**
   * Получение данных персонажа
   */
  async getCharacterData(
    projectId: number,
    userId: number,
    characterId: string,
    includeInventory: boolean = true,
    includeQuests: boolean = true,
    includeAchievements: boolean = true
  ): Promise<CharacterData | null> {
    const cacheKey = `character_${characterId}`;
    
    if (this.gameCache.has(cacheKey)) {
      this.emit('character:cache:hit', { characterId });
      return this.gameCache.get(cacheKey);
    }

    try {
      const response = await this.proteinClient.getCharacterData(
        projectId,
        userId,
        characterId,
        includeInventory,
        true, // includeSkills
        true  // includeStats
      );

      if (response.status === 'success') {
        const characterData = await this.responseProcessor.processProteinResponse(
          response,
          'get_character_data',
          { characterId, includeInventory, includeQuests, includeAchievements }
        ) as CharacterData;

        this.gameCache.set(cacheKey, characterData);
        this.emit('character:loaded', { characterData });

        return characterData;
      }
    } catch (error) {
      this.emit('character:error', { characterId, error });
    }

    return null;
  }

  /**
   * Обновление данных персонажа
   */
  async updateCharacterData(
    projectId: number,
    userId: number,
    characterId: string,
    updates: Partial<CharacterData>
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `update_character_${Date.now()}`,
        command_type: 'update_character_data',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, updates },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        // Обновление кэша
        const cacheKey = `character_${characterId}`;
        if (this.gameCache.has(cacheKey)) {
          const currentData = this.gameCache.get(cacheKey);
          this.gameCache.set(cacheKey, { ...currentData, ...updates });
        }

        this.emit('character:updated', { characterId, updates });
        return true;
      }
    } catch (error) {
      this.emit('character:update_error', { characterId, error });
    }

    return false;
  }

  /**
   * Получение инвентаря персонажа
   */
  async getCharacterInventory(
    projectId: number,
    userId: number,
    characterId: string,
    includeEquipped: boolean = true
  ): Promise<InventoryItem[]> {
    try {
      const response = await this.proteinClient.getInventoryData(
        projectId,
        userId,
        characterId,
        includeEquipped
      );

      if (response.status === 'success') {
        const inventoryData = await this.responseProcessor.processProteinResponse(
          response,
          'get_inventory_data',
          { characterId, includeEquipped }
        );

        return inventoryData.items || [];
      }
    } catch (error) {
      this.emit('inventory:error', { characterId, error });
    }

    return [];
  }

  /**
   * Добавление предмета в инвентарь
   */
  async addItemToInventory(
    projectId: number,
    userId: number,
    characterId: string,
    item: InventoryItem,
    quantity: number = 1
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `add_item_${Date.now()}`,
        command_type: 'add_inventory_item',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, item, quantity },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        this.emit('inventory:item_added', { characterId, item, quantity });
        return true;
      }
    } catch (error) {
      this.emit('inventory:add_error', { characterId, error });
    }

    return false;
  }

  /**
   * Удаление предмета из инвентаря
   */
  async removeItemFromInventory(
    projectId: number,
    userId: number,
    characterId: string,
    itemId: string,
    quantity: number = 1
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `remove_item_${Date.now()}`,
        command_type: 'remove_inventory_item',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, item_id: itemId, quantity },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        this.emit('inventory:item_removed', { characterId, itemId, quantity });
        return true;
      }
    } catch (error) {
      this.emit('inventory:remove_error', { characterId, error });
    }

    return false;
  }

  // ============================================================================
  // QUEST MANAGEMENT
  // ============================================================================

  /**
   * Получение данных квеста
   */
  async getQuestData(
    projectId: number,
    userId: number,
    questId: string,
    includeRewards: boolean = true,
    includeObjectives: boolean = true
  ): Promise<QuestData | null> {
    const cacheKey = `quest_${questId}`;
    
    if (this.gameCache.has(cacheKey)) {
      this.emit('quest:cache:hit', { questId });
      return this.gameCache.get(cacheKey);
    }

    try {
      const response = await this.proteinClient.getQuestData(
        projectId,
        userId,
        questId,
        includeRewards,
        includeObjectives
      );

      if (response.status === 'success') {
        const questData = await this.responseProcessor.processProteinResponse(
          response,
          'get_quest_data',
          { questId, includeRewards, includeObjectives }
        ) as QuestData;

        this.gameCache.set(cacheKey, questData);
        this.emit('quest:loaded', { questData });

        return questData;
      }
    } catch (error) {
      this.emit('quest:error', { questId, error });
    }

    return null;
  }

  /**
   * Начало квеста
   */
  async startQuest(
    projectId: number,
    userId: number,
    characterId: string,
    questId: string
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `start_quest_${Date.now()}`,
        command_type: 'start_quest',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, quest_id: questId },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        this.emit('quest:started', { characterId, questId });
        return true;
      }
    } catch (error) {
      this.emit('quest:start_error', { characterId, questId, error });
    }

    return false;
  }

  /**
   * Обновление прогресса квеста
   */
  async updateQuestProgress(
    projectId: number,
    userId: number,
    characterId: string,
    questId: string,
    objectiveId: string,
    progress: number
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `update_quest_${Date.now()}`,
        command_type: 'update_quest_progress',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, quest_id: questId, objective_id: objectiveId, progress },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        this.emit('quest:progress_updated', { characterId, questId, objectiveId, progress });
        return true;
      }
    } catch (error) {
      this.emit('quest:progress_error', { characterId, questId, error });
    }

    return false;
  }

  /**
   * Завершение квеста
   */
  async completeQuest(
    projectId: number,
    userId: number,
    characterId: string,
    questId: string
  ): Promise<QuestReward[] | null> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `complete_quest_${Date.now()}`,
        command_type: 'complete_quest',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, quest_id: questId },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        const rewards = response.result.rewards as QuestReward[];
        this.emit('quest:completed', { characterId, questId, rewards });
        return rewards;
      }
    } catch (error) {
      this.emit('quest:complete_error', { characterId, questId, error });
    }

    return null;
  }

  // ============================================================================
  // WORLD DATA MANAGEMENT
  // ============================================================================

  /**
   * Получение данных мира
   */
  async getWorldData(
    projectId: number,
    userId: number,
    worldId: string,
    includeAreas: boolean = true,
    includeEvents: boolean = true
  ): Promise<WorldData | null> {
    const cacheKey = `world_${worldId}`;
    
    if (this.gameCache.has(cacheKey)) {
      this.emit('world:cache:hit', { worldId });
      return this.gameCache.get(cacheKey);
    }

    try {
      const response = await this.proteinClient.getGameData(projectId, userId, {
        game_type: 'rpg',
        data_type: 'world',
        game_id: worldId,
        include_assets: true
      });

      if (response.status === 'success') {
        const worldData = await this.responseProcessor.processProteinResponse(
          response,
          'get_world_data',
          { worldId, includeAreas, includeEvents }
        ) as WorldData;

        this.gameCache.set(cacheKey, worldData);
        this.emit('world:loaded', { worldData });

        return worldData;
      }
    } catch (error) {
      this.emit('world:error', { worldId, error });
    }

    return null;
  }

  /**
   * Перемещение персонажа
   */
  async moveCharacter(
    projectId: number,
    userId: number,
    characterId: string,
    worldId: string,
    areaId: string,
    coordinates: { x: number; y: number; z: number }
  ): Promise<boolean> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `move_character_${Date.now()}`,
        command_type: 'move_character',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId, world_id: worldId, area_id: areaId, coordinates },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        this.emit('character:moved', { characterId, worldId, areaId, coordinates });
        return true;
      }
    } catch (error) {
      this.emit('character:move_error', { characterId, error });
    }

    return false;
  }

  // ============================================================================
  // GAME SCRIPT EXECUTION
  // ============================================================================

  /**
   * Выполнение игрового скрипта
   */
  async executeGameScript(
    projectId: number,
    userId: number,
    scriptId: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    const cacheKey = `script_${scriptId}`;
    
    // Проверка кэша скрипта
    if (this.scriptCache.has(cacheKey)) {
      const script = this.scriptCache.get(cacheKey)!;
      this.emit('script:cache:hit', { scriptId });
      
      // Выполнение скрипта
      return this.executeScript(script, parameters);
    }

    try {
      const response = await this.proteinClient.executeGameScript(
        projectId,
        userId,
        scriptId,
        parameters
      );

      if (response.status === 'success') {
        const scriptData = response.result as GameScript;
        this.scriptCache.set(cacheKey, scriptData);
        
        this.emit('script:loaded', { scriptData });
        return this.executeScript(scriptData, parameters);
      }
    } catch (error) {
      this.emit('script:error', { scriptId, error });
    }

    return null;
  }

  /**
   * Выполнение скрипта
   */
  private executeScript(script: GameScript, parameters: Record<string, any>): any {
    try {
      this.emit('script:execution:start', { script, parameters });

      // Здесь должна быть логика выполнения скрипта
      // В реальной реализации это может быть интерпретатор JavaScript,
      // Lua, или другой язык скриптов
      
      const result = {
        script_id: script.id,
        execution_time: Date.now(),
        result: 'Script executed successfully',
        parameters,
        metadata: script.metadata
      };

      this.emit('script:execution:success', { script, result });
      return result;

    } catch (error) {
      this.emit('script:execution:error', { script, error });
      throw error;
    }
  }

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  /**
   * Получение полного состояния игры
   */
  async getGameState(
    projectId: number,
    userId: number,
    sessionId: string
  ): Promise<GameState | null> {
    const session = await this.getGameSession(sessionId);
    if (!session) return null;

    try {
      const [character, world, inventory, activeQuests] = await Promise.all([
        session.character_id ? this.getCharacterData(projectId, userId, session.character_id) : null,
        session.world_id ? this.getWorldData(projectId, userId, session.world_id) : null,
        session.character_id ? this.getCharacterInventory(projectId, userId, session.character_id) : [],
        session.character_id ? this.getActiveQuests(projectId, userId, session.character_id) : []
      ]);

      const gameState: GameState = {
        session,
        character: character!,
        world: world!,
        inventory,
        active_quests: activeQuests,
        recent_achievements: [], // TODO: Implement achievements
        game_settings: {
          graphics: {},
          audio: {},
          controls: {},
          ui: {}
        },
        statistics: {
          total_play_time: session.total_play_time,
          enemies_defeated: 0,
          quests_completed: 0,
          items_collected: 0,
          achievements_unlocked: 0
        }
      };

      this.emit('game_state:loaded', { gameState });
      return gameState;

    } catch (error) {
      this.emit('game_state:error', { sessionId, error });
      return null;
    }
  }

  /**
   * Получение активных квестов
   */
  private async getActiveQuests(
    projectId: number,
    userId: number,
    characterId: string
  ): Promise<QuestData[]> {
    try {
      const response = await this.proteinClient.executeProteinRequest({
        uuid: `get_active_quests_${Date.now()}`,
        command_type: 'get_active_quests',
        target: { project_id: projectId, user_id: userId },
        data: { character_id: characterId },
        timestamp: new Date().toISOString()
      });

      if (response.status === 'success') {
        return response.result.quests || [];
      }
    } catch (error) {
      this.emit('quests:error', { characterId, error });
    }

    return [];
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Очистка игрового кэша
   */
  clearGameCache(): void {
    this.gameCache.clear();
    this.emit('game_cache:cleared');
  }

  /**
   * Очистка кэша сессий
   */
  clearSessionCache(): void {
    this.sessionCache.clear();
    this.emit('session_cache:cleared');
  }

  /**
   * Очистка кэша скриптов
   */
  clearScriptCache(): void {
    this.scriptCache.clear();
    this.emit('script_cache:cleared');
  }

  /**
   * Получение статистики системы
   */
  getSystemStats(): {
    game_cache_size: number;
    session_cache_size: number;
    script_cache_size: number;
    active_sessions: number;
  } {
    return {
      game_cache_size: this.gameCache.size,
      session_cache_size: this.sessionCache.size,
      script_cache_size: this.scriptCache.size,
      active_sessions: Array.from(this.sessionCache.values()).filter(s => s.state === 'active').length
    };
  }
}

export default GameDataSystem;



