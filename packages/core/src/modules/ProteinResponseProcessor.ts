/**
 * ProteinResponseProcessor - Обработчик белковых ответов
 * Version: 0.3.6
 * Author: Lance (Александр Васильев)
 * Date: 2025-01-13
 * Philosophy: AI Gene Interface + 8DNA Architecture + Processing Universal Ecosystem
 * 
 * Система обработки и трансформации белковых ответов
 * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
 */

import { SimpleEventEmitter } from '../utils/event-emitter';
import { ProteinResponse, PageCompositionRequest, GameDataRequest } from './AgentProtein';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ProcessedPageData {
  profile?: ProcessedProfileData;
  dashboard?: ProcessedDashboardData;
  shop?: ProcessedShopData;
  news?: ProcessedNewsData;
  game?: ProcessedGameData;
  markup?: ProcessedMarkupData;
  metadata: {
    page_type: string;
    components: string[];
    layout: string;
    timestamp: string;
    processing_time: number;
  };
}

export interface ProcessedProfileData {
  user_info: {
    id: number;
    username: string;
    email: string;
    avatar_url?: string;
    display_name: string;
    bio?: string;
    join_date: string;
    last_active: string;
  };
  stats: {
    level: number;
    experience: number;
    reputation: number;
    achievements_count: number;
    projects_count: number;
    contributions_count: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon_url: string;
    earned_date: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      in_app: boolean;
    };
    privacy: {
      profile_visibility: 'public' | 'private' | 'friends';
      activity_visibility: 'public' | 'private' | 'friends';
    };
  };
  activity_feed: Array<{
    id: string;
    type: 'achievement' | 'project' | 'contribution' | 'social';
    title: string;
    description: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export interface ProcessedDashboardData {
  widgets: Array<{
    id: string;
    type: 'stats' | 'chart' | 'list' | 'card' | 'custom';
    title: string;
    data: any;
    position: { x: number; y: number; width: number; height: number };
    refresh_interval?: number;
  }>;
  layout: {
    columns: number;
    rows: number;
    breakpoints: {
      mobile: { columns: number; rows: number };
      tablet: { columns: number; rows: number };
      desktop: { columns: number; rows: number };
    };
  };
  quick_actions: Array<{
    id: string;
    title: string;
    icon: string;
    action: string;
    color?: string;
  }>;
}

export interface ProcessedShopData {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    image_url: string;
    in_stock: boolean;
    stock_count?: number;
    tags: string[];
    metadata?: any;
  }>;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    product_count: number;
    subcategories?: string[];
  }>;
  cart: {
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    total_items: number;
    total_price: number;
    currency: string;
  };
  recommendations: Array<{
    product_id: string;
    reason: string;
    score: number;
  }>;
}

export interface ProcessedNewsData {
  articles: Array<{
    id: string;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    publish_date: string;
    category: string;
    tags: string[];
    image_url?: string;
    read_time: number;
    views: number;
    likes: number;
    comments_count: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    article_count: number;
    color: string;
  }>;
  trending: Array<{
    article_id: string;
    trend_score: number;
    trend_type: 'hot' | 'rising' | 'new';
  }>;
}

export interface ProcessedGameData {
  character?: {
    id: string;
    name: string;
    level: number;
    class: string;
    race: string;
    stats: {
      health: number;
      mana: number;
      strength: number;
      agility: number;
      intelligence: number;
      vitality: number;
    };
    equipment: {
      weapon?: any;
      armor?: any;
      accessories: any[];
    };
    skills: Array<{
      id: string;
      name: string;
      level: number;
      experience: number;
      cooldown?: number;
    }>;
  };
  inventory?: {
    items: Array<{
      id: string;
      name: string;
      type: string;
      quantity: number;
      rarity: string;
      stats?: any;
      description: string;
      icon_url: string;
    }>;
    capacity: {
      current: number;
      maximum: number;
    };
    categories: string[];
  };
  quests?: {
    active: Array<{
      id: string;
      title: string;
      description: string;
      objectives: Array<{
        id: string;
        description: string;
        completed: boolean;
        progress: number;
      }>;
      rewards: any[];
      deadline?: string;
    }>;
    completed: Array<{
      id: string;
      title: string;
      completed_date: string;
      rewards_received: any[];
    }>;
    available: Array<{
      id: string;
      title: string;
      description: string;
      requirements: any[];
      rewards: any[];
    }>;
  };
  world?: {
    current_location: {
      id: string;
      name: string;
      description: string;
      coordinates: { x: number; y: number; z: number };
    };
    available_locations: Array<{
      id: string;
      name: string;
      distance: number;
      accessible: boolean;
    }>;
    events: Array<{
      id: string;
      type: string;
      description: string;
      start_time: string;
      end_time?: string;
    }>;
  };
}

export interface ProcessedMarkupData {
  html: string;
  css: string;
  javascript: string;
  assets: Array<{
    type: 'image' | 'font' | 'script' | 'style';
    url: string;
    size?: number;
    preload?: boolean;
  }>;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    viewport: string;
    theme_color?: string;
  };
}

// ============================================================================
// PROTEIN RESPONSE PROCESSOR CLASS
// ============================================================================

export class ProteinResponseProcessor extends SimpleEventEmitter {
  private processingCache: Map<string, any> = new Map();
  private processingStats = {
    total_processed: 0,
    cache_hits: 0,
    processing_errors: 0,
    average_processing_time: 0
  };

  constructor() {
    super();
  }

  // ============================================================================
  // MAIN PROCESSING METHODS
  // ============================================================================

  /**
   * Обработка белкового ответа
   * Применяет ген: processing.universal.ecosystem.advanced_systems.gen2
   */
  async processProteinResponse(
    response: ProteinResponse,
    requestType: string,
    originalRequest?: any
  ): Promise<ProcessedPageData | ProcessedGameData | any> {
    const startTime = Date.now();
    const cacheKey = this.generateProcessingCacheKey(response, requestType);

    // Проверка кэша обработки
    if (this.processingCache.has(cacheKey)) {
      this.processingStats.cache_hits++;
      this.emit('processing:cache:hit', { cacheKey, requestType });
      return this.processingCache.get(cacheKey);
    }

    try {
      this.emit('processing:start', { response, requestType });

      let processedData: any;

      // Выбор метода обработки в зависимости от типа запроса
      switch (requestType) {
        case 'get_page_data':
          processedData = await this.processPageData(response, originalRequest);
          break;
        case 'get_game_data':
          processedData = await this.processGameData(response, originalRequest);
          break;
        case 'get_character_data':
          processedData = await this.processCharacterData(response, originalRequest);
          break;
        case 'get_inventory_data':
          processedData = await this.processInventoryData(response, originalRequest);
          break;
        case 'get_quest_data':
          processedData = await this.processQuestData(response, originalRequest);
          break;
        case 'get_shop_data':
          processedData = await this.processShopData(response, originalRequest);
          break;
        case 'get_dashboard_data':
          processedData = await this.processDashboardData(response, originalRequest);
          break;
        case 'get_news_data':
          processedData = await this.processNewsData(response, originalRequest);
          break;
        case 'get_profile_data':
          processedData = await this.processProfileData(response, originalRequest);
          break;
        default:
          processedData = await this.processGenericData(response, originalRequest);
      }

      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      // Кэширование обработанных данных
      this.processingCache.set(cacheKey, processedData);
      this.emit('processing:success', { processedData, processingTime, requestType });

      return processedData;

    } catch (error) {
      this.processingStats.processing_errors++;
      this.emit('processing:error', { error, requestType });
      throw error;
    }
  }

  // ============================================================================
  // SPECIFIC PROCESSING METHODS
  // ============================================================================

  /**
   * Обработка данных страницы
   */
  private async processPageData(
    response: ProteinResponse,
    originalRequest: PageCompositionRequest
  ): Promise<ProcessedPageData> {
    const rawData = response.result;
    const processedData: ProcessedPageData = {
      metadata: {
        page_type: originalRequest?.page_type || 'unknown',
        components: originalRequest?.components || [],
        layout: originalRequest?.layout || 'desktop',
        timestamp: new Date().toISOString(),
        processing_time: response.execution_time
      }
    };

    // Обработка компонентов страницы
    if (rawData.profile) {
      processedData.profile = await this.processProfileComponent(rawData.profile);
    }

    if (rawData.dashboard) {
      processedData.dashboard = await this.processDashboardComponent(rawData.dashboard);
    }

    if (rawData.shop) {
      processedData.shop = await this.processShopComponent(rawData.shop);
    }

    if (rawData.news) {
      processedData.news = await this.processNewsComponent(rawData.news);
    }

    if (rawData.markup) {
      processedData.markup = await this.processMarkupComponent(rawData.markup);
    }

    return processedData;
  }

  /**
   * Обработка игровых данных
   */
  private async processGameData(
    response: ProteinResponse,
    originalRequest: GameDataRequest
  ): Promise<ProcessedGameData> {
    const rawData = response.result;
    const processedData: ProcessedGameData = {};

    if (rawData.character) {
      processedData.character = await this.processCharacterComponent(rawData.character);
    }

    if (rawData.inventory) {
      processedData.inventory = await this.processInventoryComponent(rawData.inventory);
    }

    if (rawData.quests) {
      processedData.quests = await this.processQuestsComponent(rawData.quests);
    }

    if (rawData.world) {
      processedData.world = await this.processWorldComponent(rawData.world);
    }

    return processedData;
  }

  // ============================================================================
  // COMPONENT PROCESSING METHODS
  // ============================================================================

  /**
   * Обработка компонента профиля
   */
  private async processProfileComponent(rawProfile: any): Promise<ProcessedProfileData> {
    return {
      user_info: {
        id: rawProfile.user_info?.id || 0,
        username: rawProfile.user_info?.username || '',
        email: rawProfile.user_info?.email || '',
        avatar_url: rawProfile.user_info?.avatar_url,
        display_name: rawProfile.user_info?.display_name || rawProfile.user_info?.username || '',
        bio: rawProfile.user_info?.bio,
        join_date: rawProfile.user_info?.join_date || new Date().toISOString(),
        last_active: rawProfile.user_info?.last_active || new Date().toISOString()
      },
      stats: {
        level: rawProfile.stats?.level || 1,
        experience: rawProfile.stats?.experience || 0,
        reputation: rawProfile.stats?.reputation || 0,
        achievements_count: rawProfile.stats?.achievements_count || 0,
        projects_count: rawProfile.stats?.projects_count || 0,
        contributions_count: rawProfile.stats?.contributions_count || 0
      },
      achievements: (rawProfile.achievements || []).map((achievement: any) => ({
        id: achievement.id || '',
        title: achievement.title || '',
        description: achievement.description || '',
        icon_url: achievement.icon_url || '',
        earned_date: achievement.earned_date || new Date().toISOString(),
        rarity: achievement.rarity || 'common'
      })),
      preferences: {
        theme: rawProfile.preferences?.theme || 'auto',
        language: rawProfile.preferences?.language || 'en',
        notifications: {
          email: rawProfile.preferences?.notifications?.email ?? true,
          push: rawProfile.preferences?.notifications?.push ?? true,
          in_app: rawProfile.preferences?.notifications?.in_app ?? true
        },
        privacy: {
          profile_visibility: rawProfile.preferences?.privacy?.profile_visibility || 'public',
          activity_visibility: rawProfile.preferences?.privacy?.activity_visibility || 'public'
        }
      },
      activity_feed: (rawProfile.activity_feed || []).map((activity: any) => ({
        id: activity.id || '',
        type: activity.type || 'social',
        title: activity.title || '',
        description: activity.description || '',
        timestamp: activity.timestamp || new Date().toISOString(),
        metadata: activity.metadata
      }))
    };
  }

  /**
   * Обработка компонента дашборда
   */
  private async processDashboardComponent(rawDashboard: any): Promise<ProcessedDashboardData> {
    return {
      widgets: (rawDashboard.widgets || []).map((widget: any) => ({
        id: widget.id || '',
        type: widget.type || 'card',
        title: widget.title || '',
        data: widget.data || {},
        position: {
          x: widget.position?.x || 0,
          y: widget.position?.y || 0,
          width: widget.position?.width || 1,
          height: widget.position?.height || 1
        },
        refresh_interval: widget.refresh_interval
      })),
      layout: {
        columns: rawDashboard.layout?.columns || 4,
        rows: rawDashboard.layout?.rows || 3,
        breakpoints: {
          mobile: {
            columns: rawDashboard.layout?.breakpoints?.mobile?.columns || 1,
            rows: rawDashboard.layout?.breakpoints?.mobile?.rows || 6
          },
          tablet: {
            columns: rawDashboard.layout?.breakpoints?.tablet?.columns || 2,
            rows: rawDashboard.layout?.breakpoints?.tablet?.rows || 4
          },
          desktop: {
            columns: rawDashboard.layout?.breakpoints?.desktop?.columns || 4,
            rows: rawDashboard.layout?.breakpoints?.desktop?.rows || 3
          }
        }
      },
      quick_actions: (rawDashboard.quick_actions || []).map((action: any) => ({
        id: action.id || '',
        title: action.title || '',
        icon: action.icon || '',
        action: action.action || '',
        color: action.color
      }))
    };
  }

  /**
   * Обработка компонента магазина
   */
  private async processShopComponent(rawShop: any): Promise<ProcessedShopData> {
    return {
      products: (rawShop.products || []).map((product: any) => ({
        id: product.id || '',
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        currency: product.currency || 'USD',
        category: product.category || '',
        image_url: product.image_url || '',
        in_stock: product.in_stock ?? true,
        stock_count: product.stock_count,
        tags: product.tags || [],
        metadata: product.metadata
      })),
      categories: (rawShop.categories || []).map((category: any) => ({
        id: category.id || '',
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || '',
        product_count: category.product_count || 0,
        subcategories: category.subcategories
      })),
      cart: {
        items: (rawShop.cart?.items || []).map((item: any) => ({
          product_id: item.product_id || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          total: item.total || 0
        })),
        total_items: rawShop.cart?.total_items || 0,
        total_price: rawShop.cart?.total_price || 0,
        currency: rawShop.cart?.currency || 'USD'
      },
      recommendations: (rawShop.recommendations || []).map((rec: any) => ({
        product_id: rec.product_id || '',
        reason: rec.reason || '',
        score: rec.score || 0
      }))
    };
  }

  /**
   * Обработка компонента новостей
   */
  private async processNewsComponent(rawNews: any): Promise<ProcessedNewsData> {
    return {
      articles: (rawNews.articles || []).map((article: any) => ({
        id: article.id || '',
        title: article.title || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        author: article.author || '',
        publish_date: article.publish_date || new Date().toISOString(),
        category: article.category || '',
        tags: article.tags || [],
        image_url: article.image_url,
        read_time: article.read_time || 0,
        views: article.views || 0,
        likes: article.likes || 0,
        comments_count: article.comments_count || 0
      })),
      categories: (rawNews.categories || []).map((category: any) => ({
        id: category.id || '',
        name: category.name || '',
        article_count: category.article_count || 0,
        color: category.color || '#000000'
      })),
      trending: (rawNews.trending || []).map((trend: any) => ({
        article_id: trend.article_id || '',
        trend_score: trend.trend_score || 0,
        trend_type: trend.trend_type || 'new'
      }))
    };
  }

  /**
   * Обработка компонента разметки
   */
  private async processMarkupComponent(rawMarkup: any): Promise<ProcessedMarkupData> {
    return {
      html: rawMarkup.html || '',
      css: rawMarkup.css || '',
      javascript: rawMarkup.javascript || '',
      assets: (rawMarkup.assets || []).map((asset: any) => ({
        type: asset.type || 'image',
        url: asset.url || '',
        size: asset.size,
        preload: asset.preload ?? false
      })),
      metadata: {
        title: rawMarkup.metadata?.title || '',
        description: rawMarkup.metadata?.description || '',
        keywords: rawMarkup.metadata?.keywords || [],
        viewport: rawMarkup.metadata?.viewport || 'width=device-width, initial-scale=1',
        theme_color: rawMarkup.metadata?.theme_color
      }
    };
  }

  /**
   * Обработка компонента персонажа
   */
  private async processCharacterComponent(rawCharacter: any): Promise<ProcessedGameData['character']> {
    return {
      id: rawCharacter.id || '',
      name: rawCharacter.name || '',
      level: rawCharacter.level || 1,
      class: rawCharacter.class || '',
      race: rawCharacter.race || '',
      stats: {
        health: rawCharacter.stats?.health || 100,
        mana: rawCharacter.stats?.mana || 100,
        strength: rawCharacter.stats?.strength || 10,
        agility: rawCharacter.stats?.agility || 10,
        intelligence: rawCharacter.stats?.intelligence || 10,
        vitality: rawCharacter.stats?.vitality || 10
      },
      equipment: {
        weapon: rawCharacter.equipment?.weapon,
        armor: rawCharacter.equipment?.armor,
        accessories: rawCharacter.equipment?.accessories || []
      },
      skills: (rawCharacter.skills || []).map((skill: any) => ({
        id: skill.id || '',
        name: skill.name || '',
        level: skill.level || 1,
        experience: skill.experience || 0,
        cooldown: skill.cooldown
      }))
    };
  }

  /**
   * Обработка компонента инвентаря
   */
  private async processInventoryComponent(rawInventory: any): Promise<ProcessedGameData['inventory']> {
    return {
      items: (rawInventory.items || []).map((item: any) => ({
        id: item.id || '',
        name: item.name || '',
        type: item.type || '',
        quantity: item.quantity || 1,
        rarity: item.rarity || 'common',
        stats: item.stats,
        description: item.description || '',
        icon_url: item.icon_url || ''
      })),
      capacity: {
        current: rawInventory.capacity?.current || 0,
        maximum: rawInventory.capacity?.maximum || 100
      },
      categories: rawInventory.categories || []
    };
  }

  /**
   * Обработка компонента квестов
   */
  private async processQuestsComponent(rawQuests: any): Promise<ProcessedGameData['quests']> {
    return {
      active: (rawQuests.active || []).map((quest: any) => ({
        id: quest.id || '',
        title: quest.title || '',
        description: quest.description || '',
        objectives: (quest.objectives || []).map((obj: any) => ({
          id: obj.id || '',
          description: obj.description || '',
          completed: obj.completed ?? false,
          progress: obj.progress || 0
        })),
        rewards: quest.rewards || [],
        deadline: quest.deadline
      })),
      completed: (rawQuests.completed || []).map((quest: any) => ({
        id: quest.id || '',
        title: quest.title || '',
        completed_date: quest.completed_date || new Date().toISOString(),
        rewards_received: quest.rewards_received || []
      })),
      available: (rawQuests.available || []).map((quest: any) => ({
        id: quest.id || '',
        title: quest.title || '',
        description: quest.description || '',
        requirements: quest.requirements || [],
        rewards: quest.rewards || []
      }))
    };
  }

  /**
   * Обработка компонента мира
   */
  private async processWorldComponent(rawWorld: any): Promise<ProcessedGameData['world']> {
    return {
      current_location: {
        id: rawWorld.current_location?.id || '',
        name: rawWorld.current_location?.name || '',
        description: rawWorld.current_location?.description || '',
        coordinates: {
          x: rawWorld.current_location?.coordinates?.x || 0,
          y: rawWorld.current_location?.coordinates?.y || 0,
          z: rawWorld.current_location?.coordinates?.z || 0
        }
      },
      available_locations: (rawWorld.available_locations || []).map((loc: any) => ({
        id: loc.id || '',
        name: loc.name || '',
        distance: loc.distance || 0,
        accessible: loc.accessible ?? true
      })),
      events: (rawWorld.events || []).map((event: any) => ({
        id: event.id || '',
        type: event.type || '',
        description: event.description || '',
        start_time: event.start_time || new Date().toISOString(),
        end_time: event.end_time
      }))
    };
  }

  // ============================================================================
  // LEGACY PROCESSING METHODS (для обратной совместимости)
  // ============================================================================

  private async processCharacterData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processCharacterComponent(response.result);
  }

  private async processInventoryData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processInventoryComponent(response.result);
  }

  private async processQuestData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processQuestsComponent(response.result);
  }

  private async processShopData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processShopComponent(response.result);
  }

  private async processDashboardData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processDashboardComponent(response.result);
  }

  private async processNewsData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processNewsComponent(response.result);
  }

  private async processProfileData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return this.processProfileComponent(response.result);
  }

  private async processGenericData(response: ProteinResponse, originalRequest: any): Promise<any> {
    return response.result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Генерация ключа кэша для обработки
   */
  private generateProcessingCacheKey(response: ProteinResponse, requestType: string): string {
    const keyData = {
      protein_uuid: response.protein_uuid,
      request_type: requestType,
      result_hash: this.hashObject(response.result)
    };
    return `processing_${btoa(JSON.stringify(keyData))}`;
  }

  /**
   * Хэширование объекта
   */
  private hashObject(obj: any): string {
    return btoa(JSON.stringify(obj)).substr(0, 16);
  }

  /**
   * Обновление статистики обработки
   */
  private updateProcessingStats(processingTime: number): void {
    this.processingStats.total_processed++;
    this.processingStats.average_processing_time = 
      (this.processingStats.average_processing_time * (this.processingStats.total_processed - 1) + processingTime) / 
      this.processingStats.total_processed;
  }

  /**
   * Получение статистики обработки
   */
  getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Очистка кэша обработки
   */
  clearProcessingCache(): void {
    this.processingCache.clear();
    this.emit('processing:cache:cleared');
  }

  /**
   * Сброс статистики
   */
  resetStats(): void {
    this.processingStats = {
      total_processed: 0,
      cache_hits: 0,
      processing_errors: 0,
      average_processing_time: 0
    };
    this.emit('processing:stats:reset');
  }
}

export default ProteinResponseProcessor;



