/**
 * Settings Schemas - Typed JSONB configurations
 * 
 * AI AGENT GUIDE:
 * Settings хранятся в JSONB полях для flexibility
 * 
 * - ProjectSettings → projects.settings
 * - UserPreferences → users.settings или project_users.settings
 * - WalletRules → projects.settings->wallet_rules
 */

export * from './ProjectSettings';
export * from './WalletRules';
export * from './UserPreferences';




