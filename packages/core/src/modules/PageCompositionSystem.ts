/**
 * PageCompositionSystem - Система композиции страниц
 * Version: 0.3.6
 * Author: Lance (Александр Васильев)
 * Date: 2025-01-13
 * Philosophy: AI Gene Interface + 8DNA Architecture + 3D Fusion Architecture
 * 
 * Система композиции страниц через белковые запросы
 * Применяет ген: architecture.protein.universe.3d_fusion.gen2
 */

import { SimpleEventEmitter } from '../utils/event-emitter';
import { AgentProtein, PageCompositionRequest, ProteinResponse } from './AgentProtein';
import { ProteinResponseProcessor, ProcessedPageData } from './ProteinResponseProcessor';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  type: 'profile' | 'dashboard' | 'shop' | 'game' | 'news' | 'custom';
  layout: {
    structure: 'grid' | 'flex' | 'absolute' | '3d';
    dimensions: {
      width: number;
      height: number;
      depth?: number; // Для 3D композиции
    };
    breakpoints: {
      mobile: LayoutBreakpoint;
      tablet: LayoutBreakpoint;
      desktop: LayoutBreakpoint;
    };
  };
  components: PageComponent[];
  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
    author: string;
    tags: string[];
  };
}

export interface LayoutBreakpoint {
  columns: number;
  rows: number;
  spacing: number;
  padding: number;
  max_width?: number;
}

export interface PageComponent {
  id: string;
  type: 'profile' | 'stats' | 'achievements' | 'activity' | 'products' | 'cart' | 
        'articles' | 'character' | 'inventory' | 'quests' | 'world' | 'custom';
  name: string;
  position: {
    x: number;
    y: number;
    z?: number; // Для 3D композиции
    width: number;
    height: number;
    depth?: number;
  };
  responsive: {
    mobile: ComponentPosition;
    tablet: ComponentPosition;
    desktop: ComponentPosition;
  };
  data_source: {
    protein_command: string;
    parameters: Record<string, any>;
    cache_ttl?: number;
    refresh_interval?: number;
  };
  styling: {
    theme: 'light' | 'dark' | 'auto';
    colors?: Record<string, string>;
    typography?: Record<string, any>;
    animations?: Record<string, any>;
  };
  interactions: {
    click?: string;
    hover?: string;
    scroll?: string;
    custom?: Record<string, string>;
  };
}

export interface ComponentPosition {
  x: number;
  y: number;
  z?: number;
  width: number;
  height: number;
  depth?: number;
  visible: boolean;
}

export interface ComposedPage {
  template: PageTemplate;
  data: ProcessedPageData;
  rendered_components: RenderedComponent[];
  metadata: {
    composition_time: number;
    cache_status: 'hit' | 'miss' | 'expired';
    components_loaded: number;
    total_components: number;
    errors: string[];
  };
}

export interface RenderedComponent {
  id: string;
  type: string;
  data: any;
  position: ComponentPosition;
  rendered_html: string;
  rendered_css: string;
  rendered_js: string;
  loading_state: 'loading' | 'loaded' | 'error';
  error_message?: string;
}

// ============================================================================
// PAGE COMPOSITION SYSTEM CLASS
// ============================================================================

export class PageCompositionSystem extends SimpleEventEmitter {
  private proteinClient: AgentProtein;
  private responseProcessor: ProteinResponseProcessor;
  private templateRegistry: Map<string, PageTemplate> = new Map();
  private compositionCache: Map<string, ComposedPage> = new Map();
  private componentCache: Map<string, any> = new Map();

  constructor(proteinClient: AgentProtein, responseProcessor: ProteinResponseProcessor) {
    super();
    this.proteinClient = proteinClient;
    this.responseProcessor = responseProcessor;
    this.initializeDefaultTemplates();
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * Инициализация стандартных шаблонов
   * Применяет ген: architecture.protein.universe.3d_fusion.gen2
   */
  private initializeDefaultTemplates(): void {
    // Шаблон профиля пользователя
    this.registerTemplate({
      id: 'user_profile_3d',
      name: '3D User Profile',
      description: 'Объемный профиль пользователя с 3D элементами',
      type: 'profile',
      layout: {
        structure: '3d',
        dimensions: { width: 1200, height: 800, depth: 600 },
        breakpoints: {
          mobile: { columns: 1, rows: 6, spacing: 16, padding: 16, max_width: 400 },
          tablet: { columns: 2, rows: 4, spacing: 24, padding: 24, max_width: 768 },
          desktop: { columns: 3, rows: 3, spacing: 32, padding: 32, max_width: 1200 }
        }
      },
      components: [
        {
          id: 'profile_header',
          type: 'profile',
          name: 'Profile Header',
          position: { x: 0, y: 0, z: 0, width: 4, height: 2, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 0, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 0, y: 0, z: 0, width: 2, height: 2, depth: 1, visible: true },
            desktop: { x: 0, y: 0, z: 0, width: 4, height: 2, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_profile_data',
            parameters: { include_stats: true, include_achievements: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#3b82f6', secondary: '#64748b' },
            animations: { entrance: 'slideInFromTop', hover: 'scaleUp' }
          },
          interactions: {
            click: 'navigate_to_edit_profile',
            hover: 'show_quick_actions'
          }
        },
        {
          id: 'stats_panel',
          type: 'stats',
          name: 'Statistics Panel',
          position: { x: 4, y: 0, z: 0, width: 2, height: 2, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 2, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 2, y: 0, z: 0, width: 2, height: 2, depth: 1, visible: true },
            desktop: { x: 4, y: 0, z: 0, width: 2, height: 2, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_profile_data',
            parameters: { include_stats: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#10b981', secondary: '#059669' }
          },
          interactions: {
            click: 'show_detailed_stats'
          }
        },
        {
          id: 'achievements_3d',
          type: 'achievements',
          name: '3D Achievements',
          position: { x: 0, y: 2, z: 0, width: 3, height: 2, depth: 2 },
          responsive: {
            mobile: { x: 0, y: 4, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 0, y: 2, z: 0, width: 2, height: 2, depth: 1, visible: true },
            desktop: { x: 0, y: 2, z: 0, width: 3, height: 2, depth: 2, visible: true }
          },
          data_source: {
            protein_command: 'get_profile_data',
            parameters: { include_achievements: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#f59e0b', secondary: '#d97706' },
            animations: { entrance: 'rotateIn3D', hover: 'glow' }
          },
          interactions: {
            click: 'show_achievement_details',
            hover: 'preview_achievement'
          }
        },
        {
          id: 'activity_feed',
          type: 'activity',
          name: 'Activity Feed',
          position: { x: 3, y: 2, z: 0, width: 3, height: 2, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 6, z: 0, width: 1, height: 4, depth: 1, visible: true },
            tablet: { x: 2, y: 2, z: 0, width: 2, height: 2, depth: 1, visible: true },
            desktop: { x: 3, y: 2, z: 0, width: 3, height: 2, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_profile_data',
            parameters: { include_activity: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#8b5cf6', secondary: '#7c3aed' }
          },
          interactions: {
            scroll: 'load_more_activities',
            click: 'open_activity_details'
          }
        }
      ],
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'AgentStack System',
        tags: ['profile', '3d', 'user', 'dashboard']
      }
    });

    // Шаблон игрового дашборда
    this.registerTemplate({
      id: 'game_dashboard_3d',
      name: '3D Game Dashboard',
      description: 'Объемный игровой дашборд с персонажем и инвентарем',
      type: 'game',
      layout: {
        structure: '3d',
        dimensions: { width: 1400, height: 900, depth: 800 },
        breakpoints: {
          mobile: { columns: 1, rows: 8, spacing: 12, padding: 12, max_width: 400 },
          tablet: { columns: 2, rows: 6, spacing: 20, padding: 20, max_width: 768 },
          desktop: { columns: 4, rows: 4, spacing: 28, padding: 28, max_width: 1400 }
        }
      },
      components: [
        {
          id: 'character_3d',
          type: 'character',
          name: '3D Character',
          position: { x: 0, y: 0, z: 0, width: 2, height: 3, depth: 2 },
          responsive: {
            mobile: { x: 0, y: 0, z: 0, width: 1, height: 3, depth: 1, visible: true },
            tablet: { x: 0, y: 0, z: 0, width: 2, height: 3, depth: 1, visible: true },
            desktop: { x: 0, y: 0, z: 0, width: 2, height: 3, depth: 2, visible: true }
          },
          data_source: {
            protein_command: 'get_character_data',
            parameters: { include_equipment: true, include_skills: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#ef4444', secondary: '#dc2626' },
            animations: { entrance: 'fadeIn3D', hover: 'rotateCharacter' }
          },
          interactions: {
            click: 'open_character_sheet',
            hover: 'show_character_stats'
          }
        },
        {
          id: 'inventory_3d',
          type: 'inventory',
          name: '3D Inventory',
          position: { x: 2, y: 0, z: 0, width: 2, height: 3, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 3, z: 0, width: 1, height: 3, depth: 1, visible: true },
            tablet: { x: 2, y: 0, z: 0, width: 2, height: 3, depth: 1, visible: true },
            desktop: { x: 2, y: 0, z: 0, width: 2, height: 3, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_inventory_data',
            parameters: { include_equipped: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#06b6d4', secondary: '#0891b2' },
            animations: { entrance: 'slideInFromRight', hover: 'highlightItem' }
          },
          interactions: {
            click: 'open_inventory_manager',
            hover: 'preview_item'
          }
        },
        {
          id: 'quests_panel',
          type: 'quests',
          name: 'Quests Panel',
          position: { x: 0, y: 3, z: 0, width: 2, height: 1, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 6, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 0, y: 3, z: 0, width: 2, height: 1, depth: 1, visible: true },
            desktop: { x: 0, y: 3, z: 0, width: 2, height: 1, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_quest_data',
            parameters: { include_objectives: true, include_rewards: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#84cc16', secondary: '#65a30d' }
          },
          interactions: {
            click: 'open_quest_details',
            hover: 'show_quest_progress'
          }
        },
        {
          id: 'world_map',
          type: 'world',
          name: 'World Map',
          position: { x: 2, y: 3, z: 0, width: 2, height: 1, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 8, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 2, y: 3, z: 0, width: 2, height: 1, depth: 1, visible: true },
            desktop: { x: 2, y: 3, z: 0, width: 2, height: 1, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_world_data',
            parameters: { include_locations: true, include_events: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#f97316', secondary: '#ea580c' },
            animations: { entrance: 'zoomIn', hover: 'highlightLocation' }
          },
          interactions: {
            click: 'navigate_to_location',
            hover: 'show_location_info'
          }
        }
      ],
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'AgentStack System',
        tags: ['game', '3d', 'character', 'inventory', 'quests']
      }
    });

    // Шаблон магазина
    this.registerTemplate({
      id: 'shop_3d',
      name: '3D Shop',
      description: 'Объемный магазин с товарами и корзиной',
      type: 'shop',
      layout: {
        structure: '3d',
        dimensions: { width: 1600, height: 1000, depth: 1000 },
        breakpoints: {
          mobile: { columns: 1, rows: 10, spacing: 10, padding: 10, max_width: 400 },
          tablet: { columns: 2, rows: 8, spacing: 16, padding: 16, max_width: 768 },
          desktop: { columns: 4, rows: 5, spacing: 24, padding: 24, max_width: 1600 }
        }
      },
      components: [
        {
          id: 'products_grid_3d',
          type: 'products',
          name: '3D Products Grid',
          position: { x: 0, y: 0, z: 0, width: 3, height: 4, depth: 2 },
          responsive: {
            mobile: { x: 0, y: 0, z: 0, width: 1, height: 6, depth: 1, visible: true },
            tablet: { x: 0, y: 0, z: 0, width: 2, height: 4, depth: 1, visible: true },
            desktop: { x: 0, y: 0, z: 0, width: 3, height: 4, depth: 2, visible: true }
          },
          data_source: {
            protein_command: 'get_shop_data',
            parameters: { include_images: true, include_reviews: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#3b82f6', secondary: '#1d4ed8' },
            animations: { entrance: 'staggerIn3D', hover: 'liftProduct' }
          },
          interactions: {
            click: 'view_product_details',
            hover: 'show_product_preview'
          }
        },
        {
          id: 'cart_3d',
          type: 'cart',
          name: '3D Shopping Cart',
          position: { x: 3, y: 0, z: 0, width: 1, height: 2, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 6, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 2, y: 0, z: 0, width: 1, height: 2, depth: 1, visible: true },
            desktop: { x: 3, y: 0, z: 0, width: 1, height: 2, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_shop_data',
            parameters: { include_cart: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#10b981', secondary: '#059669' },
            animations: { entrance: 'slideInFromRight', hover: 'pulse' }
          },
          interactions: {
            click: 'open_cart',
            hover: 'show_cart_summary'
          }
        },
        {
          id: 'categories_3d',
          type: 'custom',
          name: '3D Categories',
          position: { x: 3, y: 2, z: 0, width: 1, height: 2, depth: 1 },
          responsive: {
            mobile: { x: 0, y: 8, z: 0, width: 1, height: 2, depth: 1, visible: true },
            tablet: { x: 2, y: 2, z: 0, width: 1, height: 2, depth: 1, visible: true },
            desktop: { x: 3, y: 2, z: 0, width: 1, height: 2, depth: 1, visible: true }
          },
          data_source: {
            protein_command: 'get_shop_data',
            parameters: { include_categories: true }
          },
          styling: {
            theme: 'auto',
            colors: { primary: '#8b5cf6', secondary: '#7c3aed' }
          },
          interactions: {
            click: 'filter_by_category',
            hover: 'show_category_preview'
          }
        }
      ],
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'AgentStack System',
        tags: ['shop', '3d', 'products', 'cart', 'ecommerce']
      }
    });
  }

  /**
   * Регистрация шаблона страницы
   */
  registerTemplate(template: PageTemplate): void {
    this.templateRegistry.set(template.id, template);
    this.emit('template:registered', { template });
  }

  /**
   * Получение шаблона по ID
   */
  getTemplate(templateId: string): PageTemplate | undefined {
    return this.templateRegistry.get(templateId);
  }

  /**
   * Получение всех шаблонов
   */
  getAllTemplates(): PageTemplate[] {
    return Array.from(this.templateRegistry.values());
  }

  /**
   * Получение шаблонов по типу
   */
  getTemplatesByType(type: string): PageTemplate[] {
    return Array.from(this.templateRegistry.values()).filter(t => t.type === type);
  }

  // ============================================================================
  // PAGE COMPOSITION
  // ============================================================================

  /**
   * Композиция страницы по шаблону
   * Применяет ген: architecture.protein.universe.3d_fusion.gen2
   */
  async composePage(
    templateId: string,
    projectId: number,
    userId: number,
    customData?: Record<string, any>,
    layout: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  ): Promise<ComposedPage> {
    const startTime = Date.now();
    const template = this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const cacheKey = this.generateCompositionCacheKey(templateId, projectId, userId, layout);
    
    // Проверка кэша композиции
    if (this.compositionCache.has(cacheKey)) {
      this.emit('composition:cache:hit', { templateId, cacheKey });
      return this.compositionCache.get(cacheKey)!;
    }

    this.emit('composition:start', { templateId, projectId, userId, layout });

    try {
      // Создание запроса композиции страницы
      const compositionRequest: PageCompositionRequest = {
        page_type: template.type,
        components: template.components.map(c => c.type),
        user_context: customData,
        layout
      };

      // Выполнение белкового запроса
      const proteinResponse = await this.proteinClient.getPageData(
        projectId,
        userId,
        compositionRequest
      );

      // Обработка ответа
      const processedData = await this.responseProcessor.processProteinResponse(
        proteinResponse,
        'get_page_data',
        compositionRequest
      );

      // Рендеринг компонентов
      const renderedComponents = await this.renderComponents(
        template.components,
        processedData,
        layout
      );

      const compositionTime = Date.now() - startTime;

      const composedPage: ComposedPage = {
        template,
        data: processedData,
        rendered_components: renderedComponents,
        metadata: {
          composition_time: compositionTime,
          cache_status: 'miss',
          components_loaded: renderedComponents.filter(c => c.loading_state === 'loaded').length,
          total_components: renderedComponents.length,
          errors: renderedComponents.filter(c => c.loading_state === 'error').map(c => c.error_message || 'Unknown error')
        }
      };

      // Кэширование композиции
      this.compositionCache.set(cacheKey, composedPage);
      this.emit('composition:success', { composedPage, compositionTime });

      return composedPage;

    } catch (error) {
      this.emit('composition:error', { templateId, error });
      throw error;
    }
  }

  /**
   * Рендеринг компонентов страницы
   */
  private async renderComponents(
    components: PageComponent[],
    data: ProcessedPageData,
    layout: 'mobile' | 'tablet' | 'desktop'
  ): Promise<RenderedComponent[]> {
    const renderedComponents: RenderedComponent[] = [];

    for (const component of components) {
      try {
        this.emit('component:render:start', { component });

        const componentData = this.extractComponentData(component, data);
        const position = this.getComponentPosition(component, layout);
        
        const renderedComponent: RenderedComponent = {
          id: component.id,
          type: component.type,
          data: componentData,
          position,
          rendered_html: this.renderComponentHTML(component, componentData),
          rendered_css: this.renderComponentCSS(component, position),
          rendered_js: this.renderComponentJS(component),
          loading_state: 'loaded'
        };

        renderedComponents.push(renderedComponent);
        this.emit('component:render:success', { component, renderedComponent });

      } catch (error) {
        const errorComponent: RenderedComponent = {
          id: component.id,
          type: component.type,
          data: null,
          position: this.getComponentPosition(component, layout),
          rendered_html: `<div class="component-error">Error loading component: ${component.name}</div>`,
          rendered_css: '',
          rendered_js: '',
          loading_state: 'error',
          error_message: (error as Error).message
        };

        renderedComponents.push(errorComponent);
        this.emit('component:render:error', { component, error });
      }
    }

    return renderedComponents;
  }

  /**
   * Извлечение данных компонента
   */
  private extractComponentData(component: PageComponent, data: ProcessedPageData): any {
    switch (component.type) {
      case 'profile':
        return data.profile;
      case 'stats':
        return data.profile?.stats;
      case 'achievements':
        return data.profile?.achievements;
      case 'activity':
        return data.profile?.activity_feed;
      case 'products':
        return data.shop?.products;
      case 'cart':
        return data.shop?.cart;
      case 'articles':
        return data.news?.articles;
      case 'character':
        return data.game?.character;
      case 'inventory':
        return data.game?.inventory;
      case 'quests':
        return data.game?.quests;
      case 'world':
        return data.game?.world;
      default:
        return null;
    }
  }

  /**
   * Получение позиции компонента для текущего layout
   */
  private getComponentPosition(component: PageComponent, layout: 'mobile' | 'tablet' | 'desktop'): ComponentPosition {
    const responsive = component.responsive[layout];
    return {
      x: responsive.x,
      y: responsive.y,
      z: responsive.z,
      width: responsive.width,
      height: responsive.height,
      depth: responsive.depth,
      visible: responsive.visible
    };
  }

  /**
   * Рендеринг HTML компонента
   */
  private renderComponentHTML(component: PageComponent, data: any): string {
    // Базовая HTML структура для каждого типа компонента
    const baseHTML = `
      <div class="component ${component.type}" 
           data-component-id="${component.id}"
           data-component-type="${component.type}">
        <div class="component-header">
          <h3 class="component-title">${component.name}</h3>
        </div>
        <div class="component-content">
          ${this.renderComponentContent(component, data)}
        </div>
      </div>
    `;

    return baseHTML;
  }

  /**
   * Рендеринг содержимого компонента
   */
  private renderComponentContent(component: PageComponent, data: any): string {
    if (!data) {
      return '<div class="no-data">No data available</div>';
    }

    switch (component.type) {
      case 'profile':
        return this.renderProfileContent(data);
      case 'stats':
        return this.renderStatsContent(data);
      case 'achievements':
        return this.renderAchievementsContent(data);
      case 'activity':
        return this.renderActivityContent(data);
      case 'products':
        return this.renderProductsContent(data);
      case 'cart':
        return this.renderCartContent(data);
      case 'character':
        return this.renderCharacterContent(data);
      case 'inventory':
        return this.renderInventoryContent(data);
      case 'quests':
        return this.renderQuestsContent(data);
      case 'world':
        return this.renderWorldContent(data);
      default:
        return '<div class="unsupported-component">Unsupported component type</div>';
    }
  }

  /**
   * Рендеринг CSS компонента
   */
  private renderComponentCSS(component: PageComponent, position: ComponentPosition): string {
    const colors = component.styling.colors || {};
    const animations = component.styling.animations || {};

    return `
      .component.${component.type}[data-component-id="${component.id}"] {
        position: absolute;
        left: ${position.x * 100}px;
        top: ${position.y * 100}px;
        width: ${position.width * 100}px;
        height: ${position.height * 100}px;
        ${position.z !== undefined ? `transform: translateZ(${position.z * 100}px);` : ''}
        ${position.depth !== undefined ? `depth: ${position.depth * 100}px;` : ''}
        background: linear-gradient(135deg, ${colors.primary || '#3b82f6'}, ${colors.secondary || '#1d4ed8'});
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        ${animations.entrance ? `animation: ${animations.entrance} 0.6s ease-out;` : ''}
      }
      
      .component.${component.type}[data-component-id="${component.id}"]:hover {
        transform: ${position.z !== undefined ? `translateZ(${position.z * 100 + 20}px)` : 'translateY(-4px)'};
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        ${animations.hover ? `animation: ${animations.hover} 0.3s ease;` : ''}
      }
      
      .component-header {
        margin-bottom: 12px;
      }
      
      .component-title {
        font-size: 18px;
        font-weight: 600;
        color: white;
        margin: 0;
      }
      
      .component-content {
        color: white;
      }
      
      @keyframes slideInFromTop {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes fadeIn3D {
        from { transform: translateZ(-100px); opacity: 0; }
        to { transform: translateZ(0); opacity: 1; }
      }
      
      @keyframes rotateIn3D {
        from { transform: rotateY(-90deg); opacity: 0; }
        to { transform: rotateY(0); opacity: 1; }
      }
      
      @keyframes staggerIn3D {
        from { transform: translateZ(-50px) rotateX(-15deg); opacity: 0; }
        to { transform: translateZ(0) rotateX(0); opacity: 1; }
      }
      
      @keyframes scaleUp {
        from { transform: scale(1); }
        to { transform: scale(1.05); }
      }
      
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
        50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      @keyframes zoomIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
  }

  /**
   * Рендеринг JavaScript компонента
   */
  private renderComponentJS(component: PageComponent): string {
    const interactions = component.interactions || {};
    
    return `
      (function() {
        const component = document.querySelector('[data-component-id="${component.id}"]');
        if (!component) return;
        
        ${interactions.click ? `
          component.addEventListener('click', function() {
            // Handle click interaction: ${interactions.click}
            console.log('Component ${component.id} clicked');
          });
        ` : ''}
        
        ${interactions.hover ? `
          component.addEventListener('mouseenter', function() {
            // Handle hover interaction: ${interactions.hover}
            console.log('Component ${component.id} hovered');
          });
        ` : ''}
        
        ${interactions.scroll ? `
          component.addEventListener('scroll', function() {
            // Handle scroll interaction: ${interactions.scroll}
            console.log('Component ${component.id} scrolled');
          });
        ` : ''}
      })();
    `;
  }

  // ============================================================================
  // CONTENT RENDERERS
  // ============================================================================

  private renderProfileContent(data: any): string {
    return `
      <div class="profile-info">
        <div class="avatar">
          <img src="${data.user_info.avatar_url || '/default-avatar.png'}" alt="Avatar" />
        </div>
        <div class="user-details">
          <h4>${data.user_info.display_name}</h4>
          <p>@${data.user_info.username}</p>
          <p>Level ${data.stats.level}</p>
        </div>
      </div>
    `;
  }

  private renderStatsContent(data: any): string {
    return `
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${data.experience}</span>
          <span class="stat-label">Experience</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${data.reputation}</span>
          <span class="stat-label">Reputation</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${data.achievements_count}</span>
          <span class="stat-label">Achievements</span>
        </div>
      </div>
    `;
  }

  private renderAchievementsContent(data: any): string {
    return `
      <div class="achievements-grid">
        ${data.slice(0, 6).map((achievement: any) => `
          <div class="achievement-item rarity-${achievement.rarity}">
            <img src="${achievement.icon_url}" alt="${achievement.title}" />
            <span class="achievement-title">${achievement.title}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderActivityContent(data: any): string {
    return `
      <div class="activity-list">
        ${data.slice(0, 5).map((activity: any) => `
          <div class="activity-item">
            <div class="activity-type">${activity.type}</div>
            <div class="activity-title">${activity.title}</div>
            <div class="activity-time">${new Date(activity.timestamp).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderProductsContent(data: any): string {
    return `
      <div class="products-grid">
        ${data.slice(0, 6).map((product: any) => `
          <div class="product-item">
            <img src="${product.image_url}" alt="${product.name}" />
            <div class="product-info">
              <h5>${product.name}</h5>
              <p class="product-price">$${product.price}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderCartContent(data: any): string {
    return `
      <div class="cart-summary">
        <div class="cart-items">${data.total_items} items</div>
        <div class="cart-total">$${data.total_price}</div>
        <button class="checkout-btn">Checkout</button>
      </div>
    `;
  }

  private renderCharacterContent(data: any): string {
    return `
      <div class="character-info">
        <div class="character-avatar">
          <img src="/character-avatar.png" alt="${data.name}" />
        </div>
        <div class="character-details">
          <h4>${data.name}</h4>
          <p>Level ${data.level} ${data.class}</p>
          <div class="character-stats">
            <div class="stat">HP: ${data.stats.health}</div>
            <div class="stat">MP: ${data.stats.mana}</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderInventoryContent(data: any): string {
    return `
      <div class="inventory-grid">
        ${data.items.slice(0, 8).map((item: any) => `
          <div class="inventory-item rarity-${item.rarity}">
            <img src="${item.icon_url}" alt="${item.name}" />
            <span class="item-quantity">${item.quantity}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderQuestsContent(data: any): string {
    return `
      <div class="quests-list">
        ${data.active.slice(0, 3).map((quest: any) => `
          <div class="quest-item">
            <h5>${quest.title}</h5>
            <div class="quest-progress">
              ${quest.objectives.filter((obj: any) => obj.completed).length}/${quest.objectives.length} objectives
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderWorldContent(data: any): string {
    return `
      <div class="world-info">
        <div class="current-location">
          <h5>${data.current_location.name}</h5>
          <p>${data.current_location.description}</p>
        </div>
        <div class="available-locations">
          ${data.available_locations.slice(0, 3).map((location: any) => `
            <div class="location-item">
              <span>${location.name}</span>
              <span>${location.distance}m</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Генерация ключа кэша композиции
   */
  private generateCompositionCacheKey(
    templateId: string,
    projectId: number,
    userId: number,
    layout: string
  ): string {
    return `composition_${templateId}_${projectId}_${userId}_${layout}`;
  }

  /**
   * Очистка кэша композиции
   */
  clearCompositionCache(): void {
    this.compositionCache.clear();
    this.emit('composition:cache:cleared');
  }

  /**
   * Очистка кэша компонентов
   */
  clearComponentCache(): void {
    this.componentCache.clear();
    this.emit('component:cache:cleared');
  }

  /**
   * Получение статистики системы
   */
  getSystemStats(): {
    templates_count: number;
    composition_cache_size: number;
    component_cache_size: number;
  } {
    return {
      templates_count: this.templateRegistry.size,
      composition_cache_size: this.compositionCache.size,
      component_cache_size: this.componentCache.size
    };
  }
}

export default PageCompositionSystem;



