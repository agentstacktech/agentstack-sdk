/**
 * @agentstack/hooks - Shared Types
 * AI-First Design: Self-documenting types for all hooks
 * 
 * 🤖 AI QUICK START:
 * These types describe all data structures returned by hooks.
 * TypeScript inference shows these automatically!
 */

// ═══════════════════════════════════════════════════════════
// Security Types
// ═══════════════════════════════════════════════════════════

/**
 * Security event severity levels
 * AI: Use for filtering and display logic
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event types
 * AI: Common security events in the system
 */
export type SecurityEventType = 
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'permission_denied'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'suspicious_activity'
  | 'password_changed'
  | 'mfa_enabled'
  | 'mfa_disabled';

/**
 * Security Event
 * AI: Main data structure for security events
 * 
 * @example
 * const event: SecurityEvent = {
 *   id: "evt_123",
 *   type: "failed_login",
 *   severity: "high",
 *   user_email: "user@example.com",
 *   timestamp: "2025-10-08T10:00:00Z",
 *   details: "Multiple failed login attempts"
 * }
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  user_id?: number;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  details: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

/**
 * Security filters for querying events
 * AI: Use to filter security events
 */
export interface SecurityFilters {
  severity?: SecuritySeverity;
  type?: SecurityEventType;
  user_id?: number;
  from_date?: string;
  to_date?: string;
  resolved?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Audit Types
// ═══════════════════════════════════════════════════════════

/**
 * Audit action types
 * AI: CRUD operations
 */
export type AuditAction = 'create' | 'update' | 'delete' | 'read';

/**
 * Audit resource types
 * AI: What was modified
 */
export type AuditResourceType = 
  | 'user'
  | 'project'
  | 'session'
  | 'api_key'
  | 'role'
  | 'wallet'
  | 'payment'
  | 'settings';

/**
 * Audit Log Entry
 * AI: Main data structure for audit logs
 * 
 * @example
 * const log: AuditLog = {
 *   id: "audit_123",
 *   action: "update",
 *   resource_type: "project",
 *   resource_id: "1",
 *   user_email: "admin@example.com",
 *   timestamp: "2025-10-08T10:00:00Z",
 *   details: "Project settings updated"
 * }
 */
export interface AuditLog {
  id: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string;
  user_id?: number;
  user_email?: string;
  ip_address?: string;
  timestamp: string;
  details?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

/**
 * Audit filters
 * AI: Use to filter audit logs
 */
export interface AuditFilters {
  action?: AuditAction;
  resource_type?: AuditResourceType;
  user_id?: number;
  from_date?: string;
  to_date?: string;
  search?: string;
}

// ═══════════════════════════════════════════════════════════
// Analytics Types
// ═══════════════════════════════════════════════════════════

/**
 * Time period for analytics
 * AI: Common time ranges
 */
export type AnalyticsPeriod = '24h' | '7d' | '30d' | '90d' | 'all';

/**
 * Analytics Metrics
 * AI: Main dashboard metrics
 * 
 * @example
 * const metrics: AnalyticsMetrics = {
 *   totalUsers: 1000,
 *   activeUsers: 250,
 *   totalProjects: 50,
 *   apiCalls: 100000,
 *   errorRate: 0.5
 * }
 */
export interface AnalyticsMetrics {
  // Users
  totalUsers: number;
  activeUsers: number;
  newUsers?: number;
  
  // Projects
  totalProjects: number;
  activeProjects: number;
  
  // API
  apiCalls: number;
  avgResponseTime?: number;
  errorRate: number;
  totalErrors?: number;
  
  // Business
  totalRevenue?: number;
  totalPayments?: number;
  
  // Performance
  uptime?: number;
  throughput?: number;
}

/**
 * Analytics options
 * AI: Use to configure analytics queries
 */
export interface AnalyticsOptions {
  period?: AnalyticsPeriod;
  project_id?: number;
  from_date?: string;
  to_date?: string;
}

// ═══════════════════════════════════════════════════════════
// Wallet Types (Bonus!)
// ═══════════════════════════════════════════════════════════

/**
 * Wallet Type
 * AI: Different wallet purposes
 */
export type WalletType = 'user' | 'agentpay' | 'game' | 'savings' | 'business';

/**
 * Currency Balance
 * AI: Multi-currency support
 */
export interface CurrencyBalance {
  amount: string;
  available: string;
  locked: string;
}

/**
 * Wallet (Multi-Currency JSONB)
 * AI: Main wallet structure
 * 
 * @example
 * const wallet: Wallet = {
 *   id: "wallet_abc",
 *   name: "Main Wallet",
 *   type: "user",
 *   balances: {
 *     USD: { amount: "100.00", available: "100.00", locked: "0" },
 *     GAME_GOLD: { amount: "10000", available: "10000", locked: "0" }
 *   }
 * }
 */
export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balances: Record<string, CurrencyBalance>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

/**
 * Wallet filters
 * AI: Use to filter wallets
 */
export interface WalletFilters {
  type?: WalletType;
  is_active?: boolean;
  user_id?: number;
  currency?: string;
}

// ═══════════════════════════════════════════════════════════
// Hook Options (Generic)
// ═══════════════════════════════════════════════════════════

/**
 * Base hook options
 * AI: Common options for all hooks
 */
export interface BaseHookOptions {
  /**
   * Auto-refresh interval in milliseconds, or `false` to disable polling.
   * @default varies by hook
   */
  /** Milliseconds between refetches, or `false` to disable polling. */
  refreshInterval?: number | false;
  
  /**
   * Enable/disable the hook
   * AI: Useful for conditional fetching
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Stale time in milliseconds
   * AI: How long data is considered fresh
   * @default 300000 (5 minutes)
   */
  staleTime?: number;
}

// ═══════════════════════════════════════════════════════════
// Re-export types from @agentstack/sdk
// ═══════════════════════════════════════════════════════════

export type {
  User,
  Session,
  ApiKey,
  Role
} from '@agentstack/sdk';

