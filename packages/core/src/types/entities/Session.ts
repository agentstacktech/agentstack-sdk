import { BaseEntity } from '../base';

/**
 * Session - активная сессия пользователя
 * 
 * AI AGENT GUIDE:
 * Session = JWT token + device info + security data
 * 
 * USAGE:
 *   const sessions = await sdk.sessions.list()
 *   await sdk.sessions.terminate(session.session_uuid)
 */
export interface Session extends BaseEntity {
  /** Session UUID (unique identifier) */
  session_uuid: string;
  
  /** User ID */
  user_id: number;
  
  /** Project ID */
  project_id: number;
  
  /** Optional project info */
  project_name?: string;
  project_description?: string;
  
  /** Device fingerprint (for security) */
  device_fingerprint?: string;
  
  /** IP address */
  ip_address?: string;
  
  /** User agent string */
  user_agent?: string;
  
  /** Last used timestamp */
  last_used?: string;
  
  /** Expiration timestamps */
  expires_at: string;
  refresh_expires_at: string;
  
  /** Session status */
  is_active: boolean;
  
  /** Is current session */
  is_current?: boolean;
  
  /** Status enum */
  status?: 'active' | 'expired' | 'terminated';
  
  /** Parsed device info */
  device_info?: {
    browser: string;
    os: string;
    device_type: string;
  };
  
  /** Location info */
  location_info?: {
    city?: string;
    country?: string;
    region?: string;
  };
}

/**
 * GetSessionsOptions - фильтры для сессий
 */
export interface GetSessionsOptions {
  /** Filter by user (snake_case) */
  user_id?: number;
  
  /** Filter by project (snake_case) */
  project_id?: number;
  
  /** Filter by status */
  status?: 'active' | 'expired' | 'terminated';
  
  /** Pagination */
  page?: number;
  per_page?: number;
  
  // ❌ DEPRECATED (camelCase) - use snake_case instead
  /** @deprecated use user_id */
  userId?: number;
  /** @deprecated use project_id */
  projectId?: number;
  /** @deprecated use per_page */
  perPage?: number;
}




