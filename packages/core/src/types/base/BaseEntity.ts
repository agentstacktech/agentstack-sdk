/**
 * BaseEntity - основа для ВСЕХ сущностей AgentStack
 * 
 * -----------------------------------------------------------
 * AI AGENT GUIDE:
 * -----------------------------------------------------------
 * 
 * Все сущности (Project, User, Wallet, Session, etc.) расширяют BaseEntity.
 * Это означает они ВСЕГДА имеют эти поля:
 * 
 * @field id - Auto-generated number (PostgreSQL SERIAL PRIMARY KEY)
 * @field created_at - ISO 8601 timestamp (auto при создании)
 * @field updated_at - ISO 8601 timestamp (auto при обновлении)
 * @field metadata - Optional extensible storage для любых данных
 * 
 * -----------------------------------------------------------
 * WHY snake_case:
 * -----------------------------------------------------------
 * 
 * Backend (PostgreSQL) использует snake_case → SDK использует то же
 * 
 * Преимущества:
 * - ✅ Consistency (Backend ↔ SDK ↔ Frontend)
 * - ✅ No transformations (performance)
 * - ✅ TypeScript supports: user.created_at ← Valid!
 * - ✅ AI predicts easier (same everywhere)
 * 
 * ═══════════════════════════════════════════════════════════
 * EXAMPLE:
 * ═══════════════════════════════════════════════════════════
 * 
 * const project: Project = await sdk.projects.create({ name: "App" })
 * 
 * console.log(project.id)           // number, auto-generated
 * console.log(project.created_at)   // "2025-10-08T10:00:00Z"
 * console.log(project.updated_at)   // "2025-10-08T10:00:00Z"
 * console.log(project.metadata)     // {} or custom data
 * 
 * -----------------------------------------------------------
 */
export interface BaseEntity {
  /** PostgreSQL primary key */
  id: number;

  /**
   * ISO 8601 timestamp, set on create
   * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
   */
  created_at: string;

  /**
   * ISO 8601 timestamp, auto-updated при каждом изменении
   * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
   */
  updated_at: string;
  
  /** 
   * Extensible storage для любых дополнительных данных
   * AI Agent: Можешь добавить ЛЮБЫЕ поля сюда!
   * 
   * Examples:
   * - Gaming: { player_level: 50, guild_id: 123 }
   * - E-commerce: { loyalty_points: 1000, vip_tier: 'gold' }
   * - Custom: { your_custom_field: "any value" }
   */
  metadata?: Record<string, any>;
}

/**
 * Secure Configuration Interface
 * 
 * Philosophy v0.1.25: User-safe configuration without sensitive fields!
 */
export interface SecureConfig {
  /** Access mode for the entity */
  access_mode?: string;
  
  /** Abstract security key for user display (no implementation hints) */
  security_key?: string;
  
  /** Lifespan in days */
  lifespan_days?: number;
  
  /** Whether entity is permanent */
  is_permanent?: boolean;
  
  /** Additional configuration data */
  [key: string]: any;
}

/**
 * Secure 8DNA Entity Interface
 * 
 * Philosophy v0.1.25: Secure entity representation!
 * 
 * This interface represents the user-safe version of 8DNA entities
 * with sensitive fields (id, created_at) removed and security_key added.
 */
export interface Secure8DNAEntity extends BaseEntity {
  /** Public entity identifier (UUID) */
  uuid: string;
  
  /** Project context */
  project_id: number;
  
  /** User context */
  user_id: number;
  
  /** Entity data */
  data: any;
  
  /** Secure configuration */
  config: SecureConfig;
}




