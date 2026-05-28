/**
 * Asset - универсальная структура активов с композиционной архитектурой
 * 
 * AI AGENT QUICK START:
 * 
 * Create:
 *   const asset = await sdk.assets.create({
 *     name: "Diamond",
 *     type: "digital_item",
 *     price_usdt: "100.00",
 *     components: {
 *       properties: { rarity: "legendary", transferable: true },
 *       game: { stats: { attack: 50 }, level_requirement: 10 }
 *     }
 *   })
 * 
 * STORAGE: data_projects_project.data.assets.items[] (JSONB)
 * 
 * COMPOSITION: BaseAsset + Components (properties, game, metadata, visual, extensions)
 */

/**
 * Asset Type
 */
export type AssetType = 'currency' | 'digital_item' | 'physical_item' | 'service' | 'nft';

/**
 * Rarity Level
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Base Asset Interface
 */
export interface BaseAsset {
  /**
   * Asset ID (string для JSONB storage)
   * Format: "asset_" + 12 hex chars
   * Example: "asset_abc123def456"
   */
  id: string;

  /**
   * Asset name
   */
  name: string;

  /**
   * Asset type
   */
  type: AssetType;

  /**
   * Project ID (owner)
   */
  project_id: number;

  /**
   * Base price in USDT (Decimal string)
   * Used for exchange rate calculations
   */
  price_usdt: string;

  /**
   * Components (Composition Architecture)
   * 
   * Allows flexible extension without changing base structure
   */
  components: AssetComponents;
}

/**
 * Asset Components
 */
export interface AssetComponents {
  /**
   * Basic properties component
   */
  properties?: PropertyComponent;

  /**
   * Game-specific component (for games)
   */
  game?: GameComponent;

  /**
   * Metadata component (custom fields)
   */
  metadata?: MetadataComponent;

  /**
   * Visual component (icons, images, models)
   */
  visual?: VisualComponent;

  /**
   * Extensions (project-specific components)
   */
  extensions?: Record<string, any>;
}

/**
 * Property Component
 * Basic properties of the asset
 */
export interface PropertyComponent {
  /**
   * Description
   */
  description?: string;

  /**
   * Rarity level
   */
  rarity?: Rarity;

  /**
   * Category
   */
  category?: string;

  /**
   * Tags
   */
  tags?: string[];

  /**
   * Can be transferred via API
   */
  transferable?: boolean;

  /**
   * Can be traded/exchanged
   */
  tradeable?: boolean;

  /**
   * Can be traded with other projects
   */
  cross_project?: boolean;

  /**
   * Can be stacked
   */
  stackable?: boolean;

  /**
   * Maximum stack size
   */
  max_stack?: number;
}

/**
 * Game Component
 * Game-specific properties (for games)
 */
export interface GameComponent {
  /**
   * Game stats (attack, defense, etc.)
   */
  stats?: Record<string, number>;

  /**
   * Item effects
   */
  effects?: ItemEffect[];

  /**
   * Durability (if applicable)
   */
  durability?: {
    current: number;
    maximum: number;
  };

  /**
   * Level requirement
   */
  level_requirement?: number;

  /**
   * Class requirements
   */
  class_requirement?: string[];

  /**
   * Enchantments
   */
  enchantments?: Enchantment[];

  /**
   * Game-specific metadata
   */
  game_metadata?: Record<string, any>;
}

/**
 * Item Effect
 */
export interface ItemEffect {
  /**
   * Effect type
   */
  type: 'heal' | 'buff' | 'damage' | 'utility';

  /**
   * Effect name
   */
  name?: string;

  /**
   * Effect value
   */
  value: number;

  /**
   * Duration (seconds)
   */
  duration?: number;

  /**
   * Conditions
   */
  conditions?: string[];
}

/**
 * Enchantment
 */
export interface Enchantment {
  /**
   * Enchantment ID
   */
  id: string;

  /**
   * Enchantment name
   */
  name: string;

  /**
   * Enchantment level
   */
  level: number;

  /**
   * Enchantment effects
   */
  effects: Record<string, number>;
}

/**
 * Metadata Component
 * Custom fields and extensions
 */
export interface MetadataComponent {
  /**
   * Custom fields
   */
  custom_fields?: Record<string, any>;

  /**
   * Base asset ID (for inheritance)
   */
  extends?: string;

  /**
   * Schema version
   */
  schema_version?: string;
}

/**
 * Visual Component
 * Visual representation
 */
export interface VisualComponent {
  /**
   * Icon URL
   */
  icon_url?: string;

  /**
   * Image URL
   */
  image_url?: string;

  /**
   * 3D Model URL
   */
  model_url?: string;

  /**
   * Animation URL
   */
  animation_url?: string;
}

/**
 * Asset in Exchange Context
 * Simplified asset representation for exchanges
 */
export interface AssetInExchange {
  /**
   * Asset type
   */
  type: AssetType;

  /**
   * Asset ID (wallet_id for currency, item_id for items)
   */
  id: string;

  /**
   * Currency code (for type='currency')
   */
  currency?: string;

  /**
   * Amount (for type='currency', Decimal string)
   */
  amount?: string;

  /**
   * Item ID (for type='digital_item'/'physical_item')
   */
  item_id?: string;

  /**
   * Quantity (for type='digital_item'/'physical_item')
   */
  quantity?: number;

  /**
   * Project ID (owner)
   */
  project_id?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

