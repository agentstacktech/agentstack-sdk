import { BaseEntity, NamedEntity } from '../base';

/**
 * ApiKey - API ключ для programmatic access
 * 
 * AI AGENT GUIDE:
 * API keys используются для server-to-server auth
 * 
 * USAGE:
 *   const apiKey = await sdk.apiKeys.create({
 *     name: "Production API Key",
 *     permissions_bitmap: 15  // READ + WRITE + DELETE + ADMIN
 *   })
 */
export interface ApiKey extends 
  BaseEntity,    // id, created_at, updated_at
  NamedEntity {  // name, description
  
  /** API key value (показывается только при создании!) */
  key?: string;
  
  /** Permissions bitmap */
  permissions_bitmap: number;
  
  /** Last used timestamp */
  last_used_at?: string;
  
  /** Expiration (optional) */
  expires_at?: string;
  
  /** Active status */
  is_active: boolean;
  
  /** Project ID (scoped to project) */
  project_id: number;
  
  /** Usage statistics */
  usage_stats?: {
    total_requests: number;
    last_request_at?: string;
  };
}

/**
 * CreateApiKeyData - создание API ключа
 */
export interface CreateApiKeyData {
  /** Key name (required) */
  name: string;
  
  /** Permissions bitmap */
  permissions_bitmap: number;
  
  /** Optional description */
  description?: string;
  
  /** Optional expiration */
  expires_at?: string;
}




