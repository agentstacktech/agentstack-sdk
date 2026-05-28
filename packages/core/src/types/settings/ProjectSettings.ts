import { WalletRules } from './WalletRules';

/**
 * ProjectSettings - JSONB configuration в projects.settings
 * 
 * AI AGENT QUICK START:
 * 
 * Minimal:
 *   const project = await sdk.projects.create({ name: "My App" })
 * 
 * Custom:
 *   const project = await sdk.projects.create({
 *     name: "Game",
 *     settings: {
 *       wallet_rules: { limits: { max_wallets_per_user: 100 } }
 *     }
 *   })
 * 
 * FIELDS:
 * @property wallet_rules - Wallet configuration
 * @property rbac - RBAC configuration
 * @property features - Feature flags
 * @property [key: string] - Extensible for custom settings
 */
export interface ProjectSettings {
  /** Wallet system rules (см. WalletRules для details) */
  wallet_rules?: WalletRules;
  
  /** RBAC configuration */
  rbac?: RBACConfig;
  
  /** Enabled features */
  features?: string[];
  
  /** Integration configurations */
  integrations?: IntegrationConfig;
  
  /** API rate limits */
  rate_limits?: RateLimitConfig;
  
  /** Notification settings */
  notifications?: NotificationConfig;
  
  /**
   * Extensible - AI can add ANY custom settings!
   * 
   * Examples:
   * - game_config: { levels: 50, pvp: true }
   * - ecommerce_config: { shipping_zones: [...] }
   * - analytics_config: { retention_days: 90 }
   */
  [key: string]: any;
}

/**
 * RBACConfig - Role-Based Access Control configuration
 */
export interface RBACConfig {
  /** Custom roles (дополнительно к system roles) */
  custom_roles?: Array<{
    id: string;
    name: string;
    permissions_bitmap: number;
    description?: string;
  }>;
  
  /** Custom permissions */
  custom_permissions?: Array<{
    name: string;
    resource: string;
    action: string;
    description?: string;
  }>;
  
  /** Default role для новых пользователей */
  default_role?: string;
}

/**
 * IntegrationConfig - third-party integrations
 */
export interface IntegrationConfig {
  /** Payment gateways */
  payment_gateways?: Array<{
    provider: string;
    enabled: boolean;
    config?: Record<string, any>;
  }>;
  
  /** OAuth providers */
  oauth_providers?: Array<{
    provider: 'google' | 'github' | 'discord' | 'microsoft';
    enabled: boolean;
    client_id?: string;
  }>;
  
  /** Webhooks */
  webhooks?: Array<{
    url: string;
    events: string[];
    enabled: boolean;
  }>;
  
  /** Analytics */
  analytics?: {
    provider?: 'google' | 'mixpanel' | 'amplitude';
    tracking_id?: string;
  };
}

/**
 * RateLimitConfig - API rate limiting
 */
export interface RateLimitConfig {
  /** Requests per minute */
  requests_per_minute?: number;
  
  /** Requests per hour */
  requests_per_hour?: number;
  
  /** Requests per day */
  requests_per_day?: number;
  
  /** Burst size */
  burst_size?: number;
}

/**
 * NotificationConfig - notification settings
 */
export interface NotificationConfig {
  /** Email notifications enabled */
  email_enabled?: boolean;
  
  /** Push notifications enabled */
  push_enabled?: boolean;
  
  /** Webhook notifications */
  webhook_url?: string;
  
  /** Events to notify */
  events?: string[];
}




