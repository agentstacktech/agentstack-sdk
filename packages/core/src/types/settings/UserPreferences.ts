/**
 * UserPreferences - настройки пользователя (JSONB в users.settings)
 * 
 * AI AGENT GUIDE:
 * Preferences хранятся в users.settings или project_users.settings
 * 
 * Example:
 *   await sdk.users.updatePreferences({
 *     theme: 'dark',
 *     language: 'ru',
 *     notifications: { email: false, push: true }
 *   })
 */

export interface UserPreferences {
  /** UI theme */
  theme?: 'light' | 'dark' | 'system';
  
  /** Interface language */
  language?: string;
  
  /** Timezone */
  timezone?: string;
  
  /** Notification preferences */
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    events?: string[];
  };
  
  /** Dashboard layout */
  dashboard?: DashboardSettings;
  
  /** Privacy settings */
  privacy?: {
    show_email?: boolean;
    show_activity?: boolean;
    allow_analytics?: boolean;
  };
  
  /** Extensible для custom preferences */
  [key: string]: any;
}

/**
 * UserProfileData - данные профиля (JSONB в project_users.profile_data)
 * 
 * AI GUIDE:
 * Profile data хранит wallets, preferences, и custom data
 * 
 * Structure:
 *   profile_data: {
 *     display_name: "John Doe",
 *     avatar_url: "https://...",
 *     wallets: { wallet_abc: {...} },
 *     wallet_config: {...},
 *     preferences: {...}
 *   }
 */
export interface UserProfileData {
  /** Display name */
  display_name?: string;
  
  /** Avatar URL */
  avatar_url?: string;
  
  /** Bio/About */
  bio?: string;
  
  /** Social links */
  social?: Record<string, string>;
  
  /** Wallets (multi-currency JSONB) */
  wallets?: Record<string, any>;  // Wallet type defined in entities
  
  /** Wallet configuration */
  wallet_config?: {
    default_wallet?: string;
    default_currency: string;
    custom_currencies?: any[];
  };
  
  /** Transaction history */
  transaction_history?: any[];
  
  /** User preferences */
  preferences?: UserPreferences;
  
  /** Extensible для custom profile data */
  [key: string]: any;
}

/**
 * Frontend compatibility aliases
 */
export interface ProfileData extends UserProfileData {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
  project_id?: number;
  achievements?: string[];
  metrics?: Record<string, any>;
  billing_summary?: any;
  oauth_providers?: Record<string, any>;
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface UserSettings extends UserPreferences {
  // Additional settings compatibility
}

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  desktop?: boolean;
  mentions?: boolean;
  updates?: boolean;
  events?: string[];
}

export interface PrivacySettings {
  profile_public?: boolean;
  show_email?: boolean;
  show_activity?: boolean;
  show_location?: boolean;
  allow_analytics?: boolean;
  allow_following?: boolean;
  allow_messaging?: boolean;
}

export interface DashboardSettings {
  /** API may use compact/comfortable (setDashboardLayout) or grid/list (legacy docs). */
  layout?: 'compact' | 'comfortable' | 'grid' | 'list';
  default_view?: 'grid' | 'list';
  widgets?: string[];
  refresh_interval?: number;
  items_per_page?: number;
  auto_refresh?: boolean;
  show_sidebar?: boolean;
}

export interface AppearanceSettings {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  font_size?: 'small' | 'medium' | 'large';
  color_scheme?: 'default' | 'high_contrast' | 'colorblind';
  animations?: boolean;
  sound_effects?: boolean;
}




